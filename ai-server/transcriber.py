"""
WhisperX transcription with forced alignment for word-level timestamps.
Supports Bengali (bn) and English (en) with auto-detection.
"""

import os
FFMPEG_PATH = r"C:\Users\jishu\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin"
os.environ["PATH"] = FFMPEG_PATH + os.pathsep + os.environ.get("PATH", "")

try:
    import whisperx
except ImportError:
    whisperx = None
import torch
import gc
from typing import Optional


# ─── Config ───────────────────────────────────────────────────
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "int8"
BATCH_SIZE = 16 if DEVICE == "cuda" else 4
MODEL_SIZE = "base"


# ─── Urdu to Devanagari Converter ─────────────────────────────
# Common Hinglish/Urdu words dictionary for accurate conversion
URDU_WORD_DICT = {
    # Common words
    'چار': 'चार', 'بیسنسس': 'बिजनेस', 'پھر': 'फिर', 'بھی': 'भी',
    'ایک': 'एक', 'اونٹھ': 'ऊँट', 'خالی': 'खाली', 'طور': 'तौर',
    'نور': 'नूर', 'ہے': 'है', 'لیکن': 'लेकिन', 'شاید': 'शायद',
    'مارجن': 'मार्जिन', 'نہیں': 'नहीं', 'بیسلیں': 'बेसिल्स',
    'نمبرز': 'नंबर्स', 'بڑے': 'बड़े', 'دیکھتے': 'देखते',
    'ہیں': 'हैं', 'پر': 'पर', 'پیسا': 'पैसा', 'ہوتا': 'होता',
    'آج': 'आज', 'یہ': 'यह', 'اپنا': 'अपना', 'چکڑو': 'चकड़ो',
    'کیسے': 'कैसे', 'کرنا': 'करना', 'کیاکشن': 'क्या एक्शन',
    'میں': 'में', 'دیکھلو': 'देख लो', 'کیا': 'क्या',
    'اور': 'और', 'کا': 'का', 'کی': 'की', 'کے': 'کे',
    'کو': 'को', 'سے': 'से', 'پہ': 'पे', 'نے': 'ने',
    'والا': 'वाला', 'والی': 'वाली', 'والے': 'वाले',
    'یہاں': 'यहाँ', 'وہاں': 'वहाँ', 'کیوں': 'क्यों',
    'کب': 'कब', 'کہاں': 'कहाँ', 'کون': 'कौन',
    'مجھے': 'मुझे', 'مجھ': 'मुझ', 'تم': 'तुम',
    'تمہارا': 'तुम्हारा', 'ہمارا': 'हमारा',
    'اپنی': 'अपनी', 'اپنے': 'अपने', 'بہت': 'बहुत',
    'کم': 'कम', 'زیادہ': 'ज्यादा', 'اس': 'इस',
    'اما': 'पर', 'ہر': 'हर', 'کچھ': 'कुछ', 'سب': 'सब',
    'دن': 'दिन', 'رات': 'रात', 'سونा': 'सोना',
    'کھانا': 'खाना', 'پینا': 'पीना', 'جانا': 'जाना',
    'آنا': 'आنا', 'کیسی': 'कैसी', 'کیسے': 'कैसे',
    'ہماری': 'हमारی', 'تمہاری': 'तुम्हारی', 'اپنے': 'अपने',
    'وہ': 'वह', 'یہ': 'यह', 'ہم': 'हम', 'میں': 'में',
    'اگر': 'अगर', 'تو': 'तो', 'لے': 'ले', 'دے': 'दे',
    'کر': 'कर', 'ہو': 'हो', 'گی': 'गी', 'گا': 'गा',
    'گے': 'गे', 'تھا': 'था', 'تھی': 'थी', 'تھے': 'थे',
    'ہوئی': 'हुई', 'ہوا': 'हुआ', 'ہوئے': 'हुए',
    'چاہتے': 'चाहते', 'چاہتا': 'चाहता', 'چاہتی': 'चाहती',
    'کرتا': 'करता', 'کرتی': 'करती', 'کرتے': 'करते',
    'جاتا': 'जाता', 'جاتی': 'जाती', 'جاتے': 'जाते',
    'کہا': 'कहा', 'بولتا': 'बोलता', 'بولتی': 'बोलती',
    'دیتا': 'देता', 'دیتی': 'देती', 'دیتے': 'देते',
    'لیتا': 'लेता', 'لیتی': 'लेती', 'لیتے': 'लेतے',
    'بڑا': 'बड़ा', 'بڑی': 'बड़ी', 'چھوٹا': 'छोटा', 'چھوٹی': 'छोटी',
    'اچھا': 'अच्छा', 'اچھی': 'अच्छی', 'بری': 'बुरी', 'برا': 'बुरा',
    'نیا': 'नया', 'نئی': 'नई', 'نئے': 'नए', 'پرانا': 'पुरानا',
    'بڑے': 'बड़े', 'چھوٹے': 'छोटे', 'اچھے': 'अच्छے', 'نئے': 'नए',
}

