from fastapi import HTTPException
from app.services.model_loader import get_model
from app.services.feature_extraction_service import extract_speech_features

def predict_speech_from_audio(
    file_bytes: bytes,
    *,
    task_type: str,
    target_word: str,
    target_phoneme_seq: str,
    difficulty_level: str,
    linguistic_focus: str,
    age: float,
    gender: str,
    native_language: str,
    assessment_language: str,
    recording_device_type: str,
    environment_noise_level: float,
    time_of_day: str,
):
    model = get_model()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Speech model not loaded. Place speech_logistic_regression.pkl in the project root."
        )
    feature_df, feature_row, quality = extract_speech_features(
        file_bytes,
        task_type=task_type,
        target_word=target_word,
        target_phoneme_seq=target_phoneme_seq,
        difficulty_level=difficulty_level,
        linguistic_focus=linguistic_focus,
        age=age,
        gender=gender,
        native_language=native_language,
        assessment_language=assessment_language,
        recording_device_type=recording_device_type,
        environment_noise_level=environment_noise_level,
        time_of_day=time_of_day,
    )
    prediction = int(model.predict(feature_df)[0])
    probability = float(model.predict_proba(feature_df)[0][1])

    if quality["prediction_reliability"] == "low":
        risk_level = "requires_review"
    elif probability < 0.35:
        risk_level = "low"
    elif probability < 0.70:
        risk_level = "medium"
    else:
        risk_level = "high"

    return {
        "features": feature_row,
        "quality": quality,
        "prediction": {
            "risk_label_binary": prediction,
            "risk_probability": round(probability, 4),
            "risk_level": risk_level
        }
    }
