"""
language_router.py — Target-Language-Aware Caption Pipeline
===========================================================

ARCHITECTURE FIX:
  The old system had ONE normalization path (Roman/Hinglish output only).
  This system separates:
    1. ASR language detection (what was spoken)
    2. Output mode (what user wants to see)

THREE OUTPUT MODES:
  - "native":     Hindi→Devanagari, English→Latin, Hinglish→Mixed
  - "hinglish":   Everything→Roman (Hinglish transliteration)
  - "english":    Everything→English translation

USAGE:
  from language_router import route_transcript
  canonical_words = route_transcript(raw_words, detected_lang, output_mode="native")
"""

from __future__ import annotations

import os
import re
from typing import List, Dict, Any, Optional

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
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

# Default output mode - can be overridden per request
DEFAULT_OUTPUT_MODE = os.environ.get("CAPTION_OUTPUT_MODE", "native")


class OutputMode:
    """Output format for captions."""
    NATIVE = "native"       # Keep original script (Hindi→Devanagari, English→Latin)
    HINGLISH = "hinglish"   # Romanized Hindi/Hinglish
    ENGLISH = "english"     # Translated to English


class ContentMode:
    """Detected ASR language mode."""
    ENGLISH = "english"
    HINDI = "hindi"
    HINGLISH = "hinglish"
    UNKNOWN = "unknown"


# ─────────────────────────────────────────────────────────────────────────────
# SCRIPT DETECTION
# ─────────────────────────────────────────────────────────────────────────────

def _is_devanagari(text: str) -> bool:
    return bool(text) and any(0x0900 <= ord(c) <= 0x097F for c in text)


def _is_latin(text: str) -> bool:
    alpha = [c for c in text if c.isalpha()]
    if not alpha:
        return False
    latin = sum(1 for c in alpha if ord(c) < 128)
    return (latin / len(alpha)) >= 0.85


def _is_arabic(text: str) -> bool:
    return bool(text) and any(0x0600 <= ord(c) <= 0x06FF for c in text)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: ASR Language Detection (what was spoken)
# ─────────────────────────────────────────────────────────────────────────────

def detect_asr_language(
    words: List[Dict[str, Any]],
    whisper_lang: Optional[str] = None
) -> str:
    """
    Detect what language the speaker was using.
    Uses Whisper's detection as PRIMARY signal.
    """
    if not words:
        return ContentMode.UNKNOWN

    deva_count = sum(1 for w in words if _is_devanagari(w.get("text", "")))
    latin_count = sum(1 for w in words if _is_latin(w.get("text", "")))
    total = len(words)

    deva_ratio = deva_count / total if total else 0
    latin_ratio = latin_count / total if total else 0

    lang = (whisper_lang or "").lower()

    # PRIMARY: Trust Whisper's language detection
    if lang == "en":
        return ContentMode.ENGLISH

    if lang == "hi":
        # Whisper says Hindi - check if it's pure Hindi or Hinglish
        if latin_ratio > 0.7:
            return ContentMode.HINGLISH  # Mostly Roman = Hinglish spoken
        return ContentMode.HINDI  # Mostly Devanagari = Pure Hindi

    # Fallback: use script ratios
    if deva_ratio > 0.6:
        return ContentMode.HINDI
    if latin_ratio > 0.8:
        return ContentMode.ENGLISH

    if deva_ratio > 0.3 and latin_ratio > 0.3:
        return ContentMode.HINGLISH

    return ContentMode.UNKNOWN


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: Output-specific normalizers
# ─────────────────────────────────────────────────────────────────────────────

def _normalize_native(text: str, asr_mode: str) -> str:
    """
    NATIVE mode: Keep original script.
    - Hindi words → Devanagari
    - English words → Latin
    - Hinglish → Mixed (as spoken)
    """
    if not text:
        return ""

    text = text.strip()

    # Devanagari text → keep as-is (already Hindi)
    if _is_devanagari(text):
        return text

    # Arabic/Urdu → transliterate to Devanagari or keep Arabic
    if _is_arabic(text):
        # Keep Arabic script as-is for native mode
        return text

    # Latin text
    if _is_latin(text):
        lower = text.lower()
        # If ASR mode is HINDI, this is a loanword - keep as-is
        if asr_mode == ContentMode.HINDI:
            return lower
        # If ASR mode is HINGLISH, this is English word in Hinglish - keep as-is
        if asr_mode == ContentMode.HINGLISH:
            return lower
        # If ASR mode is ENGLISH, apply light correction
        if asr_mode == ContentMode.ENGLISH:
            from correction_engine import REPAIR_ENGINE as _REPAIR
            repaired = _REPAIR.repair_token(lower, doc_lang="en", english_mode=True)
            return repaired
        return lower

    # Unknown script → pass through
    return text


