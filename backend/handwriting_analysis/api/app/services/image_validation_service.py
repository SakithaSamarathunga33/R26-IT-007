from fastapi import HTTPException, UploadFile
from PIL import Image
import numpy as np
import cv2
import io

from app.services.text_matching_service import (
    build_matching_result,
    empty_matching_result,
    TARGET_MATCH_THRESHOLD,
)

MAX_FILE_SIZE_MB = 10
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/octet-stream"
}

def load_image_from_bytes(file_bytes: bytes):
    try:
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        return np.array(image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

def _preprocess_for_foreground(image_rgb):
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)

    # Resize very large images for stable processing
    h, w = gray.shape[:2]
    max_dim = 1200
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    blur = cv2.GaussianBlur(gray, (5, 5), 0)

    # Invert threshold so handwriting becomes white foreground on black background
    thresh = cv2.adaptiveThreshold(
        blur,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        31,
        12
    )

    # Clean small noise
    kernel = np.ones((2, 2), np.uint8)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)

    return gray, thresh

def validate_image_upload(file: UploadFile, content: bytes, target_text: str, strict_target_match: bool = False):
    filename = file.filename or "uploaded_image.png"
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, JPEG, or WEBP image files are supported.")

    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        pass

    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File too large. Max allowed size is {MAX_FILE_SIZE_MB} MB.")

    image_rgb = load_image_from_bytes(content)
    gray, thresh = _preprocess_for_foreground(image_rgb)

    h, w = thresh.shape[:2]
    image_area = h * w
    foreground_pixels = int(np.count_nonzero(thresh))
    foreground_ratio = foreground_pixels / max(image_area, 1)

    if foreground_ratio < 0.002:
        raise HTTPException(status_code=400, detail="No clear handwriting or letter-like foreground content detected.")

    if foreground_ratio > 0.65:
        raise HTTPException(status_code=400, detail="Image foreground is too dense. Please upload a clearer handwriting image.")

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thresh, connectivity=8)

    component_count = 0
    letter_like_component_count = 0
    component_areas = []

    for i in range(1, num_labels):
        x, y, cw, ch, area = stats[i]
        if area < 12:
            continue

        component_count += 1
        component_areas.append(int(area))

        comp_aspect = cw / max(ch, 1)
        comp_area_ratio = area / max(cw * ch, 1)

        # Letter-like handwritten component: not too tiny, not extremely long, has reasonable fill ratio.
        if ch >= 8 and cw >= 4 and 0.08 <= comp_aspect <= 4.5 and 0.05 <= comp_area_ratio <= 0.95:
            letter_like_component_count += 1

    if letter_like_component_count == 0:
        raise HTTPException(status_code=400, detail="Image does not appear to contain letter-like handwriting.")

    # OCR is optional. It can fail for handwriting, so we do not rely only on it.
    ocr_available = False
    ocr_text = ""
    ocr_text_mirror = ""
    ocr_error = None

    try:
        import pytesseract
        ocr_available = True

        # OCR with simple config for letters/words
        config = "--psm 6"
        ocr_text = pytesseract.image_to_string(gray, config=config)

        mirror_gray = cv2.flip(gray, 1)
        ocr_text_mirror = pytesseract.image_to_string(mirror_gray, config=config)
    except Exception as e:
        ocr_error = str(e)

    if ocr_available:
        matching = build_matching_result(ocr_text, ocr_text_mirror, target_text)
    else:
        matching = empty_matching_result()

    ocr_target_match = matching["target_match_score"] >= TARGET_MATCH_THRESHOLD

    warnings = []

    if not ocr_available:
        warnings.append("OCR engine is not available. Letter validation used image heuristics only.")
    elif not ocr_target_match:
        warnings.append("OCR could not confidently match the target text. This may happen with child handwriting.")

    if matching["mirror_detected"]:
        warnings.append("Writing appears to be mirrored/reversed.")

    if foreground_ratio < 0.01:
        warnings.append("Foreground handwriting is very light or small.")

    if component_count > 80:
        warnings.append("Image has many components. It may contain noise or background artifacts.")

    if strict_target_match and not ocr_target_match:
        raise HTTPException(status_code=400, detail="Target text was not matched by OCR. Please upload a clearer image or disable strict_target_match.")

    return {
        "valid": True,
        "filename": filename,
        "content_type": file.content_type,
        "image_width": int(w),
        "image_height": int(h),
        "foreground_ratio": round(float(foreground_ratio), 6),
        "component_count": int(component_count),
        "letter_like_component_count": int(letter_like_component_count),
        "ocr_available": bool(ocr_available),
        "ocr_text": ocr_text.strip(),
        "ocr_target_match": bool(ocr_target_match),
        "ocr_error": ocr_error,
        "matching": matching,
        "warnings": warnings,
        "message": "Image validated successfully. Letter-like handwriting content was detected."
    }, image_rgb, gray, thresh
