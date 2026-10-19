# Shape of the request body for POST /predict/fusion (validated by pydantic).
# It carries one result per module (speech, handwriting, behavior) as produced by the other three APIs.
# Used by routes/predict_routes.py.
from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

# Quality info from a module; only the reliability (high/medium/low) is used here.
class ModuleQuality(BaseModel):
    model_config = ConfigDict(extra='allow')
    prediction_reliability: Optional[Literal['high', 'medium', 'low']] = None

# One module's result: risk probability, optional features, quality and an availability flag.
class ModuleOutput(BaseModel):
    model_config = ConfigDict(extra='allow', protected_namespaces=())
    # null/absent = module unavailable (excluded from fusion); present values must still be a real probability
    risk_probability: Optional[float] = Field(None, ge=0, le=1, allow_inf_nan=False)
    score: Optional[float] = None
    features: Dict[str, Any] = {}
    quality: ModuleQuality = ModuleQuality()
    available: bool = True
    model_version: Optional[str] = None

# Whole request: which child/session, optional metadata (age, language, device...) and the three module results. A missing module is simply left out of fusion.
class FusionRequest(BaseModel):
    model_config = ConfigDict(extra='allow')
    child_id: str
    session_id: str
    metadata: Dict[str, Any] = {}
    speech: Optional[ModuleOutput] = None
    handwriting: Optional[ModuleOutput] = None
    behavior: Optional[ModuleOutput] = None
