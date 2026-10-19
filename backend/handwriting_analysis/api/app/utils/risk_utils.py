# Helpers that turn model output into labels. Used by services/predict_service.py.
# Map risk probability to low (<0.35), medium (<0.70) or high. Same cut-offs as the speech API.
def probability_to_risk_level(probability: float) -> str:
    if probability < 0.35:
        return "low"
    if probability < 0.70:
        return "medium"
    return "high"

# More image-quality warnings = lower reliability: 0 high, 1-2 medium, 3+ low.
def reliability_from_warnings(warnings):
    if len(warnings) == 0:
        return "high"
    if len(warnings) <= 2:
        return "medium"
    return "low"
