import json
from pathlib import Path
from typing import Dict, Any
from app.services.model_loader import get_difficulty_model, get_difficulty_encoder
from app.utils.risk_utils import final_risk_level, binary_label_from_score, combined_reliability

CONFIG_PATH = Path(__file__).resolve().parent.parent / 'config' / 'fusion_rule_config.json'

def load_rule_config():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def calculate_weighted_fusion(features: Dict[str, Any], config: Dict[str, Any]):
    sw = float(config.get('speech_weight', 0.40))
    hw = float(config.get('handwriting_weight', 0.35))
    bw = float(config.get('behavior_weight', 0.25))
    threshold = float(config.get('threshold', 0.35))
    score = sw * float(features.get('speech_score', 0.0)) + hw * float(features.get('handwriting_score', 0.0)) + bw * float(features.get('behavior_score', 0.0))
    return {
        'overall_risk_score': round(score, 4),
        'final_dyslexia_risk_label': binary_label_from_score(score, threshold),
        'final_dyslexia_risk_level': final_risk_level(score),
        'threshold': threshold,
        'weights': {'speech_weight': sw, 'handwriting_weight': hw, 'behavior_weight': bw},
        'fusion_strategy': config.get('model_name', 'weighted_rule_based_fusion'),
        'model_version': config.get('model_version', 'weighted_rule_v1')
    }

def predict_primary_difficulty(feature_df, features):
    model = get_difficulty_model()
    encoder = get_difficulty_encoder()
    if model is not None and encoder is not None:
        pred_encoded = model.predict(feature_df)
        label = encoder.inverse_transform(pred_encoded)[0]
        confidence = None
        if hasattr(model, 'predict_proba'):
            confidence = round(float(max(model.predict_proba(feature_df)[0])), 4)
        return {'primary_difficulty_label': label, 'confidence': confidence, 'method': 'xgboost_primary_difficulty_model'}
    scores = {
        'phonological_processing': float(features.get('speech_score', 0.0)),
        'handwriting': float(features.get('handwriting_score', 0.0)),
        'attention_behavior': float(features.get('behavior_score', 0.0))
    }
    return {'primary_difficulty_label': max(scores, key=scores.get), 'confidence': None, 'method': 'rule_based_fallback_highest_module_score'}

def predict_secondary_difficulty(features, primary_label):
    scores = {
        'phonological_processing': float(features.get('speech_score', 0.0)),
        'handwriting': float(features.get('handwriting_score', 0.0)),
        'attention_behavior': float(features.get('behavior_score', 0.0))
    }
    for label, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
        if label != primary_label:
            return label
    return None

def fusion_quality(payload):
    speech_rel = payload.get('speech', {}).get('quality', {}).get('prediction_reliability')
    handwriting_rel = payload.get('handwriting', {}).get('quality', {}).get('prediction_reliability')
    behavior_rel = payload.get('behavior', {}).get('quality', {}).get('prediction_reliability')
    warnings = []
    for module_name in ['speech', 'handwriting', 'behavior']:
        module = payload.get(module_name, {})
        if not module:
            warnings.append(f'{module_name} module output is missing.')
            continue
        if module.get('risk_probability') is None and module.get('score') is None:
            warnings.append(f'{module_name} risk probability is missing.')
        if module.get('quality', {}).get('prediction_reliability') == 'low':
            warnings.append(f'{module_name} module has low prediction reliability.')
    return {
        'fusion_reliability': combined_reliability(speech_rel, handwriting_rel, behavior_rel),
        'warnings': warnings,
        'note': 'Fusion result depends on the quality of all three component outputs.'
    }
