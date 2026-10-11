"""Feature vector for the reliability-aware fusion model.

Shared by training (backend/multi_modal_risk/training) and serving, so the two can never drift apart.
"""
from typing import Dict, List, Optional

MODULES = ['speech', 'handwriting', 'behavior']
RELIABILITY_NUMERIC = {'high': 1.0, 'medium': 0.5, 'low': 0.0}

FEATURE_ORDER = (
    [f'{m}_prob' for m in MODULES]
    + [f'{m}_missing' for m in MODULES]
    + [f'{m}_reliability' for m in MODULES]
    + [f'{m}_prob_x_reliability' for m in MODULES]
    + ['max_pairwise_gap', 'evidence_completeness']
)

def build_features(probs: Dict[str, Optional[float]], reliabilities: Dict[str, Optional[str]]) -> List[float]:
    """probs: module -> risk probability, or None when the module is unusable."""
    available = [p for p in probs.values() if p is not None]
    # a missing module takes the mean of the available ones (neutral, never "low risk"); its indicator says it was missing
    fill = sum(available) / len(available) if available else 0.5
    prob = {m: probs[m] if probs.get(m) is not None else fill for m in MODULES}
    missing = {m: 0.0 if probs.get(m) is not None else 1.0 for m in MODULES}
    rel = {
        m: 0.0 if missing[m] else RELIABILITY_NUMERIC.get(reliabilities.get(m) or 'medium', 0.5)
        for m in MODULES
    }
    gap = max(available) - min(available) if len(available) > 1 else 0.0
    return (
        [prob[m] for m in MODULES]
        + [missing[m] for m in MODULES]
        + [rel[m] for m in MODULES]
        + [prob[m] * rel[m] for m in MODULES]
        + [gap, len(available) / len(MODULES)]
    )
