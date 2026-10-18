import io
import os
import sys
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

API_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_DIR))
os.environ.setdefault("SPEECH_MODEL_PATH", str(API_DIR.parent / "ml_models" / "speech_logistic_regression.pkl"))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.routes import predict_routes  # noqa: E402
from app.services import model_loader  # noqa: E402

client = TestClient(app)

FORM = {
    "task_type": "word_repetition", "target_word": "cat", "target_phoneme_seq": "k ae t",
    "difficulty_level": "easy", "linguistic_focus": "phoneme", "age": "7", "gender": "female",
    "native_language": "english", "assessment_language": "english", "recording_device_type": "mobile",
    "environment_noise_level": "0.1", "time_of_day": "morning",
}


def _wav(amp: float = 0.5) -> bytes:
    sr = 16000
    t = np.linspace(0, 1.0, sr, endpoint=False)
    y = amp * np.sin(2 * np.pi * 220 * t) * np.hanning(sr)
    buf = io.BytesIO()
    sf.write(buf, y.astype(np.float32), sr, format="WAV")
    return buf.getvalue()


WAV = _wav()


def _post(monkeypatch, transcript, wav=WAV):
    monkeypatch.setattr(predict_routes, "transcribe_wav_bytes", lambda *a, **k: transcript)
    return client.post("/predict/speech", data=FORM, files={"audio": ("rec.wav", wav, "audio/wav")})


class _StubModel:
    def predict(self, df):
        return np.array([1])

    def predict_proba(self, df):
        return np.array([[0.1, 0.9]])


def test_model_loaded():
    assert model_loader.model_loaded()


def test_match_returns_model_risk_level_not_forced_low(monkeypatch):
    monkeypatch.setattr(model_loader, "speech_model", _StubModel())
    body = _post(monkeypatch, "Cat.").json()
    assert body["transcript_match"] is True
    assert body["prediction"]["risk_probability"] == 0.9
    assert body["prediction"]["risk_label_binary"] == 1
    assert body["prediction"]["risk_level"] == "high"
    assert body["quality_status"] == "valid"


def test_low_quality_requires_review_survives_match(monkeypatch):
    body = _post(monkeypatch, "cat", wav=_wav(amp=0.01)).json()
    assert body["transcript_match"] is True
    assert body["quality"]["prediction_reliability"] == "low"
    assert body["prediction"]["risk_level"] == "requires_review"
    assert body["quality_status"] == "inconclusive"


def test_mismatch_requires_review_and_is_deterministic(monkeypatch):
    first = _post(monkeypatch, "dog").json()
    second = _post(monkeypatch, "dog").json()
    assert first["transcript_match"] is False
    assert first["prediction"]["risk_level"] == "requires_review"
    assert first["quality"]["prediction_reliability"] == "low"
    assert "Spoken word did not match the target word." in first["quality"]["warnings"]
    assert first["quality_status"] == "inconclusive"
    assert first["features"]
    assert first["prediction"]["risk_probability"] == second["prediction"]["risk_probability"]


def test_nothing_heard_counts_as_mismatch(monkeypatch):
    body = _post(monkeypatch, "").json()
    assert body["transcript"] == ""
    assert body["transcript_match"] is False
    assert body["prediction"]["risk_level"] == "requires_review"


def test_transcription_unavailable_keeps_model_result(monkeypatch):
    body = _post(monkeypatch, None).json()
    assert body["transcript"] is None
    assert body["transcript_match"] is None
    assert "Transcription unavailable; word match not checked." in body["quality"]["warnings"]
    assert body["prediction"]["risk_level"] in ("low", "medium", "high", "requires_review")
    assert body["features"]


def test_response_contract(monkeypatch):
    body = _post(monkeypatch, "cat").json()
    assert body["component"] == "speech_phonological"
    assert body["model_version"] == "speech_logistic_regression_v1"
    assert body["feature_schema_version"] == "speech_features_v1"
    assert body["quality_status"] in ("valid", "inconclusive")
    assert isinstance(body["quality"]["pitch_missing"], bool)
    for key in ("validation", "quality", "features", "prediction"):
        assert key in body


def test_model_unavailable_returns_503(monkeypatch):
    monkeypatch.setattr(model_loader, "speech_model", None)
    resp = _post(monkeypatch, "cat")
    assert resp.status_code == 503
    assert "SPEECH_MODEL_PATH" in resp.json()["detail"]


def test_no_random_in_route():
    src = (API_DIR / "app" / "routes" / "predict_routes.py").read_text(encoding="utf-8")
    assert "random" not in src
