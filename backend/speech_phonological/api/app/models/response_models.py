# Pydantic shapes for the /predict/speech response. Used by routes/predict_routes.py (response_model).
# The mobile app (SpeechReviewScreen) and multi_modal_risk read these fields.
from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List, Literal

# Basic facts about the uploaded audio (format, length, sample rate).
class ValidationResult(BaseModel):
    valid: bool
    filename: str
    content_type: Optional[str] = None
    sample_rate: Optional[int] = None
    duration_sec: Optional[float] = None
    channels: Optional[int] = None
    message: str

# How trustworthy the recording/result is: reliability level, warnings, durations, loudness.
class QualityResult(BaseModel):
    prediction_reliability: str
    warnings: List[str]
    raw_duration_sec: float
    speech_duration_sec: float
    raw_peak_amplitude: float
    pitch_missing: bool = False
    note: str

# The model's answer: 0/1 label, risk probability and risk level (low/medium/high/requires_review).
class PredictionResult(BaseModel):
    risk_label_binary: int
    risk_probability: float
    risk_level: str

# Full response returned to the app. 'inconclusive' quality_status means the result needs review or a retry.
class SpeechPredictResponse(BaseModel):
    # Allows field names starting with 'model_' (pydantic reserves that prefix by default).
    model_config = ConfigDict(protected_namespaces=())

    component: Literal["speech_phonological"] = "speech_phonological"
    model_version: str
    feature_schema_version: str
    quality_status: Literal["valid", "inconclusive"]
    transcript: Optional[str] = None
    transcript_match: Optional[bool] = None
    validation: ValidationResult
    quality: QualityResult
    features: Dict[str, Any]
    prediction: PredictionResult
