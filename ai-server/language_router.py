"""
language_router.py — Mode-Aware Caption Pipeline Router
=======================================================

THE ROOT PROBLEM (why the old code broke):
  One normalization path for all languages.
  HINGLISH_CANONICAL was rewriting clean English words like "to" → "toh".
  Hindi videos had no real translation path — just broken transliteration.

THIS FILE SOLVES:
  1. Detects clip mode: ENGLISH / HINDI / HINGLISH
  2. Routes words through mode-specific normalization
  3. English words in English videos → never touched by Hinglish rules
  4. Hindi audio → clean Hinglish Roman via transliteration only (no Hinglish rewrites)
  5. Hinglish → existing logic (unchanged, it works there)

USAGE (replaces the normalize_words call in main.py):
  from language_router import route_transcript
  canonical_words = route_transcript(raw_words, detected_lang)

Drop-in replacement — same input/output shape as normalize_words().
"""

from __future__ import annotations

import re
import unicodedata
from typing import List, Dict, Any, Optional

# ── Import existing engines (keep using them, just route correctly) ─────────────
from correction_engine import REPAIR_ENGINE, script_of
from text_normalizer import (
    _convert_devanagari_word,
    _urdu_to_hinglish,
    force_roman,
    HINDI_TO_HINGLISH,
)

try:
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate
    INDIC_AVAILABLE = True
except ImportError:
    INDIC_AVAILABLE = False


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: Mode detection
# ─────────────────────────────────────────────────────────────────────────────

def _devanagari_ratio(words: List[Dict[str, Any]]) -> float:
    """Fraction of words that are purely Devanagari."""
    if not words:
        return 0.0
    deva = sum(1 for w in words if _is_devanagari_word(w.get("text", "")))
    return deva / len(words)


def _latin_ratio(words: List[Dict[str, Any]]) -> float:
    """Fraction of words that are purely Latin/Roman."""
    if not words:
        return 0.0
    latin = sum(1 for w in words if _is_latin_word(w.get("text", "")))
    return latin / len(words)


def _is_devanagari_word(text: str) -> bool:
    """Check if text contains Devanagari script."""
    return bool(text) and any(0x0900 <= ord(c) <= 0x097F for c in text)


def _is_latin_word(text: str) -> bool:
    """Check if text is primarily Latin/Roman script."""
    alpha = [c for c in text if c.isalpha()]
    if not alpha:
        return False
    latin = sum(1 for c in alpha if ord(c) < 128)
    return (latin / len(alpha)) >= 0.85


class ContentMode:
    ENGLISH = "english"      # Pure English — no Hinglish rewrites at all
    HINDI = "hindi"          # Pure Hindi — transliterate to Roman cleanly
    HINGLISH = "hinglish"    # Mixed — existing Hinglish processing is correct


def _is_tamil_word(text: str) -> bool:
    """Check if text contains Tamil script (U+0B80-U+0BFF)."""
    return bool(text) and any(0x0B80 <= ord(c) <= 0x0BFF for c in text)


def _is_telugu_word(text: str) -> bool:
    """Check if text contains Telugu script (U+0C00-U+0C7F)."""
    return bool(text) and any(0x0C00 <= ord(c) <= 0x0C7F for c in text)


def _is_bengali_word(text: str) -> bool:
    """Check if text contains Bengali script (U+0980-U+09FF)."""
    return bool(text) and any(0x0980 <= ord(c) <= 0x09FF for c in text)


def _is_gujarati_word(text: str) -> bool:
    """Check if text contains Gujarati script (U+0A80-U+0AFF)."""
    return bool(text) and any(0x0A80 <= ord(c) <= 0x0AFF for c in text)


