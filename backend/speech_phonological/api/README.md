# Speech & Phonological API

FastAPI service for speech-based dyslexia risk prediction. Runs on **port 8001**.

## What this API does

1. Accepts a WAV audio file recorded during a speech task.
2. Trims leading/trailing silence and normalises amplitude.
3. Extracts acoustic features: MFCCs, RMS energy, zero-crossing rate, phoneme error rate proxy.
4. Scales features to match the training distribution.
5. Runs the pre-trained Logistic Regression model.
6. Returns a risk probability, risk level, quality indicators, and prediction reliability.

## Model

**`speech_logistic_regression.pkl`** — Logistic Regression trained on synthetic speech features.

Place the model file at:

```
backend/speech_phonological/api/speech_logistic_regression.pkl
```

## Endpoint

```
POST /predict/speech
```

Request type: `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `audio` | file | WAV audio recording |
| `task_type` | string | Speech task identifier |
| `target_text` | string | Expected spoken text |
| `age` | int | Child's age |
| `native_language` | string | e.g. `"english"` |
| `assessment_language` | string | e.g. `"english"` |
| `difficulty_level` | string | `"easy"` / `"medium"` / `"hard"` |
| `retry_count` | int | Number of recording retries |
| `recording_duration_sec` | float | Duration of the recording |

### Response fields

| Field | Description |
|-------|-------------|
| `risk_probability` | Float 0–1 |
| `risk_level` | `"low"` / `"medium"` / `"high"` |
| `quality.prediction_reliability` | `"low"` / `"medium"` / `"high"` |
| `quality.warnings` | List of warning strings |
| `features` | Extracted acoustic feature values |

## Health check

```
GET /health
```

## Run locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Swagger UI: http://127.0.0.1:8001/docs

## Docker (via docker-compose)

```bash
docker compose up --build speech_api
```

## Important limitation

This is a prototype. The API estimates phonological risk from acoustic properties — it does not perform true ASR or phoneme alignment. For higher accuracy, integrate an ASR engine and retrain using features extracted by the same pipeline.
