def probability_to_risk_level(probability: float) -> str:
    if probability < 0.35:
        return "low"
    if probability < 0.70:
        return "medium"
    return "high"

def reliability_from_warnings(warnings):
    if len(warnings) == 0:
        return "high"
    if len(warnings) <= 2:
        return "medium"
    return "low"
