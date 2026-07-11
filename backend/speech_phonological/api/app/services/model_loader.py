import os
import joblib

MODEL_PATH = os.getenv("SPEECH_MODEL_PATH", "ml_models/speech_logistic_regression.pkl")
speech_model = None

def load_model():
    global speech_model
    if os.path.exists(MODEL_PATH):
        speech_model = joblib.load(MODEL_PATH)

def get_model():
    return speech_model

def model_loaded():
    return speech_model is not None
