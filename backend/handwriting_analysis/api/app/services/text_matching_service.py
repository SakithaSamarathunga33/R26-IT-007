import re

CONFUSABLE_SUBSTITUTION_COST = 0.3
TARGET_MATCH_THRESHOLD = 0.6
MIRROR_MIN_SCORE = 0.75
MIRROR_MARGIN = 0.15
GUARDRAIL_MATCH_THRESHOLD = 0.9
GUARDRAIL_CEILING = 0.30

CONFUSABLE_GROUPS = [
    {"0", "o"},
    {"1", "l", "i"},
    {"5", "s"},
    {"8", "b"},
    {"2", "z"},
    {"b", "d"},
    {"p", "q"},
    {"m", "n"},
    {"u", "v"},
    {"g", "q"},
]

_CONFUSABLE_LOOKUP = {}
for _group in CONFUSABLE_GROUPS:
    for _ch in _group:
        _CONFUSABLE_LOOKUP.setdefault(_ch, set()).update(_group)


def _clean(s: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", s or "").lower()


def _are_confusable(x: str, y: str) -> bool:
    if x == y:
        return True
    return y in _CONFUSABLE_LOOKUP.get(x, set())


def _weighted_edit_distance(a: str, b: str, confusable_cost: float) -> float:
    n, m = len(a), len(b)
    if n == 0:
        return float(m)
    if m == 0:
        return float(n)

    prev = [float(j) for j in range(m + 1)]
    for i in range(1, n + 1):
        curr = [float(i)] + [0.0] * m
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                sub_cost = 0.0
            elif _are_confusable(a[i - 1], b[j - 1]):
                sub_cost = confusable_cost
            else:
                sub_cost = 1.0
            curr[j] = min(
                prev[j] + 1.0,       # deletion
                curr[j - 1] + 1.0,   # insertion
                prev[j - 1] + sub_cost,  # substitution
            )
        prev = curr
    return prev[m]


def _similarity(a: str, b: str, confusable_cost: float) -> float:
    a_clean = _clean(a)
    b_clean = _clean(b)
    if not a_clean and not b_clean:
        return 1.0
    if not a_clean or not b_clean:
        return 0.0
    distance = _weighted_edit_distance(a_clean, b_clean, confusable_cost)
    max_len = max(len(a_clean), len(b_clean))
    similarity = 1.0 - (distance / max_len)
    return max(0.0, min(1.0, similarity))


def plain_similarity(a: str, b: str) -> float:
    return _similarity(a, b, confusable_cost=1.0)


def confusable_similarity(a: str, b: str) -> float:
    return _similarity(a, b, confusable_cost=CONFUSABLE_SUBSTITUTION_COST)


def is_mirror_detected(upright_score: float, mirror_score: float) -> bool:
    return mirror_score >= MIRROR_MIN_SCORE and (mirror_score - upright_score) >= MIRROR_MARGIN


def build_matching_result(ocr_text: str, ocr_text_mirror: str, target_text: str) -> dict:
    target_match_score = confusable_similarity(ocr_text, target_text)
    template_similarity_score = plain_similarity(ocr_text, target_text)
    mirror_similarity_score = confusable_similarity(ocr_text_mirror, target_text)
    mirror_detected = is_mirror_detected(target_match_score, mirror_similarity_score)
    return {
        "target_match_score": round(target_match_score, 4),
        "template_similarity_score": round(template_similarity_score, 4),
        "confusable_similarity_score": round(target_match_score, 4),
        "mirror_similarity_score": round(mirror_similarity_score, 4),
        "mirror_detected": mirror_detected,
    }


def empty_matching_result() -> dict:
    return {
        "target_match_score": 0.0,
        "template_similarity_score": 0.0,
        "confusable_similarity_score": 0.0,
        "mirror_similarity_score": 0.0,
        "mirror_detected": False,
    }
