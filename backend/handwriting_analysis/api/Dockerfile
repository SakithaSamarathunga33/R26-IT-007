# Builds the handwriting API image. Started by docker-compose.yml (handwriting_api); runs app.main:app with uvicorn.
FROM python:3.11-slim

WORKDIR /app

# tesseract-ocr is the OCR engine used by image_validation_service; libgl1/libglib2.0-0 are needed by OpenCV.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
