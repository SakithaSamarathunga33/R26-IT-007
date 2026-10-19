# Automated tests for POST /predict/behavior (run with pytest from the api folder).
# Checks a valid request, a mostly-empty request (inconclusive), invalid values (422) and a missing model (503).
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import predict_service

client = TestClient(app)
# Example request body loaded from sample_request_fields.json.
SAMPLE = json.loads((Path(__file__).resolve().parents[1] / "sample_request_fields.json").read_text())


# Helper: send the sample request with some fields changed.
def post(**overrides):
    return client.post("/predict/behavior", json={**SAMPLE, **overrides})


# A full valid request returns a normal prediction.
def test_valid_payload_returns_prediction():
    res = post()
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["component"] == "behavioral_attention"
    assert body["model_version"] == "behavior_logistic_regression_v1"
    assert body["feature_schema_version"] == "behavior_features_v1"
    assert body["quality_status"] == "valid"
    assert body["missing_features"] == []
    assert 0 <= body["prediction"]["risk_probability"] <= 1


# Very few features sent -> result is marked inconclusive and lists the missing features.
def test_mostly_missing_payload_is_inconclusive():
    res = client.post("/predict/behavior", json={"age": 6, "task_type": "letter_identification"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["quality_status"] == "inconclusive"
    assert "response_latency_sec" in body["missing_features"]


# Out-of-range values (age, negative time, bad flag, score > 1) must be rejected with 422.
@pytest.mark.parametrize("overrides", [
    {"age": 12},
    {"response_latency_sec": -1},
    {"hint_used_flag": 3},
    {"engagement_score": 1.5},
])
def test_invalid_values_return_422(overrides):
    assert post(**overrides).status_code == 422


# If the model is not loaded the API must answer 503 with a helpful message.
def test_model_missing_returns_503(monkeypatch):
    monkeypatch.setattr(predict_service, "get_model", lambda: None)
    res = post()
    assert res.status_code == 503
    assert "ml_models" in res.json()["detail"]
