# HTTP routes for behaviour-risk prediction (mounted at /predict by main.py).
# The mobile app posts its calculated behaviour features to POST /predict/behavior (see mobile/src/config/apiConfig.ts).
# The multi_modal_risk fusion API later receives this result as its "behavior" module.
from fastapi import APIRouter

from app.services.model_loader import load_model
from app.services.predict_service import predict_behavior
from app.schemas.feature_columns import FEATURE_COLUMNS
from app.schemas.behavior_request import BehaviorRequest

router = APIRouter(prefix="/predict", tags=["Behavior Prediction"])

# Load the trained model once when the server starts.
load_model()

# Returns the list of feature names the model expects, so clients know what to send.
@router.get("/behavior/schema")
def get_behavior_schema():
    return {
        "required_model_features": FEATURE_COLUMNS,
        "message": "Send these features as JSON to POST /predict/behavior"
    }

# Main prediction endpoint: validates the body with BehaviorRequest, then hands it to predict_service.
@router.post("/behavior")
def predict_behavior_endpoint(payload: BehaviorRequest):
    return predict_behavior(payload.model_dump())
