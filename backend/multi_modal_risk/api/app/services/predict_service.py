# Top-level orchestration of one fusion request. Called by routes/predict_routes.py.
# Runs, in order: module statuses -> feature table -> disagreement/review status -> final fusion -> difficulty areas -> therapy plan
# (fusion_service.py, feature_builder.py, therapy_service.py) and packages the answer for the mobile app.
from typing import Dict, Any
from app.services.model_loader import load_models
from app.services.feature_builder import build_fusion_features
from app.services.fusion_service import (
    load_rule_config, component_statuses, usable_count, difficulty_scores, disagreement_indicator, review_status,
    calculate_weighted_fusion, predict_primary_difficulty, predict_secondary_difficulty, fusion_quality
)
from app.services.therapy_service import build_therapy_recommendation

# Make sure models are loaded even if this file is imported on its own (e.g. in tests).
load_models()

# Returns the full fusion response: final prediction, difficulty areas, therapy recommendation, quality, review info,
# and 'database_save_payload' (rows ready to be saved for this child and session).
# If there is not enough evidence, difficulty and therapy are left empty (None).
def predict_fusion(payload: Dict[str, Any]):
    config = load_rule_config()
    statuses = component_statuses(payload)
    feature_df, features = build_fusion_features(payload, config)
    disagreement = disagreement_indicator(statuses, config)
    status = review_status(statuses, disagreement, config)
    final_prediction = calculate_weighted_fusion(statuses, config, status)
    status = final_prediction['review_status']  # a borderline model/severity split escalates normal -> review_recommended
    primary_difficulty = secondary_difficulty_label = therapy_recommendation = None
    if status != 'insufficient_evidence':
        # XGBoost also needs each module's sub-features; empty feature dicts would reach it as zeros
        features_complete = all((payload.get(name) or {}).get('features') for name in statuses)
        primary_difficulty = predict_primary_difficulty(feature_df, statuses, features_complete)
        primary_label = primary_difficulty['primary_difficulty_label']
        secondary_difficulty_label = predict_secondary_difficulty(statuses, primary_label)
        therapy_recommendation = build_therapy_recommendation(final_prediction, primary_difficulty, secondary_difficulty_label, difficulty_scores(statuses).get(primary_label))
    quality = fusion_quality(payload, statuses)
    if final_prediction['borderline']:
        quality['warnings'].append('Borderline case: the trained model and the severity score disagree about the at-risk cut-off.')
    review_fields = {
        'component_statuses': statuses,
        'evidence_completeness': round(usable_count(statuses) / len(statuses), 4),
        'disagreement_indicator': disagreement,
        'review_status': status
    }
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
            'primary_difficulty_label': (primary_difficulty or {}).get('primary_difficulty_label'),
            'secondary_difficulty_label': secondary_difficulty_label,
            'primary_difficulty_method': (primary_difficulty or {}).get('method'),
            'fusion_features_json': features,
            'quality_json': quality,
            **review_fields
        },
        'therapy_recommendations': None if therapy_recommendation is None else {
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
        'database_save_payload': database_save_payload,
        **review_fields
    }
