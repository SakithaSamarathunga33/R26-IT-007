# Tiny helpers about the writing task, used by services/feature_extraction_service.py.
# How many characters the child should write (at least 1).
def expected_letter_count(target_text: str) -> int:
    return max(1, len((target_text or "").strip()))

# easy/medium/hard -> 1/2/3 (unknown -> 2).
def difficulty_to_number(level: str) -> int:
    level = (level or "").lower().strip()
    if level == "easy":
        return 1
    if level == "medium":
        return 2
    if level == "hard":
        return 3
    return 2

# True if the target contains b, d, p or q (letters children often flip).
def has_reversal_sensitive_letters(target_text: str) -> bool:
    return any(ch.lower() in set("bdpq") for ch in (target_text or ""))
