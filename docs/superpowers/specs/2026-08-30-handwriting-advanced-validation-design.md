# Handwriting analysis: advanced validation design

## Context

The handwriting_analysis service running on Azure returns a materially
richer response than what's in this repo: `target_match_score`,
`template_similarity_score`, `mirror_similarity_score`,
`confusable_similarity_score`, `raw_model_probability`, and
`consistency_guardrail_applied`. That code was never committed to this
repository — confirmed by searching every local and remote branch, every
dangling commit, and every dangling blob in the git object store for those
field names, with zero matches. It is not recoverable from this repo and
there is no Azure CLI/credentials available in this environment to pull the
live container. This spec defines a new implementation, built from scratch
in this repo, that reproduces the same *behavior* (rich scoring, a
guardrail that can pull a clean match's risk down) — it will not be
byte-identical to whatever Azure is actually running.

## Goals

- Make OCR-based target-text matching tolerant of common OCR/handwriting
  confusions instead of requiring an exact substring match.
- Detect horizontally mirrored/reversed writing, a classic dyslexia
  screening signal.
- Reconcile the raw ML model probability against strong external evidence
  (a clean, non-mirrored match) via a guardrail, while keeping the raw
  model output visible for transparency.
- Stay additive to the existing API response so the mobile app keeps
  working unmodified.

## Non-goals

- Recovering or reverse-engineering the actual Azure container/code.
- Per-letter image-template matching (image correlation against rendered
  glyphs) — explicitly deferred; OCR + fuzzy scoring covers the target
  matching requirement.
- Per-letter reversal-pair detection (b/d, p/q segmentation) — whole-image
  flip comparison covers the mirror detection requirement.
- New third-party dependencies — everything is built on
  `opencv-python-headless`, `pytesseract`, and the stdlib, all already in
  `requirements.txt`.

## Design

### New module: `text_matching_service.py`

Location: `backend/handwriting_analysis/api/app/services/text_matching_service.py`

Pure string functions, no image or FastAPI dependencies:

- `CONFUSABLE_GROUPS`: a list of character-equivalence groups covering
  print/OCR confusions (`0`/`O`, `1`/`l`/`I`, `5`/`S`, `8`/`B`, `2`/`Z`) and
  child-handwriting reversal confusions (`b`/`d`, `p`/`q`, `m`/`n`, `u`/`v`,
  `g`/`q`), case-insensitive.
- `plain_similarity(a, b) -> float`: normalized similarity in `[0, 1]`
  using stdlib `difflib.SequenceMatcher` ratio on the cleaned
  (alphanumeric-only, lowercased) strings. This is `template_similarity_score`.
- `confusable_similarity(a, b) -> float`: normalized similarity in
  `[0, 1]` from a weighted Levenshtein edit distance where substituting a
  character for one in the same confusable group costs `0.3` instead of
  `1.0`; insertions/deletions cost `1.0`. Normalized as
  `1 - (weighted_distance / max(len(a), len(b), 1))`, clamped to
  `[0, 1]`. This is `confusable_similarity_score`, and by construction
  `confusable_similarity(a, b) >= plain_similarity(a, b)` always holds
  (the weighted-cost path is never more expensive than the unweighted
  one), so it also serves as `target_match_score`.

### `image_validation_service.py` changes

After the existing OCR call on the upright image:

1. Flip the already-computed grayscale image horizontally:
   `mirror_gray = cv2.flip(gray, 1)`.
2. If OCR is available, run the same `pytesseract.image_to_string` call on
   `mirror_gray` to get `ocr_text_mirror`.
3. Compute, against `target_text`:
   - `target_match_score = confusable_similarity(ocr_text, target_text)`
   - `template_similarity_score = plain_similarity(ocr_text, target_text)`
   - `confusable_similarity_score = target_match_score` (same value,
     reported separately for transparency/debugging per the Azure field
     set)
   - `mirror_similarity_score = confusable_similarity(ocr_text_mirror, target_text)`
4. `mirror_detected = mirror_similarity_score >= 0.75 and
   (mirror_similarity_score - target_match_score) >= 0.15`
5. `ocr_target_match` becomes `target_match_score >= 0.6` (was: exact
   substring). `strict_target_match` now raises its 400 when
   `target_match_score < 0.6` (was: when `ocr_target_match` false via
   substring).
6. When OCR is unavailable, all four scores are `0.0` and
   `mirror_detected` is `False` — behavior degrades the same way the
   existing `ocr_available` warning already communicates.
7. New warning: if `mirror_detected`, append `"Writing appears to be
   mirrored/reversed."` to `warnings`.
8. Response dict gains a `matching` block: `{target_match_score,
   template_similarity_score, confusable_similarity_score,
   mirror_similarity_score, mirror_detected}`. Existing fields
   (`ocr_text`, `ocr_target_match`, etc.) are unchanged in shape.

### `predict_service.py` changes

- `raw_model_probability = probability` (the existing, unmodified
  `model.predict_proba` output) — always reported.
- Guardrail rule: if `validation["matching"]["target_match_score"] >= 0.9`
  and `validation["matching"]["mirror_detected"]` is `False`:
  `risk_probability = min(raw_model_probability, 0.30)` and
  `consistency_guardrail_applied = True`. Otherwise `risk_probability =
  raw_model_probability` and `consistency_guardrail_applied = False`.
- `risk_level = probability_to_risk_level(risk_probability)` (computed
  from the final, possibly-adjusted probability — unchanged call site,
  just now fed the post-guardrail value).
- Response `prediction` block gains `raw_model_probability` and
  `consistency_guardrail_applied`; `risk_probability` and `risk_level`
  keep their existing names and meaning (final result), so the mobile app
  needs no changes. Response gains the `matching` block from
  `image_validation_service`, passed through under `validation.matching`.

### Thresholds (module-level constants, not user-configurable)

| Constant | Value | Meaning |
|---|---|---|
| `CONFUSABLE_SUBSTITUTION_COST` | 0.3 | cost of substituting within a confusable group |
| `TARGET_MATCH_THRESHOLD` | 0.6 | `ocr_target_match` / `strict_target_match` pass bar |
| `MIRROR_MIN_SCORE` | 0.75 | minimum flipped-match score to consider mirroring |
| `MIRROR_MARGIN` | 0.15 | how much better the flip must score than upright |
| `GUARDRAIL_MATCH_THRESHOLD` | 0.9 | match score required to trigger the guardrail |
| `GUARDRAIL_CEILING` | 0.30 | cap applied to `risk_probability` when guardrail fires |

## Testing

No existing test suite in this service. Add
`backend/handwriting_analysis/api/tests/test_text_matching_service.py`
with plain `pytest` unit tests for `plain_similarity` and
`confusable_similarity`: exact match (1.0), confusable substitution
scoring higher than an unrelated substitution, completely unrelated
strings scoring low, and the mirror-margin arithmetic
(`confusable_similarity` on a flipped-vs-target pair exceeding the
upright pair by the configured margin). No FastAPI test client — there's
no existing pattern for one in this service, so image-pipeline behavior
is exercised through the pure-function layer only.

## Rollout

Single-service, additive change. No new dependencies, no schema-breaking
changes, no migration. Implemented directly on the `vps` branch per
existing project workflow (this repo deploys `vps` independently of
`main`).
