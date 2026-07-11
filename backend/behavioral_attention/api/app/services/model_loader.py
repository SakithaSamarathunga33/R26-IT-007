import os
import joblib

MODEL_PATH = os.getenv("BEHAVIOR_MODEL_PATH", "ml_models/behavior_logistic_regression.pkl")
behavior_model = None

def load_model():
    global behavior_model
    if os.path.exists(MODEL_PATH):
        behavior_model = joblib.load(MODEL_PATH)

def get_model():
    return behavior_model

def model_loaded():
    return behavior_model is not None
