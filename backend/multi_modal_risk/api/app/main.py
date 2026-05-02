from fastapi import FastAPI
from app.routes.predict_routes import router as predict_router

app = FastAPI(
    title="Final Multi-Modal Fusion API",
    version="1.0.0",
    description="Fusion and therapy recommendation backend for the dyslexia screening system"
)
app.include_router(predict_router)

@app.get("/health")
def health():
    from app.services.model_loader import model_status
    return {"status": "ok", "models": model_status()}
