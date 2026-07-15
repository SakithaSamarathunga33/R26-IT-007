from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional

from app.services.model_loader import load_model
from app.services.predict_service import predict_handwriting_from_image
from app.schemas.feature_columns import FEATURE_COLUMNS

router = APIRouter(prefix="/predict", tags=["Handwriting Prediction"])

load_model()

@router.get("/handwriting/schema")
def get_handwriting_schema():
    return {
        "required_model_features": FEATURE_COLUMNS,
        "message": "POST /predict/handwriting expects a handwriting image and metadata fields."
    }

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
