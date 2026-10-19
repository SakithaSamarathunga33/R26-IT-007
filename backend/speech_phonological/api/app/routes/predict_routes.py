# HTTP route for speech prediction. The mobile app (mobile/src/config/apiConfig.ts -> SpeechReviewScreen)
# POSTs a recorded word plus child info here. It converts/validates the audio, predicts risk, transcribes
# the speech and checks the child said the target word. The multi_modal_risk API later fuses the result.
import logging
import re

from fastapi import APIRouter, UploadFile, File, Form
from app.services.audio_validation_service import validate_wav_upload, convert_to_wav_bytes
from app.services.predict_service import predict_speech_from_audio
from app.services.model_loader import load_model, MODEL_VERSION
from app.services.feature_extraction_service import FEATURE_SCHEMA_VERSION
from app.services.transcription_service import transcribe_wav_bytes
from app.models.response_models import SpeechPredictResponse


# Lowercase and strip punctuation/spaces so 'Cat!' matches 'cat'.
def _normalize_for_match(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (text or "").lower())


logger = logging.getLogger("speech.predict")
logging.basicConfig(level=logging.INFO)

# All routes here live under /predict.
router = APIRouter(prefix="/predict", tags=["Speech Prediction"])

# Load the trained model once when the server starts.
load_model()

# Main endpoint. Steps: convert audio to WAV -> validate -> model prediction -> Whisper transcript -> word-match check.
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
    quality = result["quality"]
    prediction = result["prediction"]

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

    # If the transcript is missing the model result stands; if the spoken word differs from the target,
    # the result is downgraded to 'requires_review' with low reliability (we cannot trust a score for the wrong word).
    if transcript is None:
        # Whisper unavailable or failed: the model result stands, the word match is unknown.
        transcript_match = None
        quality["warnings"].append("Transcription unavailable; word match not checked.")
    else:
        transcript_match = _normalize_for_match(transcript) == _normalize_for_match(target_word)
        if not transcript_match:
            prediction["risk_level"] = "requires_review"
            quality["prediction_reliability"] = "low"
            quality["warnings"].append("Spoken word did not match the target word.")

    # Result counts as inconclusive when it needs review or reliability is low; the app can then ask for a retry.
    inconclusive = prediction["risk_level"] == "requires_review" or quality["prediction_reliability"] == "low"

    return {
        "component": "speech_phonological",
        "model_version": MODEL_VERSION,
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "quality_status": "inconclusive" if inconclusive else "valid",
        "transcript": transcript,
        "transcript_match": transcript_match,
        "validation": validation,
        "quality": quality,
        "features": result["features"],
        "prediction": prediction,
    }
