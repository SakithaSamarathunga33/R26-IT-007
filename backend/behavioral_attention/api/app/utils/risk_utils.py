# Small helper rules that turn numbers into plain labels. Used by services/predict_service.py.
# Risk bands from the model probability: below 0.35 = low, 0.35 to 0.70 = medium, 0.70 or more = high.
# (Same cut-offs as the fusion API in multi_modal_risk.)
def probability_to_risk_level(probability: float) -> str:
    if probability < 0.35:
        return "low"
    if probability < 0.70:
        return "medium"
    return "high"

# How trustworthy the result is, based on how many features were missing:
# 0 missing = high, 1-5 = medium, more than 5 = low.
def reliability_from_missing_count(missing_count: int) -> str:
    if missing_count == 0:
        return "high"
    if missing_count <= 5:
        return "medium"
    return "low"
