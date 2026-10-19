# HTTP routes for fusion (mounted at /predict by main.py).
# POST /predict/fusion receives the three module results from the mobile app (see mobile/src/services/fusionService.ts).
from fastapi import APIRouter
from app.schemas.feature_columns import FEATURE_COLUMNS
from app.schemas.fusion_request import FusionRequest
from app.services.model_loader import load_models, model_status
from app.services.predict_service import predict_fusion

router = APIRouter(prefix='/predict', tags=['Final Fusion Prediction'])
# Load the ML model files once at startup.
load_models()

# Lists the fusion feature names and which models are loaded.
@router.get('/fusion/schema')
def fusion_schema():
    return {
        'fusion_feature_columns': FEATURE_COLUMNS,
        'model_status': model_status(),
        'message': 'POST module summary outputs to /predict/fusion.'
    }

# Main endpoint: validates the body with FusionRequest and runs predict_fusion.
@router.post('/fusion')
def predict_fusion_endpoint(payload: FusionRequest):
    return predict_fusion(payload.model_dump())
