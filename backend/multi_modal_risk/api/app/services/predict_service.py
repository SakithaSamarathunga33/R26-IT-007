from typing import Dict, Any
from app.services.model_loader import load_models
from app.services.feature_builder import build_fusion_features
from app.services.fusion_service import load_rule_config, calculate_weighted_fusion, predict_primary_difficulty, predict_secondary_difficulty, fusion_quality
from app.services.therapy_service import build_therapy_recommendation

load_models()

def predict_fusion(payload: Dict[str, Any]):
    config = load_rule_config()
    feature_df, features = build_fusion_features(payload, config)
    final_prediction = calculate_weighted_fusion(features, config)
    primary_difficulty = predict_primary_difficulty(feature_df, features)
    secondary_difficulty_label = predict_secondary_difficulty(features, primary_difficulty['primary_difficulty_label'])
    therapy_recommendation = build_therapy_recommendation(final_prediction, primary_difficulty, secondary_difficulty_label)
    quality = fusion_quality(payload)
    child_id = payload.get('child_id')
    session_id = payload.get('session_id')
    database_save_payload = {
        'fusion_predictions': {
            'child_id': child_id,
            'session_id': session_id,
            'model_name': final_prediction['fusion_strategy'],
            'model_version': final_prediction['model_version'],
            'overall_risk_score': final_prediction['overall_risk_score'],
            'final_dyslexia_risk_label': final_prediction['final_dyslexia_risk_label'],
            'final_dyslexia_risk_level': final_prediction['final_dyslexia_risk_level'],
            'primary_difficulty_label': primary_difficulty['primary_difficulty_label'],
            'secondary_difficulty_label': secondary_difficulty_label,
            'primary_difficulty_method': primary_difficulty['method'],
            'fusion_features_json': features,
            'quality_json': quality
        },
        'therapy_recommendations': {
            'child_id': child_id,
            'session_id': session_id,
            'risk_level': final_prediction['final_dyslexia_risk_level'],
            'primary_difficulty_label': primary_difficulty['primary_difficulty_label'],
            'secondary_difficulty_label': secondary_difficulty_label,
            'recommended_sessions_per_week': therapy_recommendation['recommended_sessions_per_week'],
            'recommendation_intensity': therapy_recommendation['recommendation_intensity'],
            'recommended_activities': therapy_recommendation['recommended_activities'],
            'secondary_recommendation': therapy_recommendation['secondary_recommendation']
        }
    }
    return {
        'final_prediction': final_prediction,
        'primary_difficulty': primary_difficulty,
        'secondary_difficulty_label': secondary_difficulty_label,
        'therapy_recommendation': therapy_recommendation,
        'quality': quality,
        'fusion_features': features,
        'database_save_payload': database_save_payload
    }
