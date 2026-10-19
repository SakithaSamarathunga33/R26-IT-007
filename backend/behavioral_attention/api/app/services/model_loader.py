# Loads the trained Logistic Regression model file (.pkl) from disk once and keeps it in memory.
# Called by routes/predict_routes.py at startup, by predict_service.py for each request, and by /health.
import os
from pathlib import Path
import joblib

# Name of the model version, returned in every prediction response.
MODEL_VERSION = "behavior_logistic_regression_v1"
# Default resolves to backend/behavioral_attention/ml_models regardless of the working directory; the Docker image sets BEHAVIOR_MODEL_PATH.
MODEL_PATH = os.getenv(
    "BEHAVIOR_MODEL_PATH",
    str(Path(__file__).resolve().parents[3] / "ml_models" / "behavior_logistic_regression.pkl")
)
# Holds the loaded model; stays None if the file is not found (requests then get a 503).
behavior_model = None

# Reads the model file into memory if it exists (called once at startup).
def load_model():
    global behavior_model
    if os.path.exists(MODEL_PATH):
        behavior_model = joblib.load(MODEL_PATH)

# Gives other files access to the loaded model.
def get_model():
    return behavior_model

# True if the model is loaded; used by /health.
def model_loaded():
    return behavior_model is not None
