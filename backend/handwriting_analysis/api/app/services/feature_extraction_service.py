import numpy as np
import cv2
import pandas as pd

from app.schemas.feature_columns import FEATURE_COLUMNS
from app.utils.task_utils import expected_letter_count, difficulty_to_number, has_reversal_sensitive_letters

def _safe_float(value, default):
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default

def _safe_int(value, default):
    try:
        if value is None:
            return default
        return int(value)
    except Exception:
        return default

def _foreground_bbox(thresh):
    points = cv2.findNonZero(thresh)
    if points is None:
        return 0, 0, thresh.shape[1], thresh.shape[0], 0
    x, y, w, h = cv2.boundingRect(points)
    return x, y, w, h, int(w * h)

def _contour_features(thresh):
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    valid_contours = []
    for c in contours:
        area = cv2.contourArea(c)
        if area >= 10:
            valid_contours.append(c)

    if not valid_contours:
        return {
            "stroke_count": 1,
            "avg_stroke_length": 8.0,
            "stroke_thickness": 1.0,
            "contour_irregularity": 1.0,
            "crowding_score": 1.0
        }

    perimeters = [cv2.arcLength(c, True) for c in valid_contours]
    areas = [cv2.contourArea(c) for c in valid_contours]

    stroke_count = len(valid_contours)
    avg_stroke_length = float(np.mean(perimeters))

    # Approximate thickness: area / perimeter
    thickness_values = [
        area / max(perim, 1.0)
        for area, perim in zip(areas, perimeters)
    ]

    stroke_thickness = float(np.clip(np.mean(thickness_values), 0.5, 8.0))

    # Irregularity: perimeter^2 / area, normalized
    irregularities = [
        (perim ** 2) / max(area, 1.0)
        for area, perim in zip(areas, perimeters)
    ]
    contour_irregularity = float(np.clip(np.mean(irregularities) / 100.0, 0.02, 1.2))

    # Crowding: many contours in a compact area
    x, y, w, h, bbox_area = _foreground_bbox(thresh)
    crowding_score = float(np.clip(stroke_count / max((w * h) / 1000.0, 1.0), 0.02, 1.2))

    return {
        "stroke_count": int(stroke_count),
        "avg_stroke_length": avg_stroke_length,
        "stroke_thickness": stroke_thickness,
        "contour_irregularity": contour_irregularity,
        "crowding_score": crowding_score
    }

def _component_spacing_features(thresh):
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thresh, connectivity=8)

    xs = []
    widths = []
    heights = []
    areas = []

    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if area < 12:
            continue
        xs.append(x)
        widths.append(w)
        heights.append(h)
        areas.append(area)

    if len(xs) <= 1:
        return {
            "average_character_spacing": 18.0,
            "spacing_variance": 0.8,
            "size_variance": 0.8,
            "baseline_deviation": 0.1,
        }

    order = np.argsort(xs)
    sorted_xs = np.array(xs)[order]
    sorted_widths = np.array(widths)[order]
    sorted_heights = np.array(heights)[order]

    gaps = []
    for i in range(len(sorted_xs) - 1):
        gap = sorted_xs[i + 1] - (sorted_xs[i] + sorted_widths[i])
        if gap >= 0:
            gaps.append(gap)

    if gaps:
        average_character_spacing = float(np.mean(gaps))
        spacing_variance = float(np.var(gaps))
    else:
        average_character_spacing = 5.0
        spacing_variance = 10.0

    size_variance = float(np.var(sorted_heights) / max(np.mean(sorted_heights), 1.0))

    # baseline deviation from bottom y values
    bottoms = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if area >= 12:
            bottoms.append(y + h)

    baseline_deviation = float(np.std(bottoms) / max(np.mean(sorted_heights), 1.0)) if bottoms else 0.1

    return {
        "average_character_spacing": float(np.clip(average_character_spacing, 0.0, 40.0)),
        "spacing_variance": float(np.clip(spacing_variance, 0.0, 30.0)),
        "size_variance": float(np.clip(size_variance, 0.0, 26.0)),
        "baseline_deviation": float(np.clip(baseline_deviation, 0.01, 1.0)),
    }

