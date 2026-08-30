import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.text_matching_service import (
    plain_similarity,
    confusable_similarity,
    is_mirror_detected,
    build_matching_result,
    empty_matching_result,
    TARGET_MATCH_THRESHOLD,
    MIRROR_MIN_SCORE,
    MIRROR_MARGIN,
)


def test_plain_similarity_exact_match():
    assert plain_similarity("cat", "cat") == 1.0


def test_plain_similarity_both_empty():
    # An empty target is unscorable and must never read as a perfect match,
    # even when the OCR text is also empty (e.g. blank/failed OCR).
    assert plain_similarity("", "") == 0.0


def test_plain_similarity_one_empty():
    assert plain_similarity("cat", "") == 0.0


def test_plain_similarity_unrelated_strings_scores_low():
    assert plain_similarity("cat", "xyz") < 0.3


def test_confusable_similarity_exact_match():
    assert confusable_similarity("dog", "dog") == 1.0


def test_confusable_substitution_scores_higher_than_plain():
    # 'b' and 'd' are confusable; 'f' and 'd' are not.
    confusable_score = confusable_similarity("dog", "bog")
    unrelated_score = confusable_similarity("dog", "fog")
    assert confusable_score > unrelated_score


def test_confusable_similarity_never_less_than_plain_similarity():
    pairs = [
        ("cat", "cat"),
        ("cat", "cai"),
        ("dog", "bog"),
        ("dog", "fog"),
        ("apple", "appIe"),
        ("cat", "xyz"),
        ("b", "d"),
        ("", "cat"),
    ]
    for a, b in pairs:
        assert confusable_similarity(a, b) >= plain_similarity(a, b)


def test_is_mirror_detected_true_when_flip_scores_much_higher():
    assert is_mirror_detected(upright_score=0.2, mirror_score=0.9) is True


def test_is_mirror_detected_false_when_scores_close():
    assert is_mirror_detected(upright_score=0.85, mirror_score=0.9) is False


def test_is_mirror_detected_false_when_mirror_score_below_minimum():
    assert is_mirror_detected(upright_score=0.1, mirror_score=0.6) is False


def test_is_mirror_detected_boundary_values_use_configured_constants():
    just_below_margin = MIRROR_MIN_SCORE - 0.0001
    assert is_mirror_detected(upright_score=0.0, mirror_score=just_below_margin) is False
    assert is_mirror_detected(upright_score=0.0, mirror_score=MIRROR_MIN_SCORE) is True


def test_build_matching_result_shape_and_target_match_threshold():
    result = build_matching_result("cat", "tac", "cat")
    assert set(result.keys()) == {
        "target_match_score",
        "template_similarity_score",
        "confusable_similarity_score",
        "mirror_similarity_score",
        "mirror_detected",
    }
    assert result["target_match_score"] == 1.0
    assert result["target_match_score"] >= TARGET_MATCH_THRESHOLD
    assert result["confusable_similarity_score"] == result["target_match_score"]


def test_empty_matching_result_is_all_zero_and_no_mirror():
    result = empty_matching_result()
    assert result["target_match_score"] == 0.0
    assert result["template_similarity_score"] == 0.0
    assert result["confusable_similarity_score"] == 0.0
    assert result["mirror_similarity_score"] == 0.0
    assert result["mirror_detected"] is False


# --- Fix 2: an empty (or non-ASCII-only) target must never score a perfect match ---

def test_plain_similarity_non_ascii_target_scores_zero_even_when_ocr_also_empty():
    # A purely Sinhala target_text cleans to "" (same as blank/failed OCR).
    # This must be treated as unscorable, not a perfect match.
    assert plain_similarity("", "සිංහල") == 0.0


def test_confusable_similarity_non_ascii_target_scores_zero_even_when_ocr_also_empty():
    assert confusable_similarity("", "සිංහල") == 0.0


def test_plain_similarity_empty_target_scores_zero_even_with_non_empty_ocr():
    assert plain_similarity("cat", "") == 0.0


# --- Fix 3: short (<=2 char) targets use best-substring-window matching ---

def test_plain_similarity_short_target_with_trailing_extra_char():
    # OCR returned one spurious trailing character; "b" is still an exact
    # substring of "bd", so windowing should recover a perfect score instead
    # of the whole-string-only result of 1 - 1/2 = 0.5.
    assert plain_similarity("bd", "b") == 1.0


def test_confusable_similarity_short_target_with_trailing_extra_char():
    assert confusable_similarity("bd", "b") == 1.0


def test_plain_similarity_short_target_with_leading_extra_char():
    assert plain_similarity("lb", "b") == 1.0


def test_confusable_similarity_short_target_with_leading_extra_char():
    assert confusable_similarity("lb", "b") == 1.0


def test_plain_similarity_short_target_windowing_beats_whole_string_score():
    # Sanity check that windowing is actually doing something: the
    # whole-string-only score for "bd" vs "b" is 0.5, well below the
    # windowed result.
    whole_string_score = 1.0 - (1.0 / 2)
    assert whole_string_score == 0.5
    assert plain_similarity("bd", "b") > whole_string_score


def test_plain_similarity_long_target_unaffected_by_windowing():
    # len("dog") == 3 > 2, so the windowing path must never trigger here.
    # Whole-string weighted edit distance between "xdog" and "dog" is 1
    # (delete the leading 'x'), normalized by max(len)=4: 1 - 1/4 = 0.75.
    assert plain_similarity("xdog", "dog") == 0.75


def test_confusable_similarity_long_target_unaffected_by_windowing():
    assert confusable_similarity("xdog", "dog") == 0.75


# --- Fix 4: unbounded input length must not break or blow up scoring ---

def test_plain_similarity_handles_very_long_input_without_crashing():
    long_text = "a" * 1000
    score = plain_similarity(long_text, "cat")
    assert isinstance(score, float)
    assert 0.0 <= score <= 1.0


def test_confusable_similarity_handles_very_long_input_without_crashing():
    long_text = "b" * 1000
    score = confusable_similarity(long_text, long_text)
    assert isinstance(score, float)
    assert 0.0 <= score <= 1.0
