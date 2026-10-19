# Loads the machine-learning files for fusion: the XGBoost primary-difficulty model, its label encoder, and the logistic fusion model (JSON).
# Called by routes/predict_routes.py and services/predict_service.py at startup, and read by services/fusion_service.py.
# Files live in backend/multi_modal_risk/ml_models; the paths can be overridden with the environment variables below.
import json
import os
import joblib

# Path to the XGBoost model that predicts the main difficulty area.
DIFFICULTY_MODEL_PATH = os.getenv("DIFFICULTY_MODEL_PATH", "ml_models/fusion_primary_difficulty_xgboost.pkl")
# Path to the label encoder that turns the model's number output back into a difficulty name.
DIFFICULTY_ENCODER_PATH = os.getenv("DIFFICULTY_ENCODER_PATH", "ml_models/fusion_primary_difficulty_label_encoder.pkl")
# Reliability-aware logistic fusion, stored as plain JSON (coefficients only: no pickle, no sklearn version coupling).
FUSION_MODEL_PATH = os.getenv("FUSION_MODEL_PATH", "ml_models/fusion_reliability_lr_v1.json")

# Loaded objects; they stay None if their file is missing, and the code then uses the rule-based fallback.
difficulty_model = None
difficulty_encoder = None
fusion_model = None

# Loads whichever of the three model files exist (called once at startup).
def load_models():
    global difficulty_model, difficulty_encoder, fusion_model
    if os.path.exists(DIFFICULTY_MODEL_PATH):
        difficulty_model = joblib.load(DIFFICULTY_MODEL_PATH)
    if os.path.exists(DIFFICULTY_ENCODER_PATH):
        difficulty_encoder = joblib.load(DIFFICULTY_ENCODER_PATH)
    if os.path.exists(FUSION_MODEL_PATH):
        with open(FUSION_MODEL_PATH, encoding="utf-8") as f:
            fusion_model = json.load(f)

# Returns the XGBoost model (or None).
def get_difficulty_model():
    return difficulty_model

# Returns the label encoder (or None).
def get_difficulty_encoder():
    return difficulty_encoder

# Returns the logistic fusion model data (or None).
def get_fusion_model():
    return fusion_model

# Summary of what is loaded; shown by /health and /predict/fusion/schema.
def model_status():
    return {
        "reliability_weighted_rule_fusion": "available (fallback)",
        "reliability_aware_fusion_model_loaded": fusion_model is not None,
        "primary_difficulty_model_loaded": difficulty_model is not None,
        "primary_difficulty_encoder_loaded": difficulty_encoder is not None
    }