def _alignment_and_slant(thresh):
    points = cv2.findNonZero(thresh)
    if points is None or len(points) < 10:
        return 0.5, 0.0

    pts = points.reshape(-1, 2)
    xs = pts[:, 0].astype(float)
    ys = pts[:, 1].astype(float)

    try:
        slope, intercept = np.polyfit(xs, ys, 1)
        slant_angle = float(np.degrees(np.arctan(slope)))
        residuals = ys - (slope * xs + intercept)
        residual_norm = np.std(residuals) / max(thresh.shape[0], 1)
        alignment_score = float(np.clip(1.0 - residual_norm * 4.0, 0.05, 0.99))
    except Exception:
        slant_angle = 0.0
        alignment_score = 0.5

    return alignment_score, float(np.clip(slant_angle, -35, 35))

def _shape_similarity_proxy(thresh, target_text):
    # Prototype proxy: clean bounding box, reasonable density, and components close to expected letters.
    x, y, w, h, bbox_area = _foreground_bbox(thresh)
    foreground_pixels = np.count_nonzero(thresh)
    density = foreground_pixels / max(bbox_area, 1)

    expected_count = expected_letter_count(target_text)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thresh, connectivity=8)
    comp_count = 0
    for i in range(1, num_labels):
        if stats[i][4] >= 12:
            comp_count += 1

    component_match = 1.0 - min(abs(comp_count - expected_count) / max(expected_count + 3, 1), 1.0)
    density_score = 1.0 - min(abs(density - 0.35) / 0.35, 1.0)
    aspect_score = 1.0 if h > 0 and 0.1 <= w / max(h, 1) <= 10 else 0.5

    score = 0.45 * density_score + 0.35 * component_match + 0.20 * aspect_score
    return float(np.clip(score, 0.05, 0.99))

def _reversal_proxy(thresh, target_text):
    if not has_reversal_sensitive_letters(target_text):
        return 0, 0

    # Prototype reversal proxy:
    # This cannot truly detect b/d/p/q reversal without target-template alignment.
    # We mark possible reversal risk based on strong left-right asymmetry for reversal-sensitive letters.
    x, y, w, h, bbox_area = _foreground_bbox(thresh)
    crop = thresh[y:y+h, x:x+w]
    if crop.size == 0:
        return 0, 0

    mid = crop.shape[1] // 2
    left = np.count_nonzero(crop[:, :mid])
    right = np.count_nonzero(crop[:, mid:])
    asymmetry = abs(left - right) / max(left + right, 1)

    if asymmetry > 0.35:
        return 1, 1
    return 0, 0