# Character-level mapping fallback for unknown words
URDU_CHAR_MAP = {
    'ا': 'अ', 'آ': 'आ', 'ب': 'ब', 'پ': 'प', 'ت': 'त', 'ٹ': 'ट',
    'ج': 'ज', 'چ': 'च', 'ح': 'ह', 'خ': 'ख', 'د': 'द', 'ڈ': 'ड',
    'ر': 'र', 'ڑ': 'ऱ', 'ز': 'ज़', 'س': 'स', 'ش': 'श', 'ص': 'स',
    'ض': 'द', 'ط': 'त', 'ظ': 'ज़', 'ع': 'अ', 'غ': 'घ',
    'ف': 'फ', 'ق': 'क', 'ک': 'क', 'گ': 'ग', 'ل': 'ल', 'म': 'म',
    'ن': 'न', 'ں': 'न', 'ہ': 'ह', 'و': 'व', 'ی': 'य', 'ے': 'ए',
    'ئ': 'इ', 'ؤ': 'उ', 'أ': 'अ', 'إ': 'इ',
    'َ': '', 'ِ': '', 'ُ': '', 'ّ': '', 'ْ': '', 'ٰ': '',
    ' ': ' ', '۔': '।', '،': ',', '؟': '?',
}


def is_urdu_text(text: str) -> bool:
    """Check if text contains Urdu characters."""
    if not text:
        return False
    urdu_chars = set('ابتثجحخدذرزسشصضطظعغفقکگلمنهوىئوءآأؤإےۓںہۃۂ')
    return any(c in urdu_chars for c in text)


def convert_urdu_word(word: str) -> str:
    """Convert a single Urdu word to Devanagari."""
    if word in URDU_WORD_DICT:
        return URDU_WORD_DICT[word]
    
    # Fallback: character-by-character mapping
    result = []
    for char in word:
        mapped = URDU_CHAR_MAP.get(char, char)
        result.append(mapped)
    return ''.join(result)


def convert_urdu_to_devanagari(text: str) -> str:
    """
    Convert Urdu script to Hindi Devanagari script.
    Uses word dictionary for common words, character mapping for unknown.
    """
    if not text or not is_urdu_text(text):
        return text
    
    words = text.split()
    converted = [convert_urdu_word(w) for w in words]
    return ' '.join(converted)


# ─── Transliteration (fallback if ai4bharat not available) ────
AI4BHARAT_AVAILABLE = False


def convert_to_roman(text: str, source_lang: str = "hi") -> str:
    """Convert Hindi/Urdu script to Roman transliteration."""
    return text  # Not implemented - use convert_urdu_to_devanagari instead


