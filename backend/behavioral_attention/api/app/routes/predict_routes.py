from fastapi import APIRouter, Body
from typing import Dict, Any

from app.services.model_loader import load_model
from app.services.predict_service import predict_behavior
from app.schemas.feature_columns import FEATURE_COLUMNS

router = APIRouter(prefix="/predict", tags=["Behavior Prediction"])

load_model()

@router.get("/behavior/schema")
def get_behavior_schema():
    return {
        "required_model_features": FEATURE_COLUMNS,
        "message": "Send these features as JSON to POST /predict/behavior"
    }

@router.post("/behavior")
def predict_behavior_endpoint(payload: Dict[str, Any] = Body(...)):
    return predict_behavior(payload)
