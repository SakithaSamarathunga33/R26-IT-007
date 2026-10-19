# Small rule helpers for the fusion API: score bands, labels and reliability combining.
# Used by services/fusion_service.py, feature_builder.py and therapy_service.py.
# Risk bands everywhere: below 0.35 = low, 0.35 to 0.70 = medium, 0.70 or more = high.
# Overall risk level (low / medium / high) from a 0-1 score.
def final_risk_level(score: float) -> str:
    if score < 0.35:
        return "low"
    if score < 0.70:
        return "medium"
    return "high"

# Yes/no at-risk label: 1 if the score reaches the threshold (default 0.35).
def binary_label_from_score(score: float, threshold: float = 0.35) -> int:
    return 1 if score >= threshold else 0

# Severity (low / medium / high) of one module's score; None if the module was unusable.
def severity_from_score(score: float) -> str:
    if score is None:
        return None
    if score < 0.35:
        return "low"
    if score < 0.70:
        return "medium"
    return "high"

# Attention status (stable / moderate / poor) from the behaviour score; None if unusable.
def status_from_score(score: float) -> str:
    if score is None:
        return None
    if score < 0.35:
        return "stable"
    if score < 0.70:
        return "moderate"
    return "poor"

# Reliability text to number: high 3, medium 2, anything else 1 (unknown counts as medium).
def reliability_score(reliability: str) -> int:
    reliability = (reliability or "medium").lower()
    if reliability == "high":
        return 3
    if reliability == "medium":
        return 2
    return 1

# Overall reliability = the weakest of the modules' reliabilities (one low makes it low).
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

# Gets a module's risk probability (0-1), or None if the module is missing, marked unavailable or the value is invalid. Never treated as 0.
def module_score(module) -> float:
    # None = unusable (missing, available=false or invalid probability); never treat as 0
    if not isinstance(module, dict) or module.get("available") is False:
        return None
    try:
        p = float(module.get("risk_probability"))
    except (TypeError, ValueError):
        return None
    return p if 0 <= p <= 1 else None
