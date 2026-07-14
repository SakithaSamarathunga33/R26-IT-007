from fastapi import HTTPException
from app.services.model_loader import get_model
from app.services.image_validation_service import validate_image_upload
from app.services.feature_extraction_service import extract_handwriting_features
from app.utils.risk_utils import probability_to_risk_level, reliability_from_warnings

def predict_handwriting_from_image(
    *,
    upload_file,
    file_bytes: bytes,
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
    strict_target_match: bool = False,
):
    model = get_model()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Handwriting model not loaded. Place handwriting_logistic_regression.pkl in the project root."
        )

    validation, image_rgb, gray, thresh = validate_image_upload(
        upload_file,
        file_bytes,
        target_text=target_text,
        strict_target_match=strict_target_match
    )

    feature_df, features = extract_handwriting_features(
        image_rgb=image_rgb,
        gray=gray,
        thresh=thresh,
        task_type=task_type,
        target_text=target_text,
        difficulty_level=difficulty_level,
        age=age,
        native_language=native_language,
        assessment_language=assessment_language,
        school_type=school_type,
        support_level=support_level,
        device_type=device_type,
        environment_noise_level=environment_noise_level,
        time_of_day=time_of_day,
        writing_duration_sec=writing_duration_sec,
        retry_count=retry_count,
        task_completion_status=task_completion_status,
        self_correction_flag=self_correction_flag,
    )

    prediction = int(model.predict(feature_df)[0])
    probability = float(model.predict_proba(feature_df)[0][1])
    risk_level = probability_to_risk_level(probability)

    reliability = reliability_from_warnings(validation.get("warnings", []))

    return {
        "validation": validation,
        "quality": {
            "prediction_reliability": reliability,
            "warnings": validation.get("warnings", []),
            "note": "This is a prototype image feature extractor. Real handwritten-letter validation can be improved with a CNN or OCR model trained on child handwriting."
        },
        "features": features,
        "prediction": {
            "handwriting_risk_label_binary": prediction,
            "risk_probability": round(probability, 4),
            "risk_level": risk_level
        }
    }
