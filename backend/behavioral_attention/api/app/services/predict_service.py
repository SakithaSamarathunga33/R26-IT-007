# Core prediction logic for the behaviour module.
# Called by routes/predict_routes.py. Builds features, runs the model, then adds a risk level and a data-quality rating.
# The returned JSON is what the mobile app and the multi_modal_risk fusion API use as the behaviour result.
from fastapi import HTTPException
from typing import Dict, Any

from app.services.model_loader import get_model, MODEL_VERSION
from app.schemas.feature_columns import FEATURE_SCHEMA_VERSION
from app.services.feature_builder import build_feature_dataframe
from app.utils.risk_utils import probability_to_risk_level, reliability_from_missing_count

# Runs one behaviour prediction. Returns the risk label (0/1), risk probability, risk level (low/medium/high)
# and quality info. Responds 503 if the model is not loaded. A "low" reliability makes quality_status "inconclusive".
def predict_behavior(payload: Dict[str, Any]):
    model = get_model()

    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Behavior model not loaded. Place behavior_logistic_regression.pkl in backend/behavioral_attention/ml_models/ or set BEHAVIOR_MODEL_PATH."
        )

    feature_df, missing_columns = build_feature_dataframe(payload)

    prediction = int(model.predict(feature_df)[0])
    probability = float(model.predict_proba(feature_df)[0][1])

    risk_level = probability_to_risk_level(probability)
    reliability = reliability_from_missing_count(len(missing_columns))

    return {
        "component": "behavioral_attention",
        "model_version": MODEL_VERSION,
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "quality_status": "inconclusive" if reliability == "low" else "valid",
        "missing_features": missing_columns,
        "prediction": {
            "behavior_risk_label_binary": prediction,
            "risk_probability": round(probability, 4),
            "risk_level": risk_level
        },
        "quality": {
            "prediction_reliability": reliability,
            "missing_feature_count": len(missing_columns),
            "missing_features": missing_columns,
            "note": "For best accuracy, send all required behavior features calculated from frontend activity logs."
        },
        "mapped_features": feature_df.iloc[0].to_dict()
    }
