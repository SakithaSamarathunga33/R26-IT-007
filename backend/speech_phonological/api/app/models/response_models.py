from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List, Literal

class ValidationResult(BaseModel):
    valid: bool
    filename: str
    content_type: Optional[str] = None
    sample_rate: Optional[int] = None
    duration_sec: Optional[float] = None
    channels: Optional[int] = None
    message: str

class QualityResult(BaseModel):
    prediction_reliability: str
    warnings: List[str]
    raw_duration_sec: float
    speech_duration_sec: float
    raw_peak_amplitude: float
    pitch_missing: bool = False
    note: str

class PredictionResult(BaseModel):
    risk_label_binary: int
    risk_probability: float
    risk_level: str

class SpeechPredictResponse(BaseModel):
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
