from pydantic import BaseModel
from typing import Optional, Dict, Any, List

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
    note: str

class PredictionResult(BaseModel):
    risk_label_binary: int
    risk_probability: float
    risk_level: str

class SpeechPredictResponse(BaseModel):
    validation: ValidationResult
    quality: QualityResult
    features: Dict[str, Any]
    prediction: PredictionResult