def detect_content_mode(
    words: List[Dict[str, Any]],
    whisper_lang: Optional[str] = None
) -> str:
    """
    Determine the content mode for this clip.

    ✅ CORRECTED LOGIC:
    - Count Devanagari, Roman, and OTHER scripts separately
    - Use whisper_lang as primary signal
    - NEVER default to HINGLISH incorrectly
    """
    if not words:
        return ContentMode.HINGLISH
    
    devanagari = 0
    roman = 0
    other = 0
    
    for w in words:
        text = w.get("text", "")
        if not text:
            continue
            
        if _is_devanagari_word(text):
            devanagari += 1
        elif text.isascii() or _is_latin_word(text):
            roman += 1
        else:
            # Tamil, Telugu, Bengali, Gujarati, Arabic, etc.
            other += 1
    
    total = len(words)
    dev_ratio = devanagari / total
    roman_ratio = roman / total
    
    lang = (whisper_lang or "").lower()
    
    # ✅ Correct decision tree
    if lang == "en":
        return ContentMode.ENGLISH
    
    if lang == "hi":
        # Pure Hindi: mostly Devanagari
        if dev_ratio > 0.6:
            return ContentMode.HINDI
        # Hinglish: mostly Roman
        if roman_ratio > 0.6:
            return ContentMode.HINGLISH
        # Mixed Hindi-Roman → HINGLISH (correct for actual Hinglish)
        return ContentMode.HINGLISH
    
    # For other Indian languages (Tamil, Telugu, etc.) → pass through
    # For Urdu/Arabic → use Hindi mode for transliteration
    if lang in ("ur", "ta", "te", "bn", "gu", "pa", "ml", "kn"):
        return ContentMode.HINDI  # Use Hindi transliteration path
    
    # Fallback: use script ratio
    if dev_ratio > 0.6:
        return ContentMode.HINDI
    if roman_ratio > 0.8:
        return ContentMode.ENGLISH
    
    return ContentMode.HINGLISH


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: Mode-specific normalization
# ─────────────────────────────────────────────────────────────────────────────

# Words that look like English but are common Hinglish words — protected in all modes
HINGLISH_PROTECTED = {
    "nahi", "nahin", "hai", "hain", "hoon", "ho", "tha", "thi", "the",
    "aur", "lekin", "toh", "phir", "kyun", "kya", "kaise", "kab",
    "kahan", "kaun", "bahut", "bilkul", "kaafi", "zyada", "thoda",
    "main", "tum", "aap", "hum", "wo", "woh", "ye", "yeh",
    "aaj", "kal", "abhi", "yahan", "wahan", "jahan", "accha", "achha",
    "sahi", "galat", "matlab", "samajh", "bhai", "yaar", "dost",
    "kaam", "baat", "cheez", "log", "ghar", "desh", "duniya", "zindagi",
}

# English function words that MUST NOT be rewritten to Hinglish
# "to" must stay "to", not become "toh"
ENGLISH_PROTECTED = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "on",
    "at", "by", "for", "with", "from", "up", "about", "into", "through",
    "during", "before", "after", "above", "below", "between", "out",
    "off", "over", "under", "again", "further", "then", "once",
    "that", "this", "these", "those", "it", "its", "they", "them",
    "their", "there", "here", "where", "when", "what", "which", "who",
    "not", "no", "nor", "and", "but", "or", "so", "yet", "both",
    "either", "neither", "each", "few", "more", "most", "other", "some",
    "such", "than", "too", "very", "just", "now", "only", "also",
    "i", "you", "he", "she", "we", "my", "your", "his", "her", "our",
    "me", "him", "us", "myself", "yourself", "himself", "herself",
    "if", "as", "while", "because", "although", "though", "unless",
    "until", "since", "how", "all", "any", "both", "few", "many",
    "much", "same", "own", "new", "old", "first", "last", "long",
    "great", "little", "good", "right", "big", "high", "different",
    "small", "large", "next", "early", "young", "important", "public",
    "private", "real", "best", "free", "never", "always", "every",
}


def normalize_english_word(word_text: str) -> str:
    """
    English mode: minimal processing only.
    - Keep Roman words exactly as Whisper produced them (just lowercase + clean)
    - Do NOT apply HINGLISH_CANONICAL rewrites (that's what was turning "to" into "toh")
    - Only fix obvious broken tokens via REPAIR_ENGINE but skip Hinglish canonical
    """
    if not word_text:
        return ""

    text = word_text.strip()

    # Pure Roman — this is the main path for English
    if _is_latin_word(text):
        lower = text.lower()
        clean = re.sub(r"[^\w\s'\-]", "", lower).strip()
        if not clean:
            return lower
        from correction_engine import REPAIR_ENGINE as _REPAIR
        repaired = _REPAIR.repair_token(clean, doc_lang="en", english_mode=True)
        return force_roman(repaired)

    # Devanagari in English video → transliterate
    if _is_devanagari_word(text):
        from correction_engine import script_of
        clean = re.sub(r"[^\u0900-\u097F]", "", text)
        if INDIC_AVAILABLE:
            try:
                result = transliterate(clean, sanscript.DEVANAGARI, sanscript.ITRANS)
                result = result.replace("N", "n").replace("H", "h").replace("~", "")
                if result.strip():
                    return force_roman(result.strip()).lower()
            except Exception:
                pass
        from text_normalizer import _char_transliterate
        return force_roman(_char_transliterate(clean)).lower()

    # Other scripts (Tamil, Telugu, Arabic, etc.) → pass through as-is
    # NEVER drop tokens
    return text.lower()


