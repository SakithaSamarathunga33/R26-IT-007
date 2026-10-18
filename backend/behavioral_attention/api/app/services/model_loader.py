import os
from pathlib import Path
import joblib

MODEL_VERSION = "behavior_logistic_regression_v1"
# Default resolves to backend/behavioral_attention/ml_models regardless of the working directory; the Docker image sets BEHAVIOR_MODEL_PATH.
MODEL_PATH = os.getenv(
    "BEHAVIOR_MODEL_PATH",
    str(Path(__file__).resolve().parents[3] / "ml_models" / "behavior_logistic_regression.pkl")
)
behavior_model = None

def load_model():
    global behavior_model
    if os.path.exists(MODEL_PATH):
        behavior_model = joblib.load(MODEL_PATH)

def get_model():
    return behavior_model

def model_loaded():
    return behavior_model is not None
