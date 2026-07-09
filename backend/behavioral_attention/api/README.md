# Behavioural & Attention API

FastAPI service for behavioural attention risk prediction. Runs on **port 8002**.

## What this API does

1. Accepts structured behavioural features calculated from the mobile app's task interaction logs.
2. Validates the incoming JSON request.
3. Maps fields to the exact training feature columns.
4. Runs the pre-trained Logistic Regression model.
5. Returns a risk probability, risk level, and quality metadata.

## Model

**`behavior_logistic_regression.pkl`** — Selected from model comparison experiments.

Performance:
- Accuracy: 0.9842
- Recall: 0.9822
- F1-score: 0.9808
- ROC-AUC: 0.9992

Place the model file at:

```
backend/behavioral_attention/api/behavior_logistic_regression.pkl
```

## Endpoint

```
POST /predict/behavior
```

Request type: `application/json`

The mobile app calculates these features from task event logs and sends them in the request body:

| Feature | Description |
|---------|-------------|
| `response_latency` | Time between task display and first interaction (ms) |
| `task_duration` | Total time to complete the task (ms) |
| `retry_count` | Number of retries |
| `focus_loss_count` | Number of detected focus-loss events |
| `engagement_score` | Computed engagement metric (0–1) |
| `attention_drop_flag` | 1 if attention drop detected, else 0 |
| `interaction_consistency_score` | Consistency of interaction timing (0–1) |
| `hint_count` | Number of hints used |
| `task_type` | Task identifier string |
| `age` | Child's age |
| `difficulty_level` | `"easy"` / `"medium"` / `"hard"` |

### Response fields

| Field | Description |
|-------|-------------|
| `risk_probability` | Float 0–1 |
| `risk_level` | `"low"` / `"medium"` / `"high"` |
| `quality.prediction_reliability` | `"low"` / `"medium"` / `"high"` |
| `features_used` | Feature values as received |

## Health check

```
GET /health
```

## Run locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

Swagger UI: http://127.0.0.1:8002/docs

## Docker (via docker-compose)

```bash
docker compose up --build behavioral_api
```

## Note

This service does not process audio or images. All features are computed on the mobile side from raw activity event logs and sent as structured JSON.