def transcribe_audio(audio_path: str, language: Optional[str] = "auto") -> dict:
    """
    Transcribe audio using WhisperX with word-level timestamps.

    Args:
        audio_path: Path to the WAV audio file (16kHz mono).
        language: Language code ('bn', 'en', 'hi', 'auto').

    Returns:
        dict with 'segments' and 'language'.
    """
    # Force Hindi model for Hinglish content
    if language == "auto" or language == "hi":
        language = "hi"
    
    # Step 1: Load model
    if whisperx is None:
        print("⚠️ WhisperX is not installed. Returning dummy transcript for testing.")
        return {
            "segments": [
                {
                    "text": "This is a dummy transcript because WhisperX is missing.",
                    "start": 0.0,
                    "end": 3.0,
                    "words": [
                        {"word": "This", "start": 0.0, "end": 0.5},
                        {"word": "is", "start": 0.5, "end": 1.0},
                        {"word": "a", "start": 1.0, "end": 1.5},
                        {"word": "dummy", "start": 1.5, "end": 2.0},
                        {"word": "transcript", "start": 2.0, "end": 3.0},
                    ]
                }
            ],
            "language": "en"
        }

    model = whisperx.load_model(
        MODEL_SIZE,
        DEVICE,
        compute_type=COMPUTE_TYPE,
        language=language,
    )

    # Step 2: Transcribe
    audio = whisperx.load_audio(audio_path)
    result = model.transcribe(
        audio,
        batch_size=BATCH_SIZE,
        language=language,
    )

    detected_language = result.get("language", language)

    # Step 3: Forced alignment for word-level timestamps
    try:
        model_a, metadata = whisperx.load_align_model(
            language_code=detected_language,
            device=DEVICE,
        )
        result = whisperx.align(
            result["segments"],
            model_a,
            metadata,
            audio,
            DEVICE,
            return_char_alignments=False,
        )
        del model_a
    except Exception as e:
        print(f"⚠️ Alignment failed for language '{detected_language}': {e}")
        print("   Falling back to segment-level timestamps.")

    # Cleanup GPU memory
    del model
    gc.collect()
    if DEVICE == "cuda":
        torch.cuda.empty_cache()

    # Convert Urdu script to Devanagari for Hindi/Hinglish content
    if language == "hi" and is_urdu_text(result.get("segments", [{}])[0].get("text", "")):
        segments = result.get("segments", [])
        for seg in segments:
            if "text" in seg:
                seg["text"] = convert_urdu_to_devanagari(seg["text"])
            if "words" in seg:
                for word_info in seg["words"]:
                    if "word" in word_info:
                        word_info["word"] = convert_urdu_to_devanagari(word_info["word"])
        result["segments"] = segments
        print(f"✅ Converted Urdu to Devanagari")

    return {
        "segments": result.get("segments", []),
        "language": detected_language,
    }


def group_words(segments: list, words_per_group: int = 3) -> list:
    """
    Group word-level timestamps into display groups.

    Args:
        segments: WhisperX segments with word-level data.
        words_per_group: Number of words per caption group (default: 3).

    Returns:
        List of word groups.
    """
    all_words = []
    for seg in segments:
        for word_info in seg.get("words", []):
            if "word" in word_info and "start" in word_info and "end" in word_info:
                all_words.append({
                    "word": word_info["word"].strip(),
                    "start": word_info["start"],
                    "end": word_info["end"],
                })

    if not all_words:
        groups = []
        for seg in segments:
            groups.append({
                "text": seg.get("text", "").strip(),
                "words": [{"word": seg.get("text", "").strip(), "start": seg["start"], "end": seg["end"]}],
                "start": seg["start"],
                "end": seg["end"],
            })
        return groups

    PUNCTUATION_BREAKS = {".", "?", "!", ",", ";", "।"}
    groups = []
    current_group = []

    for word in all_words:
        current_group.append(word)
        should_break = (
            len(current_group) >= words_per_group
            or any(word["word"].endswith(p) for p in PUNCTUATION_BREAKS)
        )

        if should_break:
            group_text = " ".join(w["word"] for w in current_group)
            groups.append({
                "text": group_text,
                "words": current_group.copy(),
                "start": current_group[0]["start"],
                "end": current_group[-1]["end"],
            })
            current_group = []

    if current_group:
        group_text = " ".join(w["word"] for w in current_group)
        groups.append({
            "text": group_text,
            "words": current_group.copy(),
            "start": current_group[0]["start"],
            "end": current_group[-1]["end"],
        })

    return groups
