# Handwriting Advanced Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduce, as new code in this repo, the richer handwriting-validation behavior currently only observed on the (uncommitted) Azure deployment: fuzzy target-text matching, confusable-letter tolerance, mirror/reversal detection, and a consistency guardrail that reconciles a clean match against the raw ML model output.

**Architecture:** One new pure-Python module (`text_matching_service.py`) holds all matching/scoring/threshold logic with zero image or FastAPI dependencies, so it's unit-testable in isolation. `image_validation_service.py` calls it to score OCR output (upright and horizontally flipped) against `target_text`. `predict_service.py` calls it again to decide whether the guardrail overrides the raw model's risk probability.

**Tech Stack:** Python 3.11 (service runtime) / 3.12 (this dev sandbox), stdlib only for the new module (`re`, `difflib` not used — custom DP; see Task 1), existing `opencv-python-headless` + `pytesseract` for image/OCR work, `pytest` (new, dev-only) for the new module's tests.

**Spec:** `docs/superpowers/specs/2026-08-30-handwriting-advanced-validation-design.md`

## Global Constraints

- No new *runtime* dependencies — `requirements.txt` (the file the Docker image installs) does not change. `pytest` goes in a new `requirements-dev.txt`, dev-only.
- `risk_probability` and `risk_level` in the API response keep their existing field names and meaning (final result) — the mobile app must keep working unmodified.
- `CONFUSABLE_SUBSTITUTION_COST = 0.3`, `TARGET_MATCH_THRESHOLD = 0.6`, `MIRROR_MIN_SCORE = 0.75`, `MIRROR_MARGIN = 0.15`, `GUARDRAIL_MATCH_THRESHOLD = 0.9`, `GUARDRAIL_CEILING = 0.30` — exact values from the spec's threshold table.
- **Sandbox limitation:** this dev environment has no `cv2`, no `pytesseract`, and no `tesseract` binary installed (verified: `import cv2` fails, `which tesseract` finds nothing). Task 1's module is pure stdlib and fully testable here. Tasks 2 and 3 touch files that import `cv2`/`pytesseract` — those can only be **syntax-checked** here (`python3 -m py_compile`), not executed or unit-tested. Each of those tasks ends with a manual smoke-test procedure to run wherever the full stack (opencv, tesseract-ocr binary) is available (e.g. the target VPS or a machine with `requirements.txt` installed) — do not claim those tasks "pass tests" beyond the compile check.
- Commit messages must not name any AI tool or include AI co-author trailers.

---

### Task 1: Text matching service (pure logic + tests)

**Files:**
- Create: `backend/handwriting_analysis/api/requirements-dev.txt`
- Create: `backend/handwriting_analysis/api/app/services/text_matching_service.py`
- Test: `backend/handwriting_analysis/api/tests/test_text_matching_service.py`

**Interfaces:**
- Consumes: nothing (stdlib only).
- Produces (used by Task 2 and Task 3):
  - `TARGET_MATCH_THRESHOLD: float`, `GUARDRAIL_MATCH_THRESHOLD: float`, `GUARDRAIL_CEILING: float` — module-level constants.
  - `plain_similarity(a: str, b: str) -> float`
  - `confusable_similarity(a: str, b: str) -> float`
  - `is_mirror_detected(upright_score: float, mirror_score: float) -> bool`
  - `build_matching_result(ocr_text: str, ocr_text_mirror: str, target_text: str) -> dict` — keys: `target_match_score`, `template_similarity_score`, `confusable_similarity_score`, `mirror_similarity_score`, `mirror_detected` (all floats except the last, which is `bool`).
  - `empty_matching_result() -> dict` — same keys, zeroed/`False`, for when OCR is unavailable.

- [ ] **Step 1: Add the dev requirements file**

Create `backend/handwriting_analysis/api/requirements-dev.txt`:

```
pytest==8.3.3
```

- [ ] **Step 2: Install dev requirements into a throwaway venv for this dev sandbox**

Run:
```bash
cd backend/handwriting_analysis/api
python3 -m venv /tmp/hw_test_venv
/tmp/hw_test_venv/bin/pip install -q -r requirements-dev.txt
```
Expected: installs cleanly (only `pytest` and its own deps — no `opencv`/`pytesseract` needed for this task).

