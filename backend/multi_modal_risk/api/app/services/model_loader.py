import json
import os
import joblib

DIFFICULTY_MODEL_PATH = os.getenv("DIFFICULTY_MODEL_PATH", "ml_models/fusion_primary_difficulty_xgboost.pkl")
DIFFICULTY_ENCODER_PATH = os.getenv("DIFFICULTY_ENCODER_PATH", "ml_models/fusion_primary_difficulty_label_encoder.pkl")
# Reliability-aware logistic fusion, stored as plain JSON (coefficients only: no pickle, no sklearn version coupling).
FUSION_MODEL_PATH = os.getenv("FUSION_MODEL_PATH", "ml_models/fusion_reliability_lr_v1.json")

difficulty_model = None
difficulty_encoder = None
fusion_model = None

def load_models():
    global difficulty_model, difficulty_encoder, fusion_model
    if os.path.exists(DIFFICULTY_MODEL_PATH):
        difficulty_model = joblib.load(DIFFICULTY_MODEL_PATH)
    if os.path.exists(DIFFICULTY_ENCODER_PATH):
        difficulty_encoder = joblib.load(DIFFICULTY_ENCODER_PATH)
    if os.path.exists(FUSION_MODEL_PATH):
        with open(FUSION_MODEL_PATH, encoding="utf-8") as f:
            fusion_model = json.load(f)

def get_difficulty_model():
    return difficulty_model

def get_difficulty_encoder():
    return difficulty_encoder

def get_fusion_model():
    return fusion_model

def model_status():
    return {
        "reliability_weighted_rule_fusion": "available (fallback)",
        "reliability_aware_fusion_model_loaded": fusion_model is not None,
        "primary_difficulty_model_loaded": difficulty_model is not None,
        "primary_difficulty_encoder_loaded": difficulty_encoder is not None
    }
