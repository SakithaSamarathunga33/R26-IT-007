from fastapi import APIRouter, Body
from typing import Dict, Any
from app.schemas.feature_columns import FEATURE_COLUMNS
from app.services.model_loader import load_models, model_status
from app.services.predict_service import predict_fusion

router = APIRouter(prefix='/predict', tags=['Final Fusion Prediction'])
load_models()

@router.get('/fusion/schema')
def fusion_schema():
    return {
        'fusion_feature_columns': FEATURE_COLUMNS,
        'model_status': model_status(),
        'message': 'POST module summary outputs to /predict/fusion.'
    }

@router.post('/fusion')
def predict_fusion_endpoint(payload: Dict[str, Any] = Body(...)):
    return predict_fusion(payload)
