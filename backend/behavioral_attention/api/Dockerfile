# Build context is backend/behavioral_attention so the model in ml_models/ ships with the image:
#   docker build -f api/Dockerfile backend/behavioral_attention
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV BEHAVIOR_MODEL_PATH=/app/ml_models/behavior_logistic_regression.pkl

WORKDIR /app

COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api/app ./app
COPY ml_models ./ml_models

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
