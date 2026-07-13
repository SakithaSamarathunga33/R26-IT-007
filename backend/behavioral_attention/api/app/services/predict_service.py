from fastapi import HTTPException
from typing import Dict, Any

from app.services.model_loader import get_model
from app.services.feature_builder import build_feature_dataframe
from app.utils.risk_utils import probability_to_risk_level, reliability_from_missing_count

def predict_behavior(payload: Dict[str, Any]):
    model = get_model()

    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Behavior model not loaded. Place behavior_logistic_regression.pkl in the project root."
        )

    feature_df, missing_columns = build_feature_dataframe(payload)

    prediction = int(model.predict(feature_df)[0])
    probability = float(model.predict_proba(feature_df)[0][1])

    risk_level = probability_to_risk_level(probability)
    reliability = reliability_from_missing_count(len(missing_columns))

    return {
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
