import io
import os
import sys

import pytest
from PIL import Image, ImageDraw

# Model path is read at import time, so point it at the real model before importing the app.
os.environ.setdefault(
    "HANDWRITING_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "ml_models", "handwriting_logistic_regression.pkl"),
)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services import model_loader  # noqa: E402

client = TestClient(app)

FORM = {
    "task_type": "letter_write",
    "target_text": "b",
    "difficulty_level": "easy",
    "age": "7",
    "native_language": "sinhala",
    "assessment_language": "english",
    "school_type": "public",
    "support_level": "none",
    "device_type": "tablet",
    "environment_noise_level": "0.2",
    "time_of_day": "morning",
}


@pytest.fixture(autouse=True)
def no_ocr(monkeypatch):
    # Tests must not depend on a local tesseract binary; None in sys.modules makes the import fail.
    monkeypatch.setitem(sys.modules, "pytesseract", None)


def _png(draw_fn=None, size=(400, 400), frame=False):
    img = Image.new("RGB", size, "white")
    d = ImageDraw.Draw(img)
    if frame:
        # Mimic the mobile ViewShot capture: light grey rounded border, dark (transparent) corners.
        img = Image.new("RGB", size, "black")
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=40, fill="white", outline=(226, 232, 240), width=4)
    if draw_fn:
        draw_fn(d)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _letter_b(d):
    d.line([(160, 100), (160, 300)], fill="black", width=10)
    d.ellipse([160, 200, 250, 300], outline="black", width=10)


def _post(data, filename="writing.png"):
    return client.post("/predict/handwriting", data=FORM, files={"image": (filename, data, "image/png")})


def test_blank_image_requires_recapture():
    res = _post(_png())
    assert res.status_code == 422
    detail = res.json()["detail"]
    assert detail["code"] == "recapture_required"
    assert detail["reason"] == "blank"
    assert detail["message"]


def test_undecodable_image_requires_recapture():
    res = _post(b"not an image")
    assert res.status_code == 422
    assert res.json()["detail"]["reason"] == "undecodable"


def test_cropped_writing_requires_recapture():
    def cut_off(d):
        # A "b" so large its stem and bowl run off all four edges.
        d.line([(8, -10), (8, 410)], fill="black", width=10)
        d.ellipse([8, 180, 440, 440], outline="black", width=10)

    res = _post(_png(cut_off))
    assert res.status_code == 422
    assert res.json()["detail"]["reason"] == "cropped"


def test_big_letter_touching_three_edges_is_accepted():
    def big_b(d):
        d.line([(8, -10), (8, 410)], fill="black", width=10)
        d.ellipse([8, 180, 300, 440], outline="black", width=10)

    assert _post(_png(big_b)).status_code != 422


@pytest.mark.parametrize("frame", [False, True])
def test_drawn_letter_returns_prediction(frame):
    res = _post(_png(_letter_b, frame=frame))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["component"] == "handwriting_analysis"
    assert body["model_version"] == "handwriting_logistic_regression_v1"
    assert body["feature_schema_version"]
    assert body["preprocessing_version"]
    assert body["quality_status"] in ("valid", "inconclusive")
    assert body["target_match"] == {"matched": None, "confidence": None}
    codes = [w["code"] for w in body["warnings"]]
    assert "ocr_unavailable" in codes
    # Existing keys stay.
    assert {"validation", "quality", "features", "prediction"} <= body.keys()
    assert 0.0 <= body["prediction"]["risk_probability"] <= 1.0


def test_possible_reversal_warning(monkeypatch):
    from app.services import predict_service

    real = predict_service.extract_handwriting_features

    def flagged(**kwargs):
        df, features = real(**kwargs)
        features["reversal_flag"] = 1
        return df, features

    monkeypatch.setattr(predict_service, "extract_handwriting_features", flagged)
    res = _post(_png(_letter_b))
    assert res.status_code == 200
    assert "possible_reversal" in [w["code"] for w in res.json()["warnings"]]


def test_model_missing_returns_503(monkeypatch):
    monkeypatch.setattr(model_loader, "handwriting_model", None)
    res = _post(_png(_letter_b))
    assert res.status_code == 503
    assert "ml_models" in res.json()["detail"]


@pytest.mark.parametrize("ocr_word,matched,reversal", [("b", True, False), ("d", False, True)])
def test_target_match_from_ocr(monkeypatch, ocr_word, matched, reversal):
    from types import SimpleNamespace

    fake = SimpleNamespace(
        Output=SimpleNamespace(DICT="dict"),
        image_to_data=lambda *a, **k: {"text": ["", ocr_word], "conf": ["-1", "88"]},
    )
    monkeypatch.setitem(sys.modules, "pytesseract", fake)
    res = _post(_png(_letter_b))
    assert res.status_code == 200
    body = res.json()
    assert body["target_match"] == {"matched": matched, "confidence": 0.88}
    assert body["validation"]["ocr_mirror_match"] is reversal
    if reversal:
        assert "possible_reversal" in [w["code"] for w in body["warnings"]]
