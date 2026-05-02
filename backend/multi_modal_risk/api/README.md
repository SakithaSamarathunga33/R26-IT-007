# Multi-Modal Fusion API

FastAPI service that combines all three module scores into a final dyslexia risk prediction and therapy recommendation. Runs on **port 8004**.

## What this API does

1. Accepts aggregated feature inputs from the speech, handwriting, and behaviour modules.
2. Computes a weighted fusion risk score.
3. Classifies the primary difficulty area (phonological, handwriting, or attention/behaviour).
4. Generates a personalised therapy recommendation based on the primary difficulty.
5. Returns the full assessment report including quality indicators.

## Fusion formula

```
overall_risk_score = 0.40 × speech_score + 0.35 × handwriting_score + 0.25 × behavior_score

score >= 0.35  →  at-risk
score <  0.35  →  low risk
```

Risk levels: `low` / `medium` / `high`

## Primary difficulty classification

If `fusion_primary_difficulty_xgboost.pkl` and `fusion_primary_difficulty_label_encoder.pkl` are present, the XGBoost model is used to classify the primary difficulty area. Otherwise the API falls back to a rule-based method (highest individual module score).

Place optional model files at:

```
backend/multi_modal_risk/api/fusion_primary_difficulty_xgboost.pkl
backend/multi_modal_risk/api/fusion_primary_difficulty_label_encoder.pkl
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/predict/fusion/schema` | Returns expected request schema |
| `POST` | `/predict/fusion` | Runs the full fusion analysis |

### POST /predict/fusion

Request type: `application/json`

Key input fields:

| Field | Description |
|-------|-------------|
| `speech_score` | Risk probability from the speech API (0–1) |
| `handwriting_score` | Risk probability from the handwriting API (0–1) |
| `behavior_score` | Risk probability from the behaviour API (0–1) |
| `child_id` | User / child identifier |
| `session_id` | Session identifier |
| `speech_reliability` | `"low"` / `"medium"` / `"high"` |
| `handwriting_reliability` | `"low"` / `"medium"` / `"high"` |
| `behavior_reliability` | `"low"` / `"medium"` / `"high"` |

### Response fields

| Field | Description |
|-------|-------------|
| `final_prediction.final_dyslexia_risk_level` | `"low"` / `"medium"` / `"high"` |
| `final_prediction.overall_risk_score` | Weighted fusion score (0–1) |
| `final_prediction.fusion_strategy` | `"weighted_rule_based_fusion"` |
| `final_prediction.model_version` | API model version |
| `primary_difficulty.primary_difficulty_label` | `"phonological_processing"` / `"handwriting"` / `"attention_behavior"` |
| `primary_difficulty.confidence` | Model confidence (0–1) |
| `primary_difficulty.method` | `"xgboost_primary_difficulty_model"` or `"rule_based"` |
| `secondary_difficulty_label` | Secondary difficulty area (if detected) |
| `therapy_recommendation` | Personalised therapy plan object |
| `quality.fusion_reliability` | Overall fusion reliability |
| `quality.warnings` | List of quality warning strings |
| `fusion_features` | All module scores used in fusion |
| `database_save_payload` | Suggested values for Firestore storage |

## Firestore collections

The mobile app (`fusionService.ts`) saves the response to these Firestore collections:

| Collection | Content |
|------------|---------|
| `fusion_predictions` | Final prediction and risk scores |
| `therapy_recommendations` | Therapy plan details |
| `assessment_sessions` | Session completion metadata |

## Health check

```
GET /health
```

## Run locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8004
```

Swagger UI: http://127.0.0.1:8004/docs

## Docker (via docker-compose)

```bash
docker compose up --build multimodal_api
```

## Mobile integration

The mobile app (`fusionService.ts`) orchestrates the full fusion flow:

1. Reads individual module results from Firestore.
2. Builds the fusion request payload.
3. Calls `POST /predict/fusion`.
4. Saves the full response to Firestore.
5. Navigates through the results screens: Risk Summary → Difficulty → Therapy → Full Report.

The Final Analysis button on the dashboard is locked until all three modules (`speechDone`, `handwritingDone`, `behaviourDone`) are marked complete in the session.
