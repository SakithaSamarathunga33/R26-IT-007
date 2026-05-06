import pandas as pd
from typing import Dict, Any
from app.schemas.feature_columns import FEATURE_COLUMNS
from app.utils.risk_utils import severity_from_score, status_from_score

def _safe_get(data: Dict[str, Any], path: str, default=None):
    current = data
    for part in path.split('.'):
        if not isinstance(current, dict) or part not in current:
            return default
        current = current[part]
    return current

def _safe_float(value, default=0.0):
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default

def _safe_int(value, default=0):
    try:
        if value is None:
            return default
        return int(value)
    except Exception:
        return default

def build_fusion_features(payload: Dict[str, Any], rule_config: Dict[str, Any]):
    metadata = payload.get('metadata', {})
    speech = payload.get('speech', {})
    handwriting = payload.get('handwriting', {})
    behavior = payload.get('behavior', {})

    speech_score = _safe_float(speech.get('score', speech.get('risk_probability')), 0.0)
    handwriting_score = _safe_float(handwriting.get('score', handwriting.get('risk_probability')), 0.0)
    behavior_score = _safe_float(behavior.get('score', behavior.get('risk_probability')), 0.0)

    phoneme_error_rate = _safe_float(_safe_get(speech, 'features.phoneme_error_rate'), 0.0)
    speech_hesitation_score = _safe_float(_safe_get(speech, 'features.speech_hesitation_score', _safe_get(speech, 'features.hesitation_score')), 0.0)
    pronunciation_score = _safe_float(_safe_get(speech, 'features.pronunciation_score'), 0.0)
    rhyme_accuracy = _safe_float(_safe_get(speech, 'features.rhyme_accuracy'), 0.0)

    reversal_risk = _safe_float(_safe_get(handwriting, 'features.reversal_risk', _safe_get(handwriting, 'features.reversal_count')), 0.0)
    if reversal_risk > 1:
        reversal_risk = min(reversal_risk / 3.0, 1.0)

    spacing_variance = _safe_float(_safe_get(handwriting, 'features.spacing_variance'), 0.0)
    if spacing_variance > 1:
        spacing_variance = min(spacing_variance / 30.0, 1.0)

    alignment_score = _safe_float(_safe_get(handwriting, 'features.alignment_score'), 0.0)
    writing_quality_score = _safe_float(_safe_get(handwriting, 'features.writing_quality_score'), 0.0)

    attention_score = _safe_float(_safe_get(behavior, 'features.attention_score'), 0.0)
    engagement_score = _safe_float(_safe_get(behavior, 'features.engagement_score'), 0.0)
    response_latency = _safe_float(_safe_get(behavior, 'features.response_latency', _safe_get(behavior, 'features.response_latency_sec')), 0.0)
    retry_count = _safe_int(_safe_get(behavior, 'features.retry_count'), 0)

    speech_weight = float(rule_config.get('speech_weight', 0.40))
    handwriting_weight = float(rule_config.get('handwriting_weight', 0.35))
    behavior_weight = float(rule_config.get('behavior_weight', 0.25))

    features = {
        'age': _safe_float(metadata.get('age'), 5.5),
        'native_language': metadata.get('native_language', 'Sinhala'),
        'assessment_language': metadata.get('assessment_language', 'English'),
        'school_type': metadata.get('school_type', 'urban_public'),
        'support_level': metadata.get('support_level', 'none'),
        'device_type': metadata.get('device_type', 'tablet'),
        'environment_noise_level': _safe_float(metadata.get('environment_noise_level'), 0.12),
        'time_of_day': metadata.get('time_of_day', 'morning'),
        'speech_score': speech_score,
        'speech_risk_probability': _safe_float(speech.get('risk_probability'), speech_score),
        'phoneme_error_rate': phoneme_error_rate,
        'speech_hesitation_score': speech_hesitation_score,
        'pronunciation_score': pronunciation_score,
        'rhyme_accuracy': rhyme_accuracy,
        'handwriting_score': handwriting_score,
        'handwriting_risk_probability': _safe_float(handwriting.get('risk_probability'), handwriting_score),
        'reversal_risk': reversal_risk,
        'spacing_variance': spacing_variance,
        'alignment_score': alignment_score,
        'writing_quality_score': writing_quality_score,
        'behavior_score': behavior_score,
        'behavior_risk_probability': _safe_float(behavior.get('risk_probability'), behavior_score),
        'attention_score': attention_score,
        'engagement_score': engagement_score,
        'response_latency': response_latency,
        'retry_count': retry_count,
        'speech_weight': speech_weight,
        'handwriting_weight': handwriting_weight,
        'behavior_weight': behavior_weight,
        'fusion_strategy': rule_config.get('model_name', 'weighted_rule_based_fusion'),
        'speech_severity': severity_from_score(speech_score),
        'handwriting_severity': severity_from_score(handwriting_score),
        'behavior_severity': severity_from_score(behavior_score),
        'attention_status': status_from_score(behavior_score),
        'reversal_risk_flag': 1 if reversal_risk > 0.60 else 0,
        'phoneme_risk_flag': 1 if phoneme_error_rate > 0.50 else 0,
        'engagement_risk_flag': 1 if engagement_score < 0.50 else 0,
    }
    final_row = {col: features.get(col, None) for col in FEATURE_COLUMNS}
    return pd.DataFrame([final_row], columns=FEATURE_COLUMNS), features
