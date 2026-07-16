def probability_to_risk_level(probability: float) -> str:
    if probability < 0.35:
        return "low"
    if probability < 0.70:
        return "medium"
    return "high"

def reliability_from_missing_count(missing_count: int) -> str:
    if missing_count == 0:
        return "high"
    if missing_count <= 5:
        return "medium"
    return "low"
