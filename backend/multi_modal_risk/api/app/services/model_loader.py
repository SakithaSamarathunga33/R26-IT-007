import os
import joblib

DIFFICULTY_MODEL_PATH = os.getenv("DIFFICULTY_MODEL_PATH", "ml_models/fusion_primary_difficulty_xgboost.pkl")
DIFFICULTY_ENCODER_PATH = os.getenv("DIFFICULTY_ENCODER_PATH", "ml_models/fusion_primary_difficulty_label_encoder.pkl")

difficulty_model = None
difficulty_encoder = None

def load_models():
    global difficulty_model, difficulty_encoder
    if os.path.exists(DIFFICULTY_MODEL_PATH):
        difficulty_model = joblib.load(DIFFICULTY_MODEL_PATH)
    if os.path.exists(DIFFICULTY_ENCODER_PATH):
        difficulty_encoder = joblib.load(DIFFICULTY_ENCODER_PATH)

def get_difficulty_model():
    return difficulty_model

def get_difficulty_encoder():
    return difficulty_encoder

def model_status():
    return {
        "weighted_rule_based_fusion": "available",
        "primary_difficulty_model_loaded": difficulty_model is not None,
        "primary_difficulty_encoder_loaded": difficulty_encoder is not None
    }
