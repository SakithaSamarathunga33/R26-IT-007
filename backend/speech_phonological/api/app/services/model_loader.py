# Loads the trained speech model (.pkl) once and shares it. Used by routes/predict_routes.py (load, version),
# services/predict_service.py (get) and main.py /health (check).
import os
import joblib

# Model file location; override with the SPEECH_MODEL_PATH environment variable.
MODEL_PATH = os.getenv("SPEECH_MODEL_PATH", "ml_models/speech_logistic_regression.pkl")
# Version of the shipped ml_models/speech_logistic_regression.pkl.
MODEL_VERSION = "speech_logistic_regression_v1"
speech_model = None

# Read the model file into memory if it exists (otherwise stays None and predictions return 503).
def load_model():
    global speech_model
    if os.path.exists(MODEL_PATH):
        speech_model = joblib.load(MODEL_PATH)

# Return the loaded model (or None).
def get_model():
    return speech_model

# True if a model is loaded; used by /health.
def model_loaded():
    return speech_model is not None