def _normalize_hinglish(text: str, asr_mode: str) -> str:
    """
    HINGLISH mode: Everything in Roman script.
    - Devanagari → Hinglish Roman transliteration
    - English → keep as-is
    """
    if not text:
        return ""

    text = text.strip()

    # Devanagari → transliterate to Hinglish Roman
    if _is_devanagari(text):
        clean = re.sub(r"[^\u0900-\u097F]", "", text)
        if clean in HINDI_TO_HINGLISH:
            return HINDI_TO_HINGLISH[clean]
        if INDIC_AVAILABLE:
            try:
                result = transliterate(clean, sanscript.DEVANAGARI, sanscript.ITRANS)
                result = result.replace("N", "n").replace("H", "h").replace("~", "")
                if result.strip():
                    return force_roman(result.strip())
            except Exception:
                pass
        from text_normalizer import _char_transliterate
        return force_roman(_char_transliterate(clean))

    # Arabic/Urdu → Hinglish Roman
    if _is_arabic(text):
        return force_roman(_urdu_to_hinglish(text))

    # Latin text
    if _is_latin(text):
        lower = text.lower()
        # In Hinglish mode, apply Hinglish canonical corrections
        from correction_engine import REPAIR_ENGINE as _REPAIR
        repaired = _REPAIR.repair_token(lower, doc_lang="hi", english_mode=False)
        return repaired

    return text.lower()


def _normalize_english(text: str, asr_mode: str) -> str:
    """
    ENGLISH mode: Everything in English.
    - Hindi → translate (placeholder for now, keep Romanized)
    - English → keep as-is with corrections
    """
    if not text:
        return ""

    text = text.strip()

    # Devanagari → Romanize (translation would require LLM)
    if _is_devanagari(text):
        # TODO: Add translation here
        # For now, transliterate to Roman as fallback
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

    # Arabic/Urdu → Romanize
    if _is_arabic(text):
        return force_roman(_urdu_to_hinglish(text)).lower()

    # Latin text → English correction
    if _is_latin(text):
        lower = text.lower()
        from correction_engine import REPAIR_ENGINE as _REPAIR
        repaired = _REPAIR.repair_token(lower, doc_lang="en", english_mode=True)
        return repaired

    return text.lower()


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: Main router
# ─────────────────────────────────────────────────────────────────────────────

def route_transcript(
    words: List[Dict[str, Any]],
    detected_lang: Optional[str] = None,
    output_mode: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Route transcript through appropriate normalization path.

    Args:
        words: Raw word list from ASR
        detected_lang: Language code from Whisper ("en", "hi", etc.)
        output_mode: "native", "hinglish", or "english" (default: env or "native")

    Returns:
        Normalized word list with correct script/output.
    """
    if not words:
        return []

    # Determine output mode
    mode = output_mode or DEFAULT_OUTPUT_MODE

    # Detect ASR language
    asr_mode = detect_asr_language(words, detected_lang)
    print(f"[Router] ASR language: {asr_mode} (whisper={detected_lang})")
    print(f"[Router] Output mode: {mode}")

    normalized = []

    for word in words:
        original = word.get("text", word.get("word", "")).strip()
        if not original:
            continue

        # Route to output-specific normalizer
        if mode == OutputMode.NATIVE:
            converted = _normalize_native(original, asr_mode)
        elif mode == OutputMode.HINGLISH:
            converted = _normalize_hinglish(original, asr_mode)
        elif mode == OutputMode.ENGLISH:
            converted = _normalize_english(original, asr_mode)
        else:
            converted = original

        # NEVER drop tokens
        if not converted:
            converted = original

        new_word = word.copy()
        new_word["text"] = converted
        new_word["word"] = converted
        new_word["original"] = original
        new_word["asr_language"] = asr_mode
        new_word["output_mode"] = mode
        normalized.append(new_word)

    print(f"[Router] {len(words)} → {len(normalized)} words")
    return normalized
