import io
import numpy as np
import pandas as pd
import librosa

from app.utils.task_utils import count_syllables_simple, safe_word_length

MODEL_FEATURE_COLUMNS = [
    "task_type", "target_word", "target_phoneme_seq", "word_length", "syllable_count",
    "difficulty_level", "linguistic_focus", "age", "gender", "native_language",
    "assessment_language", "recording_device_type", "environment_noise_level",
    "time_of_day", "duration_sec", "response_latency_sec", "speech_rate",
    "articulation_rate", "pause_count", "avg_pause_duration", "max_pause_duration",
    "energy_mean", "energy_std", "zcr_mean", "zcr_std", "pitch_mean", "pitch_std",
    "pitch_min", "pitch_max", "jitter", "shimmer", "hnr", "formant_f1_mean",
    "formant_f2_mean", "formant_f3_mean",
    "mfcc_1_mean", "mfcc_2_mean", "mfcc_3_mean", "mfcc_4_mean", "mfcc_5_mean",
    "mfcc_6_mean", "mfcc_7_mean", "mfcc_8_mean", "mfcc_9_mean", "mfcc_10_mean",
    "mfcc_11_mean", "mfcc_12_mean", "mfcc_13_mean",
    "mfcc_1_std", "mfcc_2_std", "mfcc_3_std", "mfcc_4_std", "mfcc_5_std",
    "mfcc_6_std", "mfcc_7_std", "mfcc_8_std", "mfcc_9_std", "mfcc_10_std",
    "mfcc_11_std", "mfcc_12_std", "mfcc_13_std",
    "phoneme_match_ratio", "substitution_count", "deletion_count", "insertion_count",
    "distortion_count", "phoneme_error_rate", "initial_phoneme_correct",
    "final_phoneme_correct", "consonant_accuracy", "vowel_accuracy", "cluster_accuracy",
    "rhyme_accuracy", "syllable_accuracy", "stress_pattern_match",
    "pronunciation_confidence", "expected_vs_actual_edit_distance", "attempt_count",
    "self_correction_flag", "repetition_needed_flag", "task_completion_status",
    "prompt_replay_count", "attention_drop_flag", "hesitation_score",
    "consistency_score_across_repetitions", "pronunciation_score",
    "phonological_deficit_score"
]

def _load_trim_normalize(file_bytes: bytes):
    y_raw, sr = librosa.load(io.BytesIO(file_bytes), sr=16000, mono=True)
    raw_duration = len(y_raw) / sr if len(y_raw) else 0.0
    raw_peak = float(np.max(np.abs(y_raw))) if len(y_raw) else 0.0

    # Trim leading/trailing silence so silence is not treated as speech difficulty.
    y_trim, _ = librosa.effects.trim(y_raw, top_db=30)
    if len(y_trim) < int(0.15 * sr):
        y_trim = y_raw

    # Normalize amplitude so quiet recordings do not look abnormal to the synthetic model.
    peak = float(np.max(np.abs(y_trim))) if len(y_trim) else 0.0
    y_norm = y_trim / peak if peak > 0 else y_trim
    speech_duration = len(y_norm) / sr if len(y_norm) else raw_duration
    return y_raw, y_norm, sr, raw_duration, speech_duration, raw_peak

def _pause_features(y, sr):
    frame_length = 1024
    hop_length = 256
    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    threshold = max(0.0001, np.percentile(rms, 18) * 0.7)
    pause_frames = rms < threshold
    lengths = []
    cur = 0
    for p in pause_frames:
        if p:
            cur += 1
        elif cur:
            lengths.append(cur)
            cur = 0
    if cur:
        lengths.append(cur)
    min_pause_frames = max(1, int(0.06 * sr / hop_length))
    lengths = [x for x in lengths if x >= min_pause_frames]
    if not lengths:
        return 0, 0.0, 0.0
    pauses = [x * hop_length / sr for x in lengths]
    return len(lengths), float(np.mean(pauses)), float(np.max(pauses))