def extract_handwriting_features(
    *,
    image_rgb,
    gray,
    thresh,
    task_type: str,
    target_text: str,
    difficulty_level: str,
    age: float,
    native_language: str,
    assessment_language: str,
    school_type: str,
    support_level: str,
    device_type: str,
    environment_noise_level: float,
    time_of_day: str,
    writing_duration_sec=None,
    retry_count=None,
    task_completion_status=None,
    self_correction_flag=None,
):
    h, w = thresh.shape[:2]
    image_width = int(w)
    image_height = int(h)
    x, y, bw, bh, bbox_area = _foreground_bbox(thresh)

    aspect_ratio = float(image_width / max(image_height, 1))
    pixel_density = float(np.clip(np.count_nonzero(thresh) / max(image_width * image_height, 1), 0.0, 1.0))

    contour_data = _contour_features(thresh)
    spacing_data = _component_spacing_features(thresh)
    alignment_score, slant_angle = _alignment_and_slant(thresh)

    shape_similarity_score = _shape_similarity_proxy(thresh, target_text)
    reversal_flag, reversal_count = _reversal_proxy(thresh, target_text)

    difficulty_num = difficulty_to_number(difficulty_level)
    letter_count = expected_letter_count(target_text)

    estimated_duration = 3.5 + letter_count * 1.4 + difficulty_num * 1.8
    writing_duration_sec = _safe_float(writing_duration_sec, estimated_duration)
    retry_count = _safe_int(retry_count, 0)
    task_completion_status = _safe_int(task_completion_status, 1)
    self_correction_flag = _safe_int(self_correction_flag, 0)

    avg_stroke_length = float(np.clip(contour_data["avg_stroke_length"], 8, 90))
    stroke_count = int(np.clip(contour_data["stroke_count"], 1, 40))
    stroke_thickness = float(np.clip(contour_data["stroke_thickness"], 0.8, 5.2))
    contour_irregularity = float(np.clip(contour_data["contour_irregularity"], 0.02, 1.2))
    crowding_score = float(np.clip(contour_data["crowding_score"], 0.02, 1.2))

    average_character_spacing = spacing_data["average_character_spacing"]
    spacing_variance = spacing_data["spacing_variance"]
    size_variance = spacing_data["size_variance"]
    baseline_deviation = spacing_data["baseline_deviation"]

    # Approximate motor fields from image shape and timing.
    avg_stroke_speed = float(np.clip(avg_stroke_length / max(writing_duration_sec / max(stroke_count, 1), 0.1), 10, 120))
    pen_lift_count = int(np.clip(max(0, stroke_count - letter_count), 0, 25))

    shape_error_count = int(np.clip(round((1 - shape_similarity_score) * letter_count * 2.2), 0, 18))
    spacing_error_count = int(np.clip(round(min(spacing_variance / 4, 1.0) * max(1, letter_count - 1) * 1.8), 0, 15))
    alignment_error_count = int(np.clip(round((1 - alignment_score) * letter_count * 1.5), 0, 14))

    hesitation_score = float(np.clip(
        0.28 * min(writing_duration_sec / max(estimated_duration * 2.0, 1.0), 1.0) +
        0.22 * min(pen_lift_count / 10.0, 1.0) +
        0.20 * contour_irregularity +
        0.15 * min(retry_count / 5.0, 1.0) +
        0.15 * environment_noise_level,
        0.0,
        1.0
    ))

    writing_quality_score = float(np.clip(
        0.34 * shape_similarity_score +
        0.18 * (1 - min(spacing_variance / 20.0, 1.0)) +
        0.16 * alignment_score +
        0.12 * (1 - min(size_variance / 20.0, 1.0)) +
        0.10 * (1 - min(reversal_count / 3.0, 1.0)) +
        0.10 * (1 - hesitation_score),
        0.0,
        1.0
    ))

    features = {
        "task_type": task_type,
        "target_text": target_text,
        "difficulty_level": difficulty_level,
        "age": float(age),
        "native_language": native_language,
        "assessment_language": assessment_language,
        "school_type": school_type,
        "support_level": support_level,
        "device_type": device_type,
        "environment_noise_level": float(environment_noise_level),
        "time_of_day": time_of_day,
        "image_width": image_width,
        "image_height": image_height,
        "bounding_box_area": int(bbox_area),
        "aspect_ratio": aspect_ratio,
        "pixel_density": pixel_density,
        "baseline_deviation": baseline_deviation,
        "slant_angle": slant_angle,
        "average_character_spacing": average_character_spacing,
        "spacing_variance": spacing_variance,
        "size_variance": size_variance,
        "alignment_score": alignment_score,
        "reversal_flag": reversal_flag,
        "reversal_count": reversal_count,
        "shape_similarity_score": shape_similarity_score,
        "stroke_thickness": stroke_thickness,
        "contour_irregularity": contour_irregularity,
        "crowding_score": crowding_score,
        "writing_duration_sec": writing_duration_sec,
        "stroke_count": stroke_count,
        "avg_stroke_length": avg_stroke_length,
        "avg_stroke_speed": avg_stroke_speed,
        "pen_lift_count": pen_lift_count,
        "hesitation_score": hesitation_score,
        "shape_error_count": shape_error_count,
        "spacing_error_count": spacing_error_count,
        "alignment_error_count": alignment_error_count,
        "retry_count": retry_count,
        "task_completion_status": task_completion_status,
        "self_correction_flag": self_correction_flag,
        "writing_quality_score": writing_quality_score,
    }

    feature_df = pd.DataFrame([features], columns=FEATURE_COLUMNS)
    return feature_df, features
