def final_risk_level(score: float) -> str:
    if score < 0.35:
        return "low"
    if score < 0.70:
        return "medium"
    return "high"

def binary_label_from_score(score: float, threshold: float = 0.35) -> int:
    return 1 if score >= threshold else 0

def severity_from_score(score: float) -> str:
    if score is None:
        return None
    if score < 0.35:
        return "low"
    if score < 0.70:
        return "medium"
    return "high"

def status_from_score(score: float) -> str:
    if score is None:
        return None
    if score < 0.35:
        return "stable"
    if score < 0.70:
        return "moderate"
    return "poor"

def reliability_score(reliability: str) -> int:
    reliability = (reliability or "medium").lower()
    if reliability == "high":
        return 3
    if reliability == "medium":
        return 2
    return 1

def combined_reliability(*values) -> str:
    scores = [reliability_score(v) for v in values if v is not None]
    if not scores:
        return "medium"
    min_score = min(scores)
    if min_score == 3:
        return "high"
    if min_score == 2:
        return "medium"
    return "low"

def module_score(module) -> float:
    # None = unusable (missing, available=false or invalid probability); never treat as 0
    if not isinstance(module, dict) or module.get("available") is False:
        return None
    try:
        p = float(module.get("risk_probability"))
    except (TypeError, ValueError):
        return None
    return p if 0 <= p <= 1 else None
