import json
import math
from pathlib import Path
from typing import Dict, Any
from app.services.model_loader import get_difficulty_model, get_difficulty_encoder, get_fusion_model
from app.services.reliability_features import FEATURE_ORDER, build_features
from app.utils.risk_utils import final_risk_level, binary_label_from_score, combined_reliability, module_score

CONFIG_PATH = Path(__file__).resolve().parent.parent / 'config' / 'fusion_rule_config.json'
DIFFICULTY_BY_MODULE = {'speech': 'phonological_processing', 'handwriting': 'handwriting', 'behavior': 'attention_behavior'}

def load_rule_config():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def component_statuses(payload: Dict[str, Any]):
    statuses = {}
    for name in DIFFICULTY_BY_MODULE:
        module = payload.get(name) or {}
        score = module_score(module)
        statuses[name] = {
            'usable': score is not None,
            'score': score,
            'reliability': (module.get('quality') or {}).get('prediction_reliability'),
            'model_version': module.get('model_version')
        }
    return statuses

def usable_count(statuses):
    return sum(s['usable'] for s in statuses.values())

def difficulty_scores(statuses):
    return {DIFFICULTY_BY_MODULE[name]: s['score'] for name, s in statuses.items() if s['usable']}

def effective_weights(statuses, config):
    factors = config.get('reliability_factors', {})
    raw = {
        name: float(config[f'{name}_weight']) * float(factors.get(s['reliability'] or 'medium', 0.85)) if s['usable'] else 0.0
        for name, s in statuses.items()
    }
    total = sum(raw.values())
    return {name: w / total if total else 0.0 for name, w in raw.items()}

def disagreement_indicator(statuses, config):
    scores = [s['score'] for s in statuses.values() if s['usable']]
    gap = max(scores) - min(scores) if len(scores) > 1 else 0.0
    return {'max_pairwise_gap': round(gap, 4), 'flagged': gap >= float(config.get('disagreement_threshold', 0.5))}

def review_status(statuses, disagreement, config):
    count = usable_count(statuses)
    if count < int(config.get('minimum_usable_modules', 2)):
        return 'insufficient_evidence'
    low = any(s['usable'] and s['reliability'] == 'low' for s in statuses.values())
    if disagreement['flagged'] or low or count < len(statuses):
        return 'review_recommended'
    return 'normal'

def learned_fusion_probability(statuses, model):
    """Calibrated P(at risk) from the reliability-aware logistic model, or None if the artifact doesn't match this code."""
    if not model or model.get('feature_order') != FEATURE_ORDER:
        return None
    x = build_features({n: s['score'] for n, s in statuses.items()}, {n: s['reliability'] for n, s in statuses.items()})
    z = model['intercept'] + sum(
        c * (v - m) / sc for c, v, m, sc in zip(model['coefficients'], x, model['scaler_mean'], model['scaler_scale']))
    return 1.0 / (1.0 + math.exp(-z))

def calculate_weighted_fusion(statuses, config: Dict[str, Any], status: str):
    """Severity (score + low/medium/high band) comes from the reliability-weighted rule; the at-risk yes/no label and
    its calibrated probability come from the trained model when it is available (rule fallback otherwise).
    The model outputs P(at risk), not severity, so it must not drive the bands: banding it would jump almost
    everything just past the cut-off straight to "high"."""
    threshold = float(config.get('threshold', 0.35))
    weights = effective_weights(statuses, config)
    score = label = prob = None
    strategy = config.get('model_name', 'reliability_weighted_rule_fusion')
    version = config.get('model_version', 'reliability_weighted_rule_v2')
    borderline = False
    if status != 'insufficient_evidence':
        score = sum(weights[name] * s['score'] for name, s in statuses.items() if s['usable'])
        label = binary_label_from_score(score, threshold)
        model = get_fusion_model()
        prob = learned_fusion_probability(statuses, model)
        if prob is not None:
            model_label = int(prob >= float(model.get('decision_threshold', 0.5)))
            borderline = model_label != label  # model and severity disagree near the cut-off: let a human look
            label = model_label
            strategy, version = model['model_name'], model['model_version']
    return {
        'overall_risk_score': None if score is None else round(score, 4),
        'final_dyslexia_risk_label': label,
        'final_dyslexia_risk_level': None if score is None else final_risk_level(score),
        'risk_probability': None if prob is None else round(prob, 4),
        'rule_score': None if score is None else round(score, 4),
        'borderline': borderline,
        'threshold': threshold,
        'weights': {f'{name}_weight': round(w, 4) for name, w in weights.items()},
        'fusion_strategy': strategy,
        'model_version': version,
        'review_status': 'review_recommended' if borderline and status == 'normal' else status
    }

def predict_primary_difficulty(feature_df, statuses, features_complete=True):
    model = get_difficulty_model()
    encoder = get_difficulty_encoder()
    # the XGBoost model was trained on complete sessions only; never feed it placeholder zeros
    if model is not None and encoder is not None and features_complete and usable_count(statuses) == len(statuses):
        pred_encoded = model.predict(feature_df)
        label = encoder.inverse_transform(pred_encoded)[0]
        confidence = None
        if hasattr(model, 'predict_proba'):
            confidence = round(float(max(model.predict_proba(feature_df)[0])), 4)
        return {'primary_difficulty_label': label, 'confidence': confidence, 'method': 'xgboost_primary_difficulty_model'}
    scores = difficulty_scores(statuses)
    return {'primary_difficulty_label': max(scores, key=scores.get), 'confidence': None, 'method': 'rule_based_fallback_highest_usable_module_score'}

def predict_secondary_difficulty(statuses, primary_label):
    scores = {label: score for label, score in difficulty_scores(statuses).items() if label != primary_label}
    return max(scores, key=scores.get) if scores else None

def fusion_quality(payload, statuses):
    warnings = []
    for name, s in statuses.items():
        if not payload.get(name):
            warnings.append(f'{name} module output is missing and was excluded from fusion.')
        elif not s['usable']:
            warnings.append(f'{name} module output is unusable (unavailable or invalid risk probability) and was excluded from fusion.')
        elif s['reliability'] == 'low':
            warnings.append(f'{name} module has low prediction reliability and was down-weighted.')
    return {
        'fusion_reliability': combined_reliability(*[s['reliability'] for s in statuses.values() if s['usable']]),
        'warnings': warnings,
        'note': 'Fusion uses only usable component outputs; missing or unusable modules are excluded, never scored as 0.'
    }
