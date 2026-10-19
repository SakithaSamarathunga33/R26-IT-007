# Speech-to-text using faster-whisper. Called by routes/predict_routes.py to check the child said the target word.
# Optional: if Whisper cannot load, transcription is skipped (returns None) and the rest still works.
import io
import logging
import os
import tempfile

logger = logging.getLogger("speech.transcription")

# Whisper model cache; loaded lazily on first use. _model_load_failed stops us retrying a failed load on every request.
_model = None
_model_load_failed = False

# Maps language names sent by the app (e.g. 'sinhala') to Whisper language codes.
_LANGUAGE_NAME_TO_CODE = {
    "english": "en",
    "sinhala": "si",
    "tamil": "ta",
    "hindi": "hi",
    "spanish": "es",
    "french": "fr",
    "german": "de",
    "chinese": "zh",
    "mandarin": "zh",
    "japanese": "ja",
    "korean": "ko",
    "arabic": "ar",
    "russian": "ru",
    "portuguese": "pt",
    "italian": "it",
    "dutch": "nl",
    "turkish": "tr",
    "urdu": "ur",
    "bengali": "bn",
}


# Convert a language name/code to a Whisper code; None means let Whisper auto-detect.
def _normalize_language(lang: str | None) -> str | None:
    if not lang:
        return None
    key = lang.strip().lower()
    if not key:
        return None
    if key in _LANGUAGE_NAME_TO_CODE:
        return _LANGUAGE_NAME_TO_CODE[key]
    if len(key) == 2:
        return key
    logger.warning("Unknown language %r, falling back to auto-detect", lang)
    return None


# Load the Whisper model on first use. Size and compute type come from WHISPER_MODEL_SIZE / WHISPER_COMPUTE_TYPE (default base / int8, CPU).
def _get_model():
    global _model, _model_load_failed
    if _model is not None or _model_load_failed:
        return _model
    try:
        from faster_whisper import WhisperModel
        size = os.getenv("WHISPER_MODEL_SIZE", "base")
        compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
        logger.info("Loading Whisper model size=%s compute_type=%s", size, compute_type)
        _model = WhisperModel(size, device="cpu", compute_type=compute_type)
    except Exception as exc:
        _model_load_failed = True
        logger.warning("Whisper model unavailable, transcription disabled: %s", exc)
    return _model


def transcribe_wav_bytes(file_bytes: bytes, language: str | None = None) -> str | None:
    """Spoken text ("" = nothing heard), or None when transcription is unavailable/failed."""
    model = _get_model()
    if model is None:
        return None
    lang_code = _normalize_language(language)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        # vad_filter skips silence; beam_size=1 keeps it fast.
        segments, _info = model.transcribe(
            tmp_path,
            language=lang_code,
            vad_filter=True,
            beam_size=1,
        )
        text = " ".join(seg.text.strip() for seg in segments).strip()
        return text
    except Exception as exc:
        logger.exception("Transcription failed: %s", exc)
        return None
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
