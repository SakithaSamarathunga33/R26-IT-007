# Checks the uploaded handwriting image before we predict: file type/size, blank or cut-off writing, noise,
# and an optional OCR check. Called by services/predict_service.py. Bad images raise a 422 'recapture_required'
# error that the mobile app shows as a 'please retake' message.
from fastapi import HTTPException, UploadFile
from PIL import Image
import numpy as np
import cv2
import io
import re

# Upload limits: size cap and accepted image types.
MAX_FILE_SIZE_MB = 10
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/octet-stream"
}

# Child-friendly messages for each reason a photo must be retaken (shown in the app).
RECAPTURE_MESSAGES = {
    "blank": "We couldn't see any writing. Please try writing again.",
    "undecodable": "We couldn't open that picture. Please take it again.",
    "sparse": "The writing is too small or light to see. Please write a bit bigger and darker.",
    "cropped": "Part of the writing is cut off. Please keep your letters inside the box and try again.",
    "too_large": "That picture is too big. Please take it again.",
    "unsupported_format": "We can't use this kind of picture. Please take a new one.",
}

def _recapture(reason: str):
    # 422 + machine-readable code so the app can show a "retake" state instead of a generic error.
    return HTTPException(
        status_code=422,
        detail={"code": "recapture_required", "reason": reason, "message": RECAPTURE_MESSAGES[reason]}
    )

# Decode uploaded bytes into an RGB array; fails as 'undecodable' if it is not a real image.
def load_image_from_bytes(file_bytes: bytes):
    try:
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        return np.array(image)
    except Exception:
        raise _recapture("undecodable")

# Turn the picture into black/white where the handwriting is white. Returns (grayscale, binary) images used by validation and feature extraction.
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

# Runs all checks and returns (validation info, rgb image, gray image, binary image).
# Thresholds inside (foreground share 0.002 to 0.65, blobs under 12 pixels ignored, over 80 components = noisy) decide blank, too dense or noisy images.
def validate_image_upload(file: UploadFile, content: bytes, target_text: str, strict_target_match: bool = False):
    filename = file.filename or "uploaded_image.png"
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise _recapture("unsupported_format")

    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        pass

    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise _recapture("too_large")

    image_rgb = load_image_from_bytes(content)
    gray, thresh = _preprocess_for_foreground(image_rgb)

    h, w = thresh.shape[:2]
    image_area = h * w
    foreground_pixels = int(np.count_nonzero(thresh))
    foreground_ratio = foreground_pixels / max(image_area, 1)

    if foreground_ratio < 0.002:
        raise _recapture("blank")

    if foreground_ratio > 0.65:
        raise HTTPException(status_code=400, detail="Image foreground is too dense. Please upload a clearer handwriting image.")

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thresh, connectivity=8)

    component_count = 0
    letter_like_component_count = 0
    component_areas = []
    content_boxes = []
    mx, my = max(2, int(w * 0.02)), max(2, int(h * 0.02))

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
            # Skip small blobs sitting in an image corner (e.g. transparent rounded corners of a canvas capture).
            corner_blob = cw < 0.1 * w and ch < 0.1 * h and (x <= mx or x + cw >= w - mx) and (y <= my or y + ch >= h - my)
            if not corner_blob:
                content_boxes.append((x, y, x + cw, y + ch))

    if letter_like_component_count == 0:
        raise _recapture("sparse")

    # Extreme crop: writing hugs all 4 image edges, so strokes are likely cut off (3 edges is normal for one big letter on the canvas).
    # ponytail: bbox heuristic only; edge clutter in photos (desk, shadows) can trip it. Upgrade to stroke-exit detection if false retakes show up.
    if content_boxes:
        x0 = min(b[0] for b in content_boxes)
        y0 = min(b[1] for b in content_boxes)
        x1 = max(b[2] for b in content_boxes)
        y1 = max(b[3] for b in content_boxes)
        if sum([x0 <= mx, y0 <= my, x1 >= w - mx, y1 >= h - my]) == 4:  # sum(), since numpy bool + bool is OR
            raise _recapture("cropped")

    # OCR is optional. It can fail for handwriting, so we do not rely only on it.
    ocr_available = False
    ocr_text = ""
    ocr_target_match = False
    ocr_mirror_match = False
    ocr_confidence = None
    ocr_error = None

    try:
        import pytesseract

        # OCR with simple config for letters/words
        config = "--psm 6"
        data = pytesseract.image_to_data(gray, config=config, output_type=pytesseract.Output.DICT)
        # Only mark available once the engine actually ran (pytesseract imports fine without the binary).
        ocr_available = True
        words = [(t, float(c)) for t, c in zip(data["text"], data["conf"]) if str(t).strip()]
        ocr_text = " ".join(t for t, _ in words)
        confs = [c for _, c in words if c >= 0]
        ocr_confidence = round(float(np.mean(confs)) / 100.0, 4) if confs else 0.0
        ocr_text_clean = re.sub(r"[^A-Za-z0-9]", "", ocr_text).lower()
        target_clean = re.sub(r"[^A-Za-z0-9]", "", target_text or "").lower()

        if target_clean and target_clean in ocr_text_clean:
            ocr_target_match = True
        else:
            # OCR read the mirrored letters (b<->d, p<->q) instead of the target.
            mirrored = target_clean.translate(str.maketrans("bdpq", "dbqp"))
            ocr_mirror_match = bool(target_clean) and mirrored != target_clean and mirrored in ocr_text_clean
    except Exception as e:
        ocr_error = str(e)

    warning_details = []

    if not ocr_available:
        warning_details.append({"code": "ocr_unavailable", "message": "OCR engine is not available. Letter validation used image heuristics only."})
    elif ocr_available and not ocr_target_match:
        warning_details.append({"code": "ocr_no_match", "message": "OCR could not confidently match the target text. This may happen with child handwriting."})

    if foreground_ratio < 0.01:
        warning_details.append({"code": "faint_writing", "message": "Foreground handwriting is very light or small."})

    if component_count > 80:
        warning_details.append({"code": "noisy_image", "message": "Image has many components. It may contain noise or background artifacts."})

    warnings = [w["message"] for w in warning_details]

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
        "ocr_mirror_match": bool(ocr_mirror_match),
        "ocr_confidence": ocr_confidence,
        "ocr_error": ocr_error,
        "warnings": warnings,
        "warning_details": warning_details,
        "message": "Image validated successfully. Letter-like handwriting content was detected."
    }, image_rgb, gray, thresh