- [ ] **Step 3: Write the failing tests**

Create `backend/handwriting_analysis/api/tests/test_text_matching_service.py`:

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.text_matching_service import (
    plain_similarity,
    confusable_similarity,
    is_mirror_detected,
    build_matching_result,
    empty_matching_result,
    TARGET_MATCH_THRESHOLD,
    MIRROR_MIN_SCORE,
    MIRROR_MARGIN,
)


def test_plain_similarity_exact_match():
    assert plain_similarity("cat", "cat") == 1.0


def test_plain_similarity_both_empty():
    assert plain_similarity("", "") == 1.0


def test_plain_similarity_one_empty():
    assert plain_similarity("cat", "") == 0.0


def test_plain_similarity_unrelated_strings_scores_low():
    assert plain_similarity("cat", "xyz") < 0.3


def test_confusable_similarity_exact_match():
    assert confusable_similarity("dog", "dog") == 1.0


def test_confusable_substitution_scores_higher_than_plain():
    # 'b' and 'd' are confusable; 'f' and 'd' are not.
    confusable_score = confusable_similarity("dog", "bog")
    unrelated_score = confusable_similarity("dog", "fog")
    assert confusable_score > unrelated_score


def test_confusable_similarity_never_less_than_plain_similarity():
    pairs = [
        ("cat", "cat"),
        ("cat", "cai"),
        ("dog", "bog"),
        ("dog", "fog"),
        ("apple", "appIe"),
        ("cat", "xyz"),
        ("b", "d"),
        ("", "cat"),
    ]
    for a, b in pairs:
        assert confusable_similarity(a, b) >= plain_similarity(a, b)


def test_is_mirror_detected_true_when_flip_scores_much_higher():
    assert is_mirror_detected(upright_score=0.2, mirror_score=0.9) is True


def test_is_mirror_detected_false_when_scores_close():
    assert is_mirror_detected(upright_score=0.85, mirror_score=0.9) is False


def test_is_mirror_detected_false_when_mirror_score_below_minimum():
    assert is_mirror_detected(upright_score=0.1, mirror_score=0.6) is False


def test_is_mirror_detected_boundary_values_use_configured_constants():
    just_below_margin = MIRROR_MIN_SCORE - 0.0001
    assert is_mirror_detected(upright_score=0.0, mirror_score=just_below_margin) is False
    assert is_mirror_detected(upright_score=0.0, mirror_score=MIRROR_MIN_SCORE) is True


def test_build_matching_result_shape_and_target_match_threshold():
    result = build_matching_result("cat", "tac", "cat")
    assert set(result.keys()) == {
        "target_match_score",
        "template_similarity_score",
        "confusable_similarity_score",
        "mirror_similarity_score",
        "mirror_detected",
    }
    assert result["target_match_score"] == 1.0
    assert result["target_match_score"] >= TARGET_MATCH_THRESHOLD
    assert result["confusable_similarity_score"] == result["target_match_score"]


def test_empty_matching_result_is_all_zero_and_no_mirror():
    result = empty_matching_result()
    assert result["target_match_score"] == 0.0
    assert result["template_similarity_score"] == 0.0
    assert result["confusable_similarity_score"] == 0.0
    assert result["mirror_similarity_score"] == 0.0
    assert result["mirror_detected"] is False
```

- [ ] **Step 4: Run tests to verify they fail**

Run:
```bash
cd backend/handwriting_analysis/api
/tmp/hw_test_venv/bin/python -m pytest tests/test_text_matching_service.py -v
```
Expected: FAIL / ERROR — `ModuleNotFoundError: No module named 'app.services.text_matching_service'` (module doesn't exist yet).

- [ ] **Step 5: Implement the module**

Create `backend/handwriting_analysis/api/app/services/text_matching_service.py`:

```python
import re

CONFUSABLE_SUBSTITUTION_COST = 0.3
TARGET_MATCH_THRESHOLD = 0.6
MIRROR_MIN_SCORE = 0.75
MIRROR_MARGIN = 0.15
GUARDRAIL_MATCH_THRESHOLD = 0.9
GUARDRAIL_CEILING = 0.30