def normalize_hindi_word(word_text: str) -> str:
    """
    Hindi mode: transliterate Devanagari → clean Hinglish Roman.
    - Use the HINDI_TO_HINGLISH map first (most natural output)
    - Fall back to indic_transliteration
    - Do NOT apply HINGLISH_CANONICAL rewrites after conversion (avoid double-processing)
    - Roman words (English loanwords in Hindi speech) → preserve as-is
    """
    if not word_text:
        return ""

    text = word_text.strip()
    src = script_of(text)

    if src == "devanagari":
        # Primary: use the curated Hindi→Hinglish map
        clean = re.sub(r"[^\u0900-\u097F]", "", text)
        if clean in HINDI_TO_HINGLISH:
            return HINDI_TO_HINGLISH[clean]

        # Secondary: indic_transliteration
        if INDIC_AVAILABLE:
            try:
                result = transliterate(clean, sanscript.DEVANAGARI, sanscript.ITRANS)
                result = result.replace("N", "n").replace("H", "h").replace("~", "")
                result = result.strip()
                if result:
                    return force_roman(result)
            except Exception:
                pass

        # Fallback: char-level map
        from text_normalizer import _char_transliterate
        return force_roman(_char_transliterate(clean))

    if src == "arabic":
        return force_roman(_urdu_to_hinglish(text))

    # Roman word in Hindi video → preserve (English loanword like "camera", "mobile")
    return force_roman(text.lower())


def normalize_hinglish_word(word_text: str, score: Optional[float] = None) -> str:
    """
    Hinglish mode: the existing full pipeline (unchanged behavior).
    This is what was working before — keep it intact for mixed content.
    """
    from text_normalizer import normalize_word
    return normalize_word(word_text, doc_lang="hi", score=score)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: Main router — drop-in replacement for normalize_words()
# ─────────────────────────────────────────────────────────────────────────────

def route_transcript(
    words: List[Dict[str, Any]],
    detected_lang: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    THE ENTRY POINT — drop-in replacement for normalize_words().

    Takes raw words from WhisperX and returns clean normalized words
    using the correct processing path for the content type.

    Args:
        words:         Raw word list from TranscriptionEngine.transcribe()
        detected_lang: Language code from Whisper ("en", "hi", etc.)

    Returns:
        Normalized word list with same shape as before.
    """
    if not words:
        return []

    mode = detect_content_mode(words, detected_lang)
    print(f"[LanguageRouter] Detected mode: {mode.upper()} (whisper_lang={detected_lang})")

    normalized = []

    for word in words:
        original = word.get("text", word.get("word", "")).strip()
        score = word.get("score")

        if not original:
            continue

        # Route to mode-specific normalizer
        if mode == ContentMode.ENGLISH:
            converted = normalize_english_word(original)
        elif mode == ContentMode.HINDI:
            converted = normalize_hindi_word(original)
        else:  # HINGLISH — existing behavior, no change
            converted = normalize_hinglish_word(original, score=score)

        # ✅ NEVER DROP TOKENS — pass through if normalizer returns empty
        if not converted:
            converted = original

        new_word = word.copy()
        new_word["text"] = converted
        new_word["word"] = converted
        new_word["original"] = original
        new_word["content_mode"] = mode
        normalized.append(new_word)

    print(f"[LanguageRouter] {len(words)} → {len(normalized)} words (mode: {mode})")
    return normalized


def detect_mode_from_text(text: str, whisper_lang: Optional[str] = None) -> str:
    """
    Convenience function: detect mode from a plain text string instead of word list.
    Used for per-segment mode detection if needed in future.
    """
    fake_words = [{"text": w} for w in text.split()]
    return detect_content_mode(fake_words, whisper_lang)
