import copy
import json
import os
from pathlib import Path
import pytest

API_DIR = Path(__file__).resolve().parent.parent
MODELS = API_DIR.parent / 'ml_models'
os.environ.setdefault('DIFFICULTY_MODEL_PATH', str(MODELS / 'fusion_primary_difficulty_xgboost.pkl'))
os.environ.setdefault('DIFFICULTY_ENCODER_PATH', str(MODELS / 'fusion_primary_difficulty_label_encoder.pkl'))
os.environ.setdefault('FUSION_MODEL_PATH', str(MODELS / 'fusion_reliability_lr_v1.json'))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)
BASE = json.loads((API_DIR / 'sample_request_high.json').read_text())

def payload(**modules):
    data = copy.deepcopy(BASE)
    for name, value in modules.items():
        if value is None:
            data.pop(name, None)
        elif isinstance(value, dict):
            data[name].update(value)
    return data

def post(data):
    res = client.post('/predict/fusion', json=data)
    assert res.status_code == 200, res.text
    return res.json()

def test_all_three_valid():
    body = post(payload(speech={'quality': {'prediction_reliability': 'high'}}, handwriting={'quality': {'prediction_reliability': 'high'}}))
    assert body['review_status'] == 'normal' == body['final_prediction']['review_status']
    assert body['evidence_completeness'] == 1.0
    assert body['final_prediction']['final_dyslexia_risk_level'] == 'high'
    assert body['primary_difficulty']['method'] == 'xgboost_primary_difficulty_model'
    assert body['therapy_recommendation']['recommendation_intensity'] == 'intensive'
    assert body['database_save_payload']['fusion_predictions']['review_status'] == 'normal'
    assert all(s['usable'] for s in body['component_statuses'].values())

def test_speech_missing_not_scored_as_zero():
    body = post(payload(speech=None))
    fp = body['final_prediction']
    # renormalised over handwriting (0.72, medium) and behavior (0.55, high)
    hw, bw = 0.35 * 0.85, 0.25 * 1.0
    assert fp['rule_score'] == pytest.approx((hw * 0.72 + bw * 0.55) / (hw + bw), abs=1e-4)
    assert fp['weights']['speech_weight'] == 0.0
    assert body['review_status'] == 'review_recommended'
    assert body['component_statuses']['speech'] == {'usable': False, 'score': None, 'reliability': None, 'model_version': None}
    assert body['primary_difficulty']['method'] == 'rule_based_fallback_highest_usable_module_score'
    assert body['primary_difficulty']['primary_difficulty_label'] == 'handwriting'
    assert body['secondary_difficulty_label'] == 'attention_behavior'
    assert any('speech' in w for w in body['quality']['warnings'])

@pytest.mark.parametrize('speech', [{'available': False}, {'risk_probability': None}])
def test_unavailable_module_excluded(speech):
    data = payload()
    data['speech'] = speech  # replace, don't merge: no leftover risk_probability
    body = post(data)
    assert body['component_statuses']['speech']['usable'] is False
    assert body['evidence_completeness'] == pytest.approx(0.6667)
    assert body['review_status'] == 'review_recommended'

def test_one_module_insufficient_evidence():
    data = payload(speech=None)
    data['behavior'] = None  # explicit null is accepted like an omitted module
    body = post(data)
    fp = body['final_prediction']
    assert body['review_status'] == 'insufficient_evidence' == fp['review_status']
    for key in ('overall_risk_score', 'final_dyslexia_risk_level', 'final_dyslexia_risk_label'):
        assert fp[key] is None
    assert body['primary_difficulty'] is None
    assert body['secondary_difficulty_label'] is None
    assert body['therapy_recommendation'] is None

def test_probability_out_of_range_is_422():
    assert client.post('/predict/fusion', json=payload(speech={'risk_probability': 1.7})).status_code == 422

def test_disagreement_flagged():
    body = post(payload(speech={'risk_probability': 0.9}, handwriting={'risk_probability': 0.1}))
    assert body['disagreement_indicator'] == {'max_pairwise_gap': 0.8, 'flagged': True}
    assert body['review_status'] == 'review_recommended'

def test_low_reliability_down_weighted():
    high = post(payload(speech={'risk_probability': 0.9, 'quality': {'prediction_reliability': 'high'}}))
    low = post(payload(speech={'risk_probability': 0.9, 'quality': {'prediction_reliability': 'low'}}))
    assert low['final_prediction']['weights']['speech_weight'] < high['final_prediction']['weights']['speech_weight']
    assert low['final_prediction']['rule_score'] < high['final_prediction']['rule_score']
    assert low['review_status'] == 'review_recommended'

@pytest.mark.parametrize('drop', [None, 'speech', 'behavior'])
def test_weights_sum_to_one(drop):
    body = post(payload(**({drop: None} if drop else {})))
    assert sum(body['final_prediction']['weights'].values()) == pytest.approx(1.0, abs=1e-3)

def test_therapy_follows_primary_area_band(monkeypatch):
    # rule scoring (overall medium) so the dosage clearly comes from the weakest area (handwriting 0.75, high)
    from app.services import fusion_service
    monkeypatch.setattr(fusion_service, 'get_fusion_model', lambda: None)
    body = post(payload(speech=None, handwriting={'risk_probability': 0.75}, behavior={'risk_probability': 0.3}))
    assert body['final_prediction']['final_dyslexia_risk_level'] == 'medium'
    assert body['primary_difficulty']['primary_difficulty_label'] == 'handwriting'
    assert body['therapy_recommendation']['recommendation_intensity'] == 'intensive'
    assert body['therapy_recommendation']['recommended_sessions_per_week'] == 3


def test_learned_model_used_and_calibrated_probability():
    fp = post(payload())['final_prediction']
    assert fp['fusion_strategy'] == 'reliability_aware_logistic_fusion'
    assert fp['model_version'] == 'reliability_aware_lr_v1'
    assert 0.0 <= fp['overall_risk_score'] <= 1.0 and fp['threshold'] == 0.5
    assert fp['final_dyslexia_risk_label'] == int(fp['overall_risk_score'] >= 0.5)

def test_missing_module_does_not_drag_learned_score_to_low():
    both_high = post(payload(speech=None, handwriting={'risk_probability': 0.8}, behavior={'risk_probability': 0.8}))
    assert both_high['final_prediction']['final_dyslexia_risk_level'] == 'high'

def test_rule_fallback_when_artifact_missing(monkeypatch):
    from app.services import fusion_service
    monkeypatch.setattr(fusion_service, 'get_fusion_model', lambda: None)
    fp = post(payload())['final_prediction']
    assert fp['fusion_strategy'] == 'reliability_weighted_rule_fusion'
    assert fp['overall_risk_score'] == fp['rule_score']

def test_artifact_with_wrong_feature_order_is_ignored(monkeypatch):
    from app.services import fusion_service
    monkeypatch.setattr(fusion_service, 'get_fusion_model', lambda: {'feature_order': ['x'], 'model_name': 'bad'})
    assert post(payload())['final_prediction']['fusion_strategy'] == 'reliability_weighted_rule_fusion'
