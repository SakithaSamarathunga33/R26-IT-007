from fastapi import HTTPException, UploadFile
import soundfile as sf
import io
import subprocess

MAX_FILE_SIZE_MB = 15
ALLOWED_EXTENSIONS = {".wav", ".m4a", ".aac", ".3gp", ".mp4", ".webm"}


def convert_to_wav_bytes(content: bytes, filename: str) -> bytes:
    """Transcode a mobile-recorded upload (Android can only produce AAC/M4A, never WAV) to
    16kHz mono WAV so the rest of the pipeline (soundfile, librosa, faster-whisper) can keep
    assuming real WAV input."""
    ext = "." + filename.split(".")[-1].lower() if filename and "." in filename else ""
    if ext == ".wav":
        return content
    try:
        proc = subprocess.run(
            ["ffmpeg", "-y", "-i", "pipe:0", "-ar", "16000", "-ac", "1", "-f", "wav", "pipe:1"],
            input=content, capture_output=True, timeout=30, check=True,
        )
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        raise HTTPException(status_code=400, detail="Could not decode audio file. Please re-record.")
    return proc.stdout


def validate_wav_upload(file: UploadFile, content: bytes):
    filename = file.filename or "uploaded.wav"
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only .wav files are supported.")

    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max allowed size is {MAX_FILE_SIZE_MB} MB."
        )

    try:
        audio_buf = io.BytesIO(content)
        data, sr = sf.read(audio_buf, always_2d=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid WAV file: {str(e)}")

    if sr <= 0 or data.size == 0:
        raise HTTPException(status_code=400, detail="Invalid audio content.")

    duration_sec = data.shape[0] / sr
    channels = data.shape[1]

    if duration_sec < 0.2:
        raise HTTPException(status_code=400, detail="Audio is too short.")
    if duration_sec > 20:
        raise HTTPException(status_code=400, detail="Audio is too long. Maximum allowed duration is 20 seconds.")

    return {
        "valid": True,
        "filename": filename,
        "content_type": file.content_type,
        "sample_rate": int(sr),
        "duration_sec": round(float(duration_sec), 4),
        "channels": int(channels),
        "message": "WAV file validated successfully."
    }
