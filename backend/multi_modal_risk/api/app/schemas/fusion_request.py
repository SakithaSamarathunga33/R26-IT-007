from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

class ModuleQuality(BaseModel):
    model_config = ConfigDict(extra='allow')
    prediction_reliability: Optional[Literal['high', 'medium', 'low']] = None

class ModuleOutput(BaseModel):
    model_config = ConfigDict(extra='allow', protected_namespaces=())
    # null/absent = module unavailable (excluded from fusion); present values must still be a real probability
    risk_probability: Optional[float] = Field(None, ge=0, le=1, allow_inf_nan=False)
    score: Optional[float] = None
    features: Dict[str, Any] = {}
    quality: ModuleQuality = ModuleQuality()
    available: bool = True
    model_version: Optional[str] = None

class FusionRequest(BaseModel):
    model_config = ConfigDict(extra='allow')
    child_id: str
    session_id: str
    metadata: Dict[str, Any] = {}
    speech: Optional[ModuleOutput] = None
    handwriting: Optional[ModuleOutput] = None
    behavior: Optional[ModuleOutput] = None
