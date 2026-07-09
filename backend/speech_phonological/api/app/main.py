from fastapi import FastAPI
from app.routes.predict_routes import router as predict_router

app = FastAPI(
    title="Speech Logistic Regression API",
    version="1.0.0",
    description="Speech & Phonological Screening backend using selected Logistic Regression model"
)

app.include_router(predict_router)

@app.get("/health")
def health():
    from app.services.model_loader import model_loaded
    return {
        "status": "ok",
        "model_loaded": model_loaded()
    }
