# Container recipe for the Multi-Modal Fusion API (the service mobile/src/services/fusionService.ts calls).
# Installs requirements.txt, copies the app code and starts uvicorn on $PORT (default 8000).
# Note: ml_models is not copied here, so the model files must be added or the *_MODEL_PATH variables set;
# otherwise the rule-based fallbacks are used.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