def _pitch_features(y, sr):
    try:
        f0, _, _ = librosa.pyin(y, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C7"))
        vals = f0[~np.isnan(f0)]
        if len(vals) == 0:
            return 180.0, 20.0, 160.0, 220.0
        return float(np.mean(vals)), float(np.std(vals)), float(np.min(vals)), float(np.max(vals))
    except Exception:
        return 180.0, 20.0, 160.0, 220.0

def _mfcc_features(y, sr):
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    data = {}
    for i in range(13):
        data[f"mfcc_{i + 1}_mean"] = float(np.clip(np.mean(mfcc[i]), -300, 120))
    for i in range(13):
        data[f"mfcc_{i + 1}_std"] = float(np.clip(np.std(mfcc[i]), 1, 60))
    return data

def _formant_like_features(y, sr):
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
    spectrum = np.mean(S, axis=1)
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    def peak(low, high, default):
        mask = (freqs >= low) & (freqs <= high)
        if not np.any(mask):
            return default
        local = spectrum[mask]
        local_freqs = freqs[mask]
        return float(local_freqs[int(np.argmax(local))])
    return peak(250, 900, 550.0), peak(900, 2800, 1600.0), peak(1800, 3500, 2500.0)

def _quality_flags(raw_peak, speech_duration, raw_duration, energy_mean, mfcc_1_mean):
    warnings = []
    if raw_peak < 0.03:
        warnings.append("Audio amplitude is very low before normalization.")
    if speech_duration < 0.35:
        warnings.append("Detected speech duration is very short.")
    if raw_duration > 0 and speech_duration / raw_duration < 0.35:
        warnings.append("Large silent area detected in the recording.")
    if energy_mean < 0.20 or energy_mean > 1.0:
        warnings.append("Energy is outside the expected training range.")
    if mfcc_1_mean <= -295:
        warnings.append("MFCC_1 is near the clipping boundary, possible training-distribution mismatch.")
    reliability = "high"
    if len(warnings) >= 2:
        reliability = "low"
    elif len(warnings) == 1:
        reliability = "medium"
    return reliability, warnings

def extract_speech_features(
    file_bytes: bytes,
    *,
    task_type: str,
    target_word: str,
    target_phoneme_seq: str,
    difficulty_level: str,
    linguistic_focus: str,
    age: float,
    gender: str,
    native_language: str,
    assessment_language: str,
    recording_device_type: str,
    environment_noise_level: float,
    time_of_day: str,
):
    y_raw, y, sr, raw_duration, speech_duration, raw_peak = _load_trim_normalize(file_bytes)

    word_length = safe_word_length(target_word)
    syllable_count = count_syllables_simple(target_word)
    duration_sec = float(speech_duration)

    pause_count, avg_pause_duration, max_pause_duration = _pause_features(y, sr)
    response_latency_sec = float(np.clip(0.25 + duration_sec * 0.12, 0.1, 3.0))
    speech_rate = float(np.clip(word_length / max(duration_sec, 0.2), 0.3, 6.0))
    articulation_rate = float(np.clip((word_length + syllable_count) / max(duration_sec - avg_pause_duration, 0.2), 0.3, 8.0))

    rms = librosa.feature.rms(y=y)[0]
    # Scale normalized RMS to look closer to the synthetic data range.
    energy_mean = float(np.clip(np.mean(rms) * 2.4, 0.20, 1.00))
    energy_std = float(np.clip(np.std(rms) * 2.4, 0.02, 0.40))

    zcr = librosa.feature.zero_crossing_rate(y=y)[0]
    zcr_mean = float(np.clip(np.mean(zcr), 0.01, 0.25))
    zcr_std = float(np.clip(np.std(zcr), 0.002, 0.08))

    pitch_mean, pitch_std, pitch_min, pitch_max = _pitch_features(y, sr)
    jitter = float(np.clip((pitch_std / max(pitch_mean, 1.0)) * 0.08, 0.002, 0.08))
    shimmer = float(np.clip((energy_std / max(energy_mean, 0.0001)) * 0.08, 0.005, 0.16))
    hnr = float(np.clip(25 - zcr_mean * 60, 5.0, 35.0))
    formant_f1_mean, formant_f2_mean, formant_f3_mean = _formant_like_features(y, sr)
    mfcc_data = _mfcc_features(y, sr)

    # IMPORTANT: This is still only a proxy. It does not know if the child said "cat" correctly.
    # Replace this later with ASR/phoneme alignment.
    pause_norm = min(pause_count / 5.0, 1.0)
    duration_norm = min(abs(duration_sec - 1.4) / 3.0, 1.0)
    pitch_instability = min(pitch_std / 90.0, 1.0)
    zcr_instability = min(zcr_mean * 3.0, 1.0)
    noise_effect = min(environment_noise_level, 1.0)
    phoneme_error_rate = float(np.clip(
        0.16 * pause_norm + 0.12 * duration_norm + 0.16 * pitch_instability +
        0.14 * zcr_instability + 0.10 * noise_effect,
        0.02,
        0.65
    ))
    phoneme_match_ratio = float(np.clip(1.0 - phoneme_error_rate, 0.0, 1.0))

    substitution_count = int(np.clip(round(phoneme_error_rate * word_length * 0.8), 0, 4))
    deletion_count = int(np.clip(round(phoneme_error_rate * syllable_count * 0.5), 0, 2))
    insertion_count = int(np.clip(round(phoneme_error_rate * 0.7), 0, 2))
    distortion_count = int(np.clip(round(phoneme_error_rate * 1.0), 0, 3))
    initial_phoneme_correct = int(phoneme_match_ratio > 0.70)
    final_phoneme_correct = int(phoneme_match_ratio > 0.68)
    consonant_accuracy = float(np.clip(phoneme_match_ratio - 0.03, 0.0, 1.0))
    vowel_accuracy = float(np.clip(phoneme_match_ratio - 0.05, 0.0, 1.0))
    cluster_accuracy = None if word_length < 4 else float(np.clip(phoneme_match_ratio - 0.08, 0.0, 1.0))
    rhyme_accuracy = None if task_type != "rhyme_identification" else float(np.clip(phoneme_match_ratio - 0.04, 0.0, 1.0))
    syllable_accuracy = None if task_type != "syllable_segmentation" else float(np.clip(phoneme_match_ratio - 0.03, 0.0, 1.0))
    stress_pattern_match = int(phoneme_match_ratio > 0.70)
    pronunciation_confidence = float(np.clip(
        0.55 * phoneme_match_ratio + 0.20 * (1.0 - pause_norm) +
        0.15 * min(energy_mean / 0.60, 1.0) + 0.10 * (1.0 - pitch_instability),
        0.0,
        1.0
    ))
    expected_vs_actual_edit_distance = int(np.clip(round(substitution_count + deletion_count + insertion_count), 0, 8))
    attempt_count = 1
    self_correction_flag = 0
    repetition_needed_flag = int(phoneme_error_rate > 0.45)
    task_completion_status = 1
    prompt_replay_count = int(np.clip(round(pause_norm * 2), 0, 4))
    attention_drop_flag = int(environment_noise_level > 0.45 and duration_sec > 2.5)
    hesitation_score = float(np.clip(0.28 * phoneme_error_rate + 0.24 * pause_norm + 0.18 * pitch_instability + 0.10 * duration_norm, 0.0, 0.70))
    consistency_score_across_repetitions = float(np.clip(1.0 - phoneme_error_rate * 0.45, 0.0, 1.0))
    pronunciation_score = float(np.clip(
        0.42 * phoneme_match_ratio + 0.23 * pronunciation_confidence +
        0.15 * (1.0 - phoneme_error_rate) + 0.10 * (1.0 - hesitation_score) +
        0.10 * (syllable_accuracy if syllable_accuracy is not None else phoneme_match_ratio),
        0.0,
        1.0
    ))
    phonological_deficit_score = float(np.clip(
        0.35 * phoneme_error_rate + 0.20 * (1.0 - consonant_accuracy) +
        0.15 * (1.0 - vowel_accuracy) + 0.15 * hesitation_score +
        0.15 * min(expected_vs_actual_edit_distance / 5.0, 1.0),
        0.0,
        1.0
    ))

    features = {
        "task_type": task_type,
        "target_word": target_word,
        "target_phoneme_seq": target_phoneme_seq,
        "word_length": word_length,
        "syllable_count": syllable_count,
        "difficulty_level": difficulty_level,
        "linguistic_focus": linguistic_focus,
        "age": age,
        "gender": gender,
        "native_language": native_language,
        "assessment_language": assessment_language,
        "recording_device_type": recording_device_type,
        "environment_noise_level": environment_noise_level,
        "time_of_day": time_of_day,
        "duration_sec": duration_sec,
        "response_latency_sec": response_latency_sec,
        "speech_rate": speech_rate,
        "articulation_rate": articulation_rate,
        "pause_count": pause_count,
        "avg_pause_duration": avg_pause_duration,
        "max_pause_duration": max_pause_duration,
        "energy_mean": energy_mean,
        "energy_std": energy_std,
        "zcr_mean": zcr_mean,
        "zcr_std": zcr_std,
        "pitch_mean": pitch_mean,
        "pitch_std": pitch_std,
        "pitch_min": pitch_min,
        "pitch_max": pitch_max,
        "jitter": jitter,
        "shimmer": shimmer,
        "hnr": hnr,
        "formant_f1_mean": formant_f1_mean,
        "formant_f2_mean": formant_f2_mean,
        "formant_f3_mean": formant_f3_mean,
        **mfcc_data,
        "phoneme_match_ratio": phoneme_match_ratio,
        "substitution_count": substitution_count,
        "deletion_count": deletion_count,
        "insertion_count": insertion_count,
        "distortion_count": distortion_count,
        "phoneme_error_rate": phoneme_error_rate,
        "initial_phoneme_correct": initial_phoneme_correct,
        "final_phoneme_correct": final_phoneme_correct,
        "consonant_accuracy": consonant_accuracy,
        "vowel_accuracy": vowel_accuracy,
        "cluster_accuracy": cluster_accuracy,
        "rhyme_accuracy": rhyme_accuracy,
        "syllable_accuracy": syllable_accuracy,
        "stress_pattern_match": stress_pattern_match,
        "pronunciation_confidence": pronunciation_confidence,
        "expected_vs_actual_edit_distance": expected_vs_actual_edit_distance,
        "attempt_count": attempt_count,
        "self_correction_flag": self_correction_flag,
        "repetition_needed_flag": repetition_needed_flag,
        "task_completion_status": task_completion_status,
        "prompt_replay_count": prompt_replay_count,
        "attention_drop_flag": attention_drop_flag,
        "hesitation_score": hesitation_score,
        "consistency_score_across_repetitions": consistency_score_across_repetitions,
        "pronunciation_score": pronunciation_score,
        "phonological_deficit_score": phonological_deficit_score,
    }
    reliability, warnings = _quality_flags(raw_peak, speech_duration, raw_duration, energy_mean, features["mfcc_1_mean"])
    quality = {
        "prediction_reliability": reliability,
        "warnings": warnings,
        "raw_duration_sec": round(float(raw_duration), 4),
        "speech_duration_sec": round(float(speech_duration), 4),
        "raw_peak_amplitude": round(float(raw_peak), 4),
        "note": "Prototype only: actual phoneme alignment is not implemented yet."
    }
    return pd.DataFrame([features], columns=MODEL_FEATURE_COLUMNS), features, quality
