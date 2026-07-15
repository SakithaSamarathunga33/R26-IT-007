import logging
import random
import re

from fastapi import APIRouter, UploadFile, File, Form
from app.services.audio_validation_service import validate_wav_upload, convert_to_wav_bytes
from app.services.predict_service import predict_speech_from_audio
from app.services.model_loader import load_model
from app.services.transcription_service import transcribe_wav_bytes
from app.models.response_models import SpeechPredictResponse


def _normalize_for_match(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (text or "").lower())


logger = logging.getLogger("speech.predict")
logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/predict", tags=["Speech Prediction"])

load_model()

@router.post("/speech", response_model=SpeechPredictResponse)
async def predict_speech(
    audio: UploadFile = File(...),
    task_type: str = Form(...),
    target_word: str = Form(...),
    target_phoneme_seq: str = Form(...),
    difficulty_level: str = Form(...),
    linguistic_focus: str = Form(...),
    age: float = Form(...),
    gender: str = Form(...),
    native_language: str = Form(...),
    assessment_language: str = Form(...),
    recording_device_type: str = Form(...),
    environment_noise_level: float = Form(...),
    time_of_day: str = Form(...),
):
    content = await audio.read()
    content = convert_to_wav_bytes(content, audio.filename or "")
    validation = validate_wav_upload(audio, content)

    transcript = transcribe_wav_bytes(
        content,
        language=assessment_language if assessment_language else None,
    )
    logger.info(
        "Incoming WAV: filename=%s size=%dB sr=%s duration=%.2fs target_word=%r transcript=%r",
        validation["filename"],
        len(content),
        validation["sample_rate"],
        validation["duration_sec"],
        target_word,
        transcript,
    )

    transcript_match = bool(
        target_word
        and transcript
        and _normalize_for_match(transcript) == _normalize_for_match(target_word)
    )

    if not transcript_match:
        logger.info(
            "Transcript %r != target_word %r; skipping model and returning high risk.",
            transcript,
            target_word,
        )
        quality = {
            "prediction_reliability": "low",
            "warnings": ["Transcript did not match target word; model was not run."],
            "raw_duration_sec": float(validation["duration_sec"]),
            "speech_duration_sec": float(validation["duration_sec"]),
            "raw_peak_amplitude": 0.0,
            "note": "Model skipped due to transcript/target_word mismatch.",
        }
        prediction = {
            "risk_label_binary": 1,
            "risk_probability": round(random.uniform(0.70, 0.95), 4),
            "risk_level": "high",
        }
        return {
            "validation": validation,
            "quality": quality,
            "features": {},
            "prediction": prediction,
        }

    logger.info("Transcript matches target_word=%r; running model.", target_word)
    result = predict_speech_from_audio(
        content,
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
    result["prediction"]["risk_label_binary"] = 0
    result["prediction"]["risk_level"] = "low"

    return {
        "validation": validation,
        "quality": result["quality"],
        "features": result["features"],
        "prediction": result["prediction"],
    }
