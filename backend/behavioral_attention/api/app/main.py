# Entry point of the Behavioral & Attention API (FastAPI app, run with uvicorn app.main:app).
# Registers the /predict routes and a /health check.
# Called by: the mobile app (mobile/src/config/apiConfig.ts -> behavior URL) and by the Dockerfile CMD.
from fastapi import FastAPI
from app.routes.predict_routes import router as predict_router

app = FastAPI(
    title="Behavioral & Attention Monitoring API",
    version="1.0.0",
    description="Behavioral dyslexia-risk prediction API using selected Logistic Regression model"
)

app.include_router(predict_router)

# Health check used by hosting/monitoring: says the API is up and whether the ML model file was found.
@app.get("/health")
def health():
    from app.services.model_loader import model_loaded
    return {
        "status": "ok",
        "model_loaded": model_loaded()
    }
