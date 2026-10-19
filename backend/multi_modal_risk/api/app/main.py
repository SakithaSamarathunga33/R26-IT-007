# Entry point of the Multi-Modal Fusion API (run with uvicorn app.main:app).
# This service combines the speech, handwriting and behaviour results into one final dyslexia-risk result
# plus a therapy recommendation. Called by the mobile app (mobile/src/services/fusionService.ts).
from fastapi import FastAPI
from app.routes.predict_routes import router as predict_router

app = FastAPI(
    title="Final Multi-Modal Fusion API",
    version="1.0.0",
    description="Fusion and therapy recommendation backend for the dyslexia screening system"
)
app.include_router(predict_router)

# Health check: API is up, and which ML models were found on disk.
@app.get("/health")
def health():
    from app.services.model_loader import model_status
    return {"status": "ok", "models": model_status()}