CONFUSABLE_GROUPS = [
    {"0", "o"},
    {"1", "l", "i"},
    {"5", "s"},
    {"8", "b"},
    {"2", "z"},
    {"b", "d"},
    {"p", "q"},
    {"m", "n"},
    {"u", "v"},
    {"g", "q"},
]

_CONFUSABLE_LOOKUP = {}
for _group in CONFUSABLE_GROUPS:
    for _ch in _group:
        _CONFUSABLE_LOOKUP.setdefault(_ch, set()).update(_group)


def _clean(s: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", s or "").lower()


def _are_confusable(x: str, y: str) -> bool:
    if x == y:
        return True
    return y in _CONFUSABLE_LOOKUP.get(x, set())


def _weighted_edit_distance(a: str, b: str, confusable_cost: float) -> float:
    n, m = len(a), len(b)
    if n == 0:
        return float(m)
    if m == 0:
        return float(n)

    prev = [float(j) for j in range(m + 1)]
    for i in range(1, n + 1):
        curr = [float(i)] + [0.0] * m
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                sub_cost = 0.0
            elif _are_confusable(a[i - 1], b[j - 1]):
                sub_cost = confusable_cost
            else:
                sub_cost = 1.0
            curr[j] = min(
                prev[j] + 1.0,       # deletion
                curr[j - 1] + 1.0,   # insertion
                prev[j - 1] + sub_cost,  # substitution
            )
        prev = curr
    return prev[m]


def _similarity(a: str, b: str, confusable_cost: float) -> float:
    a_clean = _clean(a)
    b_clean = _clean(b)
    if not a_clean and not b_clean:
        return 1.0
    if not a_clean or not b_clean:
        return 0.0
    distance = _weighted_edit_distance(a_clean, b_clean, confusable_cost)
    max_len = max(len(a_clean), len(b_clean))
    similarity = 1.0 - (distance / max_len)
    return max(0.0, min(1.0, similarity))


def plain_similarity(a: str, b: str) -> float:
    return _similarity(a, b, confusable_cost=1.0)


def confusable_similarity(a: str, b: str) -> float:
    return _similarity(a, b, confusable_cost=CONFUSABLE_SUBSTITUTION_COST)


def is_mirror_detected(upright_score: float, mirror_score: float) -> bool:
    return mirror_score >= MIRROR_MIN_SCORE and (mirror_score - upright_score) >= MIRROR_MARGIN


def build_matching_result(ocr_text: str, ocr_text_mirror: str, target_text: str) -> dict:
    target_match_score = confusable_similarity(ocr_text, target_text)
    template_similarity_score = plain_similarity(ocr_text, target_text)
    mirror_similarity_score = confusable_similarity(ocr_text_mirror, target_text)
    mirror_detected = is_mirror_detected(target_match_score, mirror_similarity_score)
    return {
        "target_match_score": round(target_match_score, 4),
        "template_similarity_score": round(template_similarity_score, 4),
        "confusable_similarity_score": round(target_match_score, 4),
        "mirror_similarity_score": round(mirror_similarity_score, 4),
        "mirror_detected": mirror_detected,
    }


def empty_matching_result() -> dict:
    return {
        "target_match_score": 0.0,
        "template_similarity_score": 0.0,
        "confusable_similarity_score": 0.0,
        "mirror_similarity_score": 0.0,
        "mirror_detected": False,
    }
```

- [ ] **Step 6: Run tests to verify they pass**

Run:
```bash
cd backend/handwriting_analysis/api
/tmp/hw_test_venv/bin/python -m pytest tests/test_text_matching_service.py -v
```
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/handwriting_analysis/api/requirements-dev.txt \
        backend/handwriting_analysis/api/app/services/text_matching_service.py \
        backend/handwriting_analysis/api/tests/test_text_matching_service.py
git commit -m "Add confusable-aware text matching and mirror-detection scoring"
```

---

### Task 2: Wire matching into image validation

**Files:**
- Modify: `backend/handwriting_analysis/api/app/services/image_validation_service.py`

**Interfaces:**
- Consumes: `build_matching_result`, `empty_matching_result`, `TARGET_MATCH_THRESHOLD` from Task 1's `app.services.text_matching_service`.
- Produces (used by Task 3): the dict returned by `validate_image_upload(...)` gains a `"matching"` key holding the `build_matching_result`/`empty_matching_result` dict (same shape as Task 1's interface). `ocr_target_match` in that same dict is now `matching["target_match_score"] >= TARGET_MATCH_THRESHOLD` instead of an exact substring check.

- [ ] **Step 1: Edit the imports**

In `backend/handwriting_analysis/api/app/services/image_validation_service.py`, replace:

```python
from fastapi import HTTPException, UploadFile
from PIL import Image
import numpy as np
import cv2
import io
import re
```

with:

```python
from fastapi import HTTPException, UploadFile
from PIL import Image
import numpy as np
import cv2
import io

from app.services.text_matching_service import (
    build_matching_result,
    empty_matching_result,
    TARGET_MATCH_THRESHOLD,
)
```

(`re` is dropped here — its only use moves into `text_matching_service.py`.)

- [ ] **Step 2: Replace the OCR block and the fields that depend on it**

Replace this block (the OCR try/except through the `return` statement):

```python
    # OCR is optional. It can fail for handwriting, so we do not rely only on it.
    ocr_available = False
    ocr_text = ""
    ocr_target_match = False
    ocr_error = None

    try:
        import pytesseract
        ocr_available = True

        # OCR with simple config for letters/words
        config = "--psm 6"
        ocr_text = pytesseract.image_to_string(gray, config=config)
        ocr_text_clean = re.sub(r"[^A-Za-z0-9]", "", ocr_text).lower()
        target_clean = re.sub(r"[^A-Za-z0-9]", "", target_text or "").lower()

        if target_clean and target_clean in ocr_text_clean:
            ocr_target_match = True
    except Exception as e:
        ocr_error = str(e)

    warnings = []

    if not ocr_available:
        warnings.append("OCR engine is not available. Letter validation used image heuristics only.")
    elif ocr_available and not ocr_target_match:
        warnings.append("OCR could not confidently match the target text. This may happen with child handwriting.")

    if foreground_ratio < 0.01:
        warnings.append("Foreground handwriting is very light or small.")

    if component_count > 80:
        warnings.append("Image has many components. It may contain noise or background artifacts.")

    if strict_target_match and not ocr_target_match:
        raise HTTPException(status_code=400, detail="Target text was not matched by OCR. Please upload a clearer image or disable strict_target_match.")

    return {
        "valid": True,
        "filename": filename,
        "content_type": file.content_type,
        "image_width": int(w),
        "image_height": int(h),
        "foreground_ratio": round(float(foreground_ratio), 6),
        "component_count": int(component_count),
        "letter_like_component_count": int(letter_like_component_count),
        "ocr_available": bool(ocr_available),
        "ocr_text": ocr_text.strip(),
        "ocr_target_match": bool(ocr_target_match),
        "ocr_error": ocr_error,
        "warnings": warnings,
        "message": "Image validated successfully. Letter-like handwriting content was detected."
    }, image_rgb, gray, thresh
```

with:

```python
    # OCR is optional. It can fail for handwriting, so we do not rely only on it.
    ocr_available = False
    ocr_text = ""
    ocr_text_mirror = ""
    ocr_error = None

    try:
        import pytesseract
        ocr_available = True

        # OCR with simple config for letters/words
        config = "--psm 6"
        ocr_text = pytesseract.image_to_string(gray, config=config)

        mirror_gray = cv2.flip(gray, 1)
        ocr_text_mirror = pytesseract.image_to_string(mirror_gray, config=config)
    except Exception as e:
        ocr_error = str(e)

    if ocr_available:
        matching = build_matching_result(ocr_text, ocr_text_mirror, target_text)
    else:
        matching = empty_matching_result()

    ocr_target_match = matching["target_match_score"] >= TARGET_MATCH_THRESHOLD

    warnings = []

    if not ocr_available:
        warnings.append("OCR engine is not available. Letter validation used image heuristics only.")
    elif not ocr_target_match:
        warnings.append("OCR could not confidently match the target text. This may happen with child handwriting.")

    if matching["mirror_detected"]:
        warnings.append("Writing appears to be mirrored/reversed.")

    if foreground_ratio < 0.01:
        warnings.append("Foreground handwriting is very light or small.")

    if component_count > 80:
        warnings.append("Image has many components. It may contain noise or background artifacts.")

    if strict_target_match and not ocr_target_match:
        raise HTTPException(status_code=400, detail="Target text was not matched by OCR. Please upload a clearer image or disable strict_target_match.")

    return {
        "valid": True,
        "filename": filename,
        "content_type": file.content_type,
        "image_width": int(w),
        "image_height": int(h),
        "foreground_ratio": round(float(foreground_ratio), 6),
        "component_count": int(component_count),
        "letter_like_component_count": int(letter_like_component_count),
        "ocr_available": bool(ocr_available),
        "ocr_text": ocr_text.strip(),
        "ocr_target_match": bool(ocr_target_match),
        "ocr_error": ocr_error,
        "matching": matching,
        "warnings": warnings,
        "message": "Image validated successfully. Letter-like handwriting content was detected."
    }, image_rgb, gray, thresh
```

- [ ] **Step 3: Syntax-check (this sandbox has no cv2/pytesseract, so this is the only automated check available here)**

Run:
```bash
python3 -m py_compile backend/handwriting_analysis/api/app/services/image_validation_service.py
```
Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add backend/handwriting_analysis/api/app/services/image_validation_service.py
git commit -m "Score OCR output against target text with mirror detection in image validation"
```

- [ ] **Step 5: Manual smoke test (run on a machine with the full stack — opencv, tesseract-ocr binary, `requirements.txt` installed; NOT this sandbox)**

```bash
cd backend/handwriting_analysis/api
uvicorn app.main:app --reload --port 8003 &
curl -X POST "http://127.0.0.1:8003/predict/handwriting" \
  -F "image=@sample_b.png" \
  -F "task_type=letter_copy" \
  -F "target_text=b" \
  -F "difficulty_level=easy" \
  -F "age=5.5" \
  -F "native_language=Sinhala" \
  -F "assessment_language=English" \
  -F "school_type=urban_public" \
  -F "support_level=none" \
  -F "device_type=tablet_stylus" \
  -F "environment_noise_level=0.12" \
  -F "time_of_day=morning" \
  -F "strict_target_match=false"
```
Expected: response JSON's `validation.matching` object is present with `target_match_score`, `template_similarity_score`, `confusable_similarity_score`, `mirror_similarity_score`, `mirror_detected` keys, and no 500 error. Use whatever sample image is available locally if `sample_b.png` doesn't exist — the point is confirming the new `matching` block appears and the endpoint doesn't crash.

---

### Task 3: Wire the consistency guardrail into prediction

**Files:**
- Modify: `backend/handwriting_analysis/api/app/services/predict_service.py`

**Interfaces:**
- Consumes: `GUARDRAIL_MATCH_THRESHOLD`, `GUARDRAIL_CEILING` from `app.services.text_matching_service` (Task 1); `validation["matching"]["target_match_score"]` and `validation["matching"]["mirror_detected"]` from Task 2's `validate_image_upload` return value.
- Produces: the dict returned by `predict_handwriting_from_image(...)` gains `prediction.raw_model_probability` (float) and `prediction.consistency_guardrail_applied` (bool). `prediction.risk_probability` and `prediction.risk_level` keep their existing names but now reflect the post-guardrail value.

- [ ] **Step 1: Edit the imports**

In `backend/handwriting_analysis/api/app/services/predict_service.py`, replace:

```python
from fastapi import HTTPException
from app.services.model_loader import get_model
from app.services.image_validation_service import validate_image_upload
from app.services.feature_extraction_service import extract_handwriting_features
from app.utils.risk_utils import probability_to_risk_level, reliability_from_warnings
```

with:

```python
from fastapi import HTTPException
from app.services.model_loader import get_model
from app.services.image_validation_service import validate_image_upload
from app.services.feature_extraction_service import extract_handwriting_features
from app.services.text_matching_service import GUARDRAIL_MATCH_THRESHOLD, GUARDRAIL_CEILING
from app.utils.risk_utils import probability_to_risk_level, reliability_from_warnings
```

- [ ] **Step 2: Replace the prediction/guardrail block through the return statement**

Replace:

```python
    prediction = int(model.predict(feature_df)[0])
    probability = float(model.predict_proba(feature_df)[0][1])
    risk_level = probability_to_risk_level(probability)

    reliability = reliability_from_warnings(validation.get("warnings", []))

    return {
        "validation": validation,
        "quality": {
            "prediction_reliability": reliability,
            "warnings": validation.get("warnings", []),
            "note": "This is a prototype image feature extractor. Real handwritten-letter validation can be improved with a CNN or OCR model trained on child handwriting."
        },
        "features": features,
        "prediction": {
            "handwriting_risk_label_binary": prediction,
            "risk_probability": round(probability, 4),
            "risk_level": risk_level
        }
    }
```

with:

```python
    prediction = int(model.predict(feature_df)[0])
    raw_model_probability = float(model.predict_proba(feature_df)[0][1])

    matching = validation.get("matching", {})
    target_match_score = matching.get("target_match_score", 0.0)
    mirror_detected = matching.get("mirror_detected", False)

    consistency_guardrail_applied = (
        target_match_score >= GUARDRAIL_MATCH_THRESHOLD and not mirror_detected
    )
    if consistency_guardrail_applied:
        risk_probability = min(raw_model_probability, GUARDRAIL_CEILING)
    else:
        risk_probability = raw_model_probability

    risk_level = probability_to_risk_level(risk_probability)

    reliability = reliability_from_warnings(validation.get("warnings", []))

    return {
        "validation": validation,
        "quality": {
            "prediction_reliability": reliability,
            "warnings": validation.get("warnings", []),
            "note": "This is a prototype image feature extractor. Real handwritten-letter validation can be improved with a CNN or OCR model trained on child handwriting."
        },
        "features": features,
        "prediction": {
            "handwriting_risk_label_binary": prediction,
            "raw_model_probability": round(raw_model_probability, 4),
            "risk_probability": round(risk_probability, 4),
            "risk_level": risk_level,
            "consistency_guardrail_applied": consistency_guardrail_applied
        }
    }
```

- [ ] **Step 3: Syntax-check (same sandbox limitation as Task 2)**

Run:
```bash
python3 -m py_compile backend/handwriting_analysis/api/app/services/predict_service.py
```
Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add backend/handwriting_analysis/api/app/services/predict_service.py
git commit -m "Add consistency guardrail reconciling model risk with target-match confidence"
```

- [ ] **Step 5: Manual smoke test (same full-stack machine as Task 2's Step 5)**

Reuse the running server from Task 2's smoke test (or restart it), and send the same request twice: once with an `image` that clearly matches `target_text` (expect `consistency_guardrail_applied: true` and `risk_probability <= 0.30` in the response, whatever `raw_model_probability` came out to), and once with an image that doesn't match (expect `consistency_guardrail_applied: false` and `risk_probability == raw_model_probability`). Confirm both `raw_model_probability` and `consistency_guardrail_applied` appear under `prediction` in the JSON response.

---

## Plan Self-Review Notes

- **Spec coverage:** `text_matching_service.py` (confusable groups, plain/confusable similarity, thresholds) → Task 1. Mirror detection via horizontal flip → Task 1 (`is_mirror_detected`) + Task 2 (flip + wiring). `strict_target_match`/`ocr_target_match` threshold change → Task 2 Step 2. `matching` response block → Task 2 Step 2. Guardrail + `raw_model_probability` + `consistency_guardrail_applied` → Task 3. `requirements-dev.txt` / no new runtime deps → Task 1 Step 1 / Global Constraints. All spec sections are covered.
- **Deviation from spec noted:** the spec described `template_similarity_score` as using `difflib.SequenceMatcher`; this plan instead computes it via the same weighted-edit-distance function as `confusable_similarity` (with `confusable_cost=1.0`), so the spec's stated invariant "`confusable_similarity_score` >= `template_similarity_score`" holds by construction rather than by coincidence between two different algorithms. Behavior (a normalized 0–1 string-similarity score) is unchanged from the spec's intent.
- **Placeholder scan:** none found — every step has real code or an exact command.
- **Type consistency:** `build_matching_result`/`empty_matching_result` return the same 5 keys everywhere they're referenced (Task 1 defines, Task 2 consumes and re-exposes under `validation["matching"]`, Task 3 reads `target_match_score`/`mirror_detected` from that same dict). `GUARDRAIL_MATCH_THRESHOLD`/`GUARDRAIL_CEILING`/`TARGET_MATCH_THRESHOLD` are defined once in Task 1 and only imported elsewhere.
