# Handwriting Analysis API

FastAPI service for handwriting-based dyslexia risk prediction. Runs on **port 8003**.

## What this API does

1. Accepts a handwriting image (from the in-app canvas or a photo).
2. Validates the image file type and size.
3. Runs a computer vision heuristic check to confirm the image contains letter-like content.
4. Optionally validates text content via OCR (Tesseract).
5. Extracts handwriting features: stroke width, spacing, slant, pressure proxy, letter size variance, etc.
6. Maps extracted values to the exact training feature columns.
7. Runs the pre-trained Logistic Regression model.
8. Returns a risk probability, risk level, and reliability status.

## Model

**`handwriting_logistic_regression.pkl`** — Selected from model comparison experiments.

Performance:
- Accuracy: 0.9875
- Precision: 0.9960
- F1-score: 0.9885
- ROC-AUC: 0.9996

Place the model file at:

```
backend/handwriting_analysis/api/handwriting_logistic_regression.pkl
```

## Endpoint

```
POST /predict/handwriting
```

Request type: `multipart/form-data`

### Required fields

| Field | Type | Description |
|-------|------|-------------|
| `image` | file | Handwriting image (PNG / JPEG) |
| `task_type` | string | Task identifier |
| `target_text` | string | Text the child was asked to write |
| `difficulty_level` | string | `"easy"` / `"medium"` / `"hard"` |
| `age` | int | Child's age |
| `native_language` | string | e.g. `"english"` |
| `assessment_language` | string | e.g. `"english"` |
| `school_type` | string | e.g. `"mainstream"` |
| `support_level` | string | Level of learning support |
| `device_type` | string | `"tablet"` / `"phone"` |
| `environment_noise_level` | string | `"low"` / `"medium"` / `"high"` |
| `time_of_day` | string | `"morning"` / `"afternoon"` / `"evening"` |

### Optional fields

| Field | Type | Description |
|-------|------|-------------|
| `writing_duration_sec` | float | Time taken to complete the writing task |
| `retry_count` | int | Number of retries |
| `task_completion_status` | string | `"complete"` / `"partial"` |
| `self_correction_flag` | int | 1 if self-correction detected |
| `strict_target_match` | bool | Enables strict OCR text matching |

### Response fields

| Field | Description |
|-------|-------------|
| `risk_probability` | Float 0–1 |
| `risk_level` | `"low"` / `"medium"` / `"high"` |
| `quality.prediction_reliability` | `"low"` / `"medium"` / `"high"` |
| `quality.warnings` | Validation warning messages |
| `features` | Extracted handwriting feature values |

## Image validation layers

1. **Computer vision heuristic** — checks foreground ratio, connected components, contour count, bounding box area, and letter-like component count.
2. **OCR (optional)** — Tesseract attempts to read text and compare against `target_text`. Results carry a reliability flag since children's handwriting can confuse OCR.

## Health check

```
GET /health
```

## Run locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003
```

Swagger UI: http://127.0.0.1:8003/docs

## Docker (via docker-compose)

```bash
docker compose up --build handwriting_api
```

## Input modes

The mobile app supports two input modes for handwriting capture:

- **Canvas** — child draws directly on screen; the canvas is captured as a PNG via `react-native-view-shot`
- **Photo** — child writes on paper and photographs it via `expo-image-picker`

Both modes produce an image file sent to this endpoint.
