# Tiny helpers about the target word, used by services/feature_extraction_service.py.
# Rough syllable count: number of vowel groups in the word (at least 1).
def count_syllables_simple(word: str) -> int:
    word = (word or "").lower().strip()
    if not word:
        return 1
    vowels = "aeiouy"
    count = 0
    previous_is_vowel = False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not previous_is_vowel:
            count += 1
        previous_is_vowel = is_vowel
    return max(1, count)

# Word length, never 0.
def safe_word_length(word: str) -> int:
    return len((word or "").strip()) or 1
