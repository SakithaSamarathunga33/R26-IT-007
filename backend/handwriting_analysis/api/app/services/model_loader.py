# Loads the trained handwriting model (.pkl) once and shares it. Used by routes/predict_routes.py (load),
# services/predict_service.py (get) and main.py /health (check).
import os
import joblib

# Model file location; override with the HANDWRITING_MODEL_PATH environment variable.
MODEL_PATH = os.getenv("HANDWRITING_MODEL_PATH", "ml_models/handwriting_logistic_regression.pkl")
# Version label (file name + '_v1') returned in every response so results can be traced to a model.
MODEL_VERSION = os.path.splitext(os.path.basename(MODEL_PATH))[0] + "_v1"
handwriting_model = None

# Read the model file into memory if it exists (otherwise stays None and predictions return 503).
def load_model():
    global handwriting_model
    if os.path.exists(MODEL_PATH):
        handwriting_model = joblib.load(MODEL_PATH)

# Return the loaded model (or None).
def get_model():
    return handwriting_model

# True if a model is loaded; used by /health.
def model_loaded():
    return handwriting_model is not None
