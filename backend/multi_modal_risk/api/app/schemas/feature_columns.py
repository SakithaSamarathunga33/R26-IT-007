FEATURE_COLUMNS = [
    "age", "native_language", "assessment_language", "school_type", "support_level",
    "device_type", "environment_noise_level", "time_of_day",
    "speech_score", "speech_risk_probability", "phoneme_error_rate",
    "speech_hesitation_score", "pronunciation_score", "rhyme_accuracy",
    "handwriting_score", "handwriting_risk_probability", "reversal_risk",
    "spacing_variance", "alignment_score", "writing_quality_score",
    "behavior_score", "behavior_risk_probability", "attention_score",
    "engagement_score", "response_latency", "retry_count",
    "speech_weight", "handwriting_weight", "behavior_weight", "fusion_strategy",
    "speech_severity", "handwriting_severity", "behavior_severity", "attention_status",
    "reversal_risk_flag", "phoneme_risk_flag", "engagement_risk_flag"
]
NUMERIC_COLUMNS = [
    "age", "environment_noise_level", "speech_score", "speech_risk_probability",
    "phoneme_error_rate", "speech_hesitation_score", "pronunciation_score", "rhyme_accuracy",
    "handwriting_score", "handwriting_risk_probability", "reversal_risk", "spacing_variance",
    "alignment_score", "writing_quality_score", "behavior_score", "behavior_risk_probability",
    "attention_score", "engagement_score", "response_latency", "retry_count",
    "speech_weight", "handwriting_weight", "behavior_weight", "reversal_risk_flag",
    "phoneme_risk_flag", "engagement_risk_flag"
]
CATEGORICAL_COLUMNS = [c for c in FEATURE_COLUMNS if c not in NUMERIC_COLUMNS]
