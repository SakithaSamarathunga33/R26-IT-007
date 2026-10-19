# HTTP routes for handwriting prediction. The mobile app (mobile/src/config/apiConfig.ts ->
# HandwritingReviewScreen) POSTs a handwriting image plus child info here, and this file hands it to
# services/predict_service.py. The multi_modal_risk API later fuses the result.
from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional

from app.services.model_loader import load_model
from app.services.predict_service import predict_handwriting_from_image
from app.schemas.feature_columns import FEATURE_COLUMNS

router = APIRouter(prefix="/predict", tags=["Handwriting Prediction"])

# Load the trained model once when the server starts.
load_model()

# Lists the model's input columns (from schemas/feature_columns.py) so callers can see what the model expects.
@router.get("/handwriting/schema")
def get_handwriting_schema():
    return {
        "required_model_features": FEATURE_COLUMNS,
        "message": "POST /predict/handwriting expects a handwriting image and metadata fields."
    }

# Main endpoint: receives the image and form fields, reads the image bytes, and returns the risk prediction.
# strict_target_match=True makes the request fail if OCR cannot read the target text.
@router.post("/handwriting")
async def predict_handwriting(
    image: UploadFile = File(...),
    task_type: str = Form(...),
    target_text: str = Form(...),
    difficulty_level: str = Form(...),
    age: float = Form(...),
    native_language: str = Form(...),
    assessment_language: str = Form(...),
    school_type: str = Form(...),
    support_level: str = Form(...),
    device_type: str = Form(...),
    environment_noise_level: float = Form(...),
    time_of_day: str = Form(...),
    writing_duration_sec: Optional[float] = Form(None),
    retry_count: Optional[int] = Form(None),
    task_completion_status: Optional[int] = Form(1),
    self_correction_flag: Optional[int] = Form(0),
    strict_target_match: bool = Form(False),
):
    content = await image.read()

    return predict_handwriting_from_image(
        upload_file=image,
        file_bytes=content,
        task_type=task_type,
        target_text=target_text,
        difficulty_level=difficulty_level,
        age=age,
        native_language=native_language,
        assessment_language=assessment_language,
        school_type=school_type,
        support_level=support_level,
        device_type=device_type,
        environment_noise_level=environment_noise_level,
        time_of_day=time_of_day,
        writing_duration_sec=writing_duration_sec,
        retry_count=retry_count,
        task_completion_status=task_completion_status,
        self_correction_flag=self_correction_flag,
        strict_target_match=strict_target_match,
    )
