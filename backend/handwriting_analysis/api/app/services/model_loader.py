import os
import joblib

MODEL_PATH = os.getenv("HANDWRITING_MODEL_PATH", "ml_models/handwriting_logistic_regression.pkl")
MODEL_VERSION = os.path.splitext(os.path.basename(MODEL_PATH))[0] + "_v1"
handwriting_model = None

def load_model():
    global handwriting_model
    if os.path.exists(MODEL_PATH):
        handwriting_model = joblib.load(MODEL_PATH)

def get_model():
    return handwriting_model

def model_loaded():
    return handwriting_model is not None
