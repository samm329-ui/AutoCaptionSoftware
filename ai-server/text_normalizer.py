"""
text_normalizer.py — THE ONLY PLACE TEXT IS EVER MODIFIED

Supported input:
  - Hindi (Devanagari script) → converted to Hinglish (Roman)
  - English (Roman) → kept as-is
  - Hinglish (already Roman) → kept as-is

NOT supported (stripped/skipped):
  - Urdu, Arabic, Bengali, Tamil, Telugu, Gujarati, or any other script
  - If a word arrives in any non-Devanagari foreign script → it is dropped

Pipeline rule:
  This runs ONCE on every word right after ASR.
  Nothing else in the pipeline is allowed to change text after this point.

Input:  {"text": "है", "start": 1.2, "end": 1.5, "lang": "hi"}
Output: {"text": "hai", "start": 1.2, "end": 1.5, "lang": "hi", "original": "है"}
"""

import re
from typing import List, Dict, Any

try:
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate
    INDIC_AVAILABLE = True
except ImportError:
    INDIC_AVAILABLE = False


# ── Common Hindi → Hinglish word map (most accurate, checked by hand) ─────────
HINDI_TO_HINGLISH = {
    # Negation / affirmation
    "नहीं": "nahi",   "नही": "nahi",    "ना": "na",
    "हाँ": "haan",    "हां": "haan",    "हाँ": "haan",
    # Questions
    "क्या": "kya",    "कैसे": "kaise",  "कहाँ": "kahan",
    "कहां": "kahan",  "क्यों": "kyun",  "क्यूं": "kyun",
    "कब": "kab",      "कौन": "kaun",    "कितना": "kitna",
    "कितनी": "kitni", "कितने": "kitne",
    # To be / have
    "है": "hai",      "हैं": "hain",    "था": "tha",
    "थी": "thi",      "थे": "the",      "हो": "ho",
    "हूँ": "hoon",    "हूं": "hoon",
    # Future
    "होगा": "hoga",   "होगी": "hogi",   "होंगे": "honge",
    "करेगा": "karega","करेगी": "karegi", "करेंगे": "karenge",
    # Common verbs
    "करना": "karna",  "करता": "karta",  "करती": "karti",
    "करते": "karte",  "करो": "karo",    "करूँ": "karun",
    "करूँगा": "karunga","करूंगा": "karunga",
    "होना": "hona",   "जाना": "jaana",  "आना": "aana",
    "देना": "dena",   "लेना": "lena",   "कहना": "kehna",
    "बोलना": "bolna", "देखना": "dekhna","सुनना": "sunna",
    "समझना": "samajhna","बताना": "batana","रुकना": "rukna",
    "चलना": "chalna", "बनाना": "banana","लगाना": "lagana",
    "मिलना": "milna", "खाना": "khana",  "पीना": "peena",
    "सोना": "sona",   "उठना": "uthna",  "बैठना": "baithna",
    # Imperative / spoken commands
    "जाओ": "jao",     "आओ": "aao",      "देखो": "dekho",
    "सुनो": "suno",   "बताओ": "batao",  "समझो": "samjho",
    "चलो": "chalo",   "रुको": "ruko",   "करो": "karo",
    "बोलो": "bolo",   "लो": "lo",       "दो": "do",
    # Adverbs / intensifiers
    "बहुत": "bahut",  "एकदम": "ekdam",  "बिल्कुल": "bilkul",
    "काफी": "kaafi",  "ज्यादा": "zyada","कम": "kam",
    "थोड़ा": "thoda", "थोड़ी": "thodi", "जरा": "zara",
    "अभी": "abhi",    "जल्दी": "jaldi", "धीरे": "dheere",
    "सीधे": "seedhe", "अचानक": "achanak","शायद": "shayad",
    "जरूर": "zaroor", "बस": "bas",      "सच": "sach",
    "सच्ची": "sachchi","झूठ": "jhooth", "मतलब": "matlab",
    "असल": "asal",    "दरअसल": "darasal",
    # Conjunctions / connectors
    "और": "aur",      "या": "ya",       "पर": "par",
    "लेकिन": "lekin", "मगर": "magar",   "फिर": "phir",
    "तो": "toh",      "अगर": "agar",    "क्योंकि": "kyunki",
    "इसलिए": "isliye","तभी": "tabhi",   "जब": "jab",
    "तब": "tab",      "जैसे": "jaise",  "वैसे": "waise",
    "तक": "tak",      "से": "se",       "में": "mein",
    "को": "ko",       "का": "ka",       "की": "ki",
    "के": "ke",       "ने": "ne",       "पर": "par",
    "साथ": "saath",   "बिना": "bina",   "लिए": "liye",
    # Adjectives
    "अच्छा": "achha", "अच्छी": "achhi", "अच्छे": "achhe",
    "बुरा": "bura",   "बड़ा": "bada",   "बड़ी": "badi",
    "बड़े": "bade",   "छोटा": "chhota", "छोटी": "chhoti",
    "नया": "naya",    "नई": "nayi",     "पुराना": "purana",
    "सही": "sahi",    "गलत": "galat",   "ठीक": "theek",
    "पूरा": "poora",  "असली": "asli",   "झूठा": "jhoota",
    "सस्ता": "sasta", "महंगा": "mahnga","अलग": "alag",
    "एक": "ek",       "दो": "do",       "तीन": "teen",
    "पहला": "pehla",  "दूसरा": "doosra","आखिरी": "aakhri",
    # Pronouns
    "मैं": "main",    "तुम": "tum",     "आप": "aap",
    "हम": "hum",      "वो": "wo",       "यह": "yeh",
    "वह": "woh",      "ये": "ye",       "वे": "ve",
    "मेरा": "mera",   "मेरी": "meri",   "मेरे": "mere",
    "तुम्हारा": "tumhara","तुम्हारी": "tumhari",
    "हमारा": "hamara","हमारी": "hamari","हमारे": "hamare",
    "अपना": "apna",   "अपनी": "apni",   "अपने": "apne",
    "किसी": "kisi",   "कोई": "koi",     "कुछ": "kuch",
    "सब": "sab",      "सभी": "sabhi",   "कोई नहीं": "koi nahi",
    "इसका": "iska",   "उसका": "uska",   "इसकी": "iski",
    # Time / place
    "आज": "aaj",      "कल": "kal",      "परसों": "parso",
    "अभी": "abhi",    "बाद": "baad",    "पहले": "pehle",
    "यहाँ": "yahan",  "यहां": "yahan",  "वहाँ": "wahan",
    "वहां": "wahan",  "जहाँ": "jahan",  "जहां": "jahan",
    "ऊपर": "upar",    "नीचे": "neeche", "अंदर": "andar",
    "बाहर": "bahar",  "आगे": "aage",    "पीछे": "peechhe",
    "दाएं": "dayen",  "बाएं": "bayen",
    # Common nouns
    "पैसा": "paisa",  "पैसे": "paise",  "काम": "kaam",
    "समय": "samay",   "बात": "baat",    "बातें": "baatein",
    "चीज": "cheez",   "लोग": "log",     "दोस्त": "dost",
    "भाई": "bhai",    "यार": "yaar",    "दिन": "din",
    "साल": "saal",    "घर": "ghar",     "जगह": "jagah",
    "रास्ता": "raasta","दुनिया": "duniya","जिंदगी": "zindagi",
    "जीवन": "jeevan", "देश": "desh",    "शहर": "sheher",
    "गाँव": "gaon",   "परिवार": "parivaar","माँ": "maa",
    "बाप": "baap",    "भैया": "bhaiya",
    # Business / content creator terms (common in Hinglish videos)
    "बिजनेस": "business","मार्जिन": "margin","नंबर": "number",
    "सेल्स": "sales", "प्राइस": "price","प्रॉफिट": "profit",
    "बजट": "budget",  "मार्केट": "market","कस्टमर": "customer",
    "स्ट्रैटेजी": "strategy","वीडियो": "video","चैनल": "channel",
    "सब्सक्राइब": "subscribe","फॉलो": "follow","लाइक": "like",
    "शेयर": "share",  "कमेंट": "comment","ट्रेंड": "trend",
    "कंटेंट": "content","ब्रांड": "brand","प्रोडक्ट": "product",
    # Fillers common in spoken Hinglish
    "देखिए": "dekhiye","सुनिए": "suniye","जानिए": "janiye",
    "जानते": "jaante","जानती": "jaanti","जानता": "jaanta",
    "समझे": "samjhe", "लगता": "lagta",  "लगती": "lagti",
    "मिला": "mila",   "मिली": "mili",   "हुआ": "hua",
    "हुई": "hui",     "हुए": "hue",     "रहा": "raha",
    "रही": "rahi",    "रहे": "rahe",    "आया": "aaya",
    "आई": "aayi",     "गया": "gaya",    "गई": "gayi",
    "दिया": "diya",   "दी": "di",       "लिया": "liya",
    "कहा": "kaha",    "सुना": "suna",   "देखा": "dekha",
    "पता": "pata",    "नाम": "naam",
}

# ── Devanagari character-level fallback map ────────────────────────────────────
DEVANAGARI_CHAR_MAP = {
    # Consonants
    'क': 'k',   'ख': 'kh',  'ग': 'g',   'घ': 'gh',  'ङ': 'ng',
    'च': 'ch',  'छ': 'chh', 'ज': 'j',   'झ': 'jh',  'ञ': 'n',
    'ट': 't',   'ठ': 'th',  'ड': 'd',   'ढ': 'dh',  'ण': 'n',
    'त': 't',   'थ': 'th',  'द': 'd',   'ध': 'dh',  'न': 'n',
    'प': 'p',   'फ': 'ph',  'ब': 'b',   'भ': 'bh',  'म': 'm',
    'य': 'y',   'र': 'r',   'ल': 'l',   'व': 'v',   'ळ': 'l',
    'श': 'sh',  'ष': 'sh',  'स': 's',   'ह': 'h',
    # Vowel marks (matras)
    'ा': 'aa', 'ि': 'i',  'ी': 'ee', 'ु': 'u',  'ू': 'oo',
    'े': 'e',  'ै': 'ai', 'ो': 'o',  'ौ': 'au',
    'ं': 'n',  'ँ': 'n',  'ः': 'h',  '्': '',
    'ऽ': '',   '।': '.',  '॥': '.',
    # Independent vowels
    'अ': 'a',  'आ': 'aa', 'इ': 'i',  'ई': 'ee',
    'उ': 'u',  'ऊ': 'oo', 'ए': 'e',  'ऐ': 'ai',
    'ओ': 'o',  'औ': 'au', 'ऋ': 'ri',
    # Devanagari numerals → ASCII
    '०': '0',  '१': '1',  '२': '2',  '३': '3',  '४': '4',
    '५': '5',  '६': '6',  '७': '7',  '८': '8',  '९': '9',
}

# ── Script detection helpers ───────────────────────────────────────────────────

def _has_devanagari(text: str) -> bool:
    return any(0x0900 <= ord(c) <= 0x097F for c in text)

def _has_foreign_script(text: str) -> bool:
    """
    Returns True if text contains any non-Devanagari, non-Latin script.
    This covers Urdu/Arabic (0x0600-0x06FF), Bengali (0x0980-0x09FF),
    Tamil (0x0B80-0x0BFF), Telugu (0x0C00-0x0C7F), Gujarati (0x0A80-0x0AFF),
    Kannada (0x0C80-0x0CFF), Malayalam (0x0D00-0x0D7F), etc.
    """
    FOREIGN_RANGES = [
        (0x0600, 0x06FF),  # Arabic / Urdu
        (0x0980, 0x09FF),  # Bengali
        (0x0A00, 0x0A7F),  # Gurmukhi (Punjabi)
        (0x0A80, 0x0AFF),  # Gujarati
        (0x0B00, 0x0B7F),  # Odia
        (0x0B80, 0x0BFF),  # Tamil
        (0x0C00, 0x0C7F),  # Telugu
        (0x0C80, 0x0CFF),  # Kannada
        (0x0D00, 0x0D7F),  # Malayalam
        (0x0D80, 0x0DFF),  # Sinhala
        (0x0E00, 0x0E7F),  # Thai
        (0x0F00, 0x0FFF),  # Tibetan
        (0x1000, 0x109F),  # Myanmar
        (0x4E00, 0x9FFF),  # CJK (Chinese/Japanese/Korean)
        (0xAC00, 0xD7AF),  # Korean Hangul
    ]
    for c in text:
        cp = ord(c)
        for start, end in FOREIGN_RANGES:
            if start <= cp <= end:
                return True
    return False

def _is_roman(text: str) -> bool:
    """True if text is already in Roman/Latin script (English or Hinglish)."""
    alpha = [c for c in text if c.isalpha()]
    if not alpha:
        return True  # only numbers / punctuation → treat as Roman
    latin = sum(1 for c in alpha if ord(c) < 128)
    return (latin / len(alpha)) >= 0.85


# ── Word-level conversion ──────────────────────────────────────────────────────

def _char_transliterate(word: str) -> str:
    """Devanagari → Roman using char map. Used as fallback."""
    result = []
    for char in word:
        result.append(DEVANAGARI_CHAR_MAP.get(char, char))
    return ''.join(result)

def _convert_devanagari_word(word: str) -> str:
    """Convert a single Devanagari word to Hinglish Roman."""
    # Strip punctuation for lookup
    clean = re.sub(r'[^\u0900-\u097F]', '', word)
    if not clean:
        return word

    # 1. Check common map (most natural Hinglish output)
    if clean in HINDI_TO_HINGLISH:
        return HINDI_TO_HINGLISH[clean]

    # 2. Try indic_transliteration library
    if INDIC_AVAILABLE:
        try:
            result = transliterate(clean, sanscript.DEVANAGARI, sanscript.ITRANS)
            # Clean up ITRANS artifacts for natural Hinglish readability
            result = result.replace('aa', 'aa').replace('ii', 'i').replace('uu', 'u')
            result = result.replace('N', 'n').replace('H', 'h').replace('~', '')
            result = result.strip()
            if result:
                return result
        except Exception:
            pass

    # 3. Character-level fallback
    return _char_transliterate(clean)


def force_roman(text: str) -> str:
    """
    FINAL SAFETY NET — runs at the very end of every normalization path.

    Strips any character that is not:
      - ASCII (ord < 128): covers all English + Hinglish Roman characters,
        digits, punctuation, spaces
      - Whitespace

    This guarantees 100% clean output even if a transliteration step
    partially failed and leaked a non-Roman character through.

    No exceptions. No bypass. This always runs last.
    """
    return ''.join(c for c in text if ord(c) < 128 or c.isspace()).strip()


def normalize_word(word_text: str) -> str:
    """
    Normalize a single word token to clean Roman/Hinglish.

    Returns:
      - Original text if already Roman (English/Hinglish)
      - Converted Hinglish if Devanagari input
      - Empty string if foreign script (Urdu, Bengali, etc.) — caller will skip it

    force_roman() runs at the end of EVERY path as the final safety net.
    """
    if not word_text:
        return ''

    text = word_text.strip()

    # Already Roman → safety-net pass and return
    if _is_roman(text):
        return force_roman(text)

    # Foreign script (Urdu, Bengali, Arabic, etc.) → DROP completely
    # Do this BEFORE force_roman so we drop the whole word, not just characters
    if _has_foreign_script(text):
        return ''

    # Pure Devanagari
    if _has_devanagari(text):
        punct_match = re.search(r'[^\u0900-\u097F\s]+$', text)
        punct = punct_match.group() if punct_match else ''
        devanagari_only = re.sub(r'[^\u0900-\u097F]', '', text)
        converted = _convert_devanagari_word(devanagari_only)
        return force_roman(converted + punct)

    # Mixed Devanagari + Roman (e.g. "call करूँगा")
    parts = re.split(r'([\u0900-\u097F]+)', text)
    result = []
    for part in parts:
        if _has_devanagari(part):
            result.append(_convert_devanagari_word(part))
        elif part:
            result.append(part)
    return force_roman(''.join(result))


def normalize_words(words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    THE ONE NORMALIZATION PASS — run once right after ASR, never again.

    - Hindi (Devanagari) → Hinglish Roman
    - English → kept as-is
    - Urdu, Bengali, Arabic, any other script → word is DROPPED entirely

    Each word dict must have "text", "start", "end".
    Returns cleaned list with "original" field added for debugging.
    """
    normalized = []

    for word in words:
        original = word.get('text', '')
        converted = normalize_word(original)

        if converted:
            new_word = word.copy()
            new_word['text'] = converted
            new_word['original'] = original
            normalized.append(new_word)
        else:
            # Foreign script word — skip it, log it
            if original.strip():
                print(f"[TextNormalizer] Dropped foreign-script token: {repr(original)}")

    return normalized


def detect_emphasis(text: str) -> List[Dict[str, Any]]:
    """
    Detect words that should be visually emphasized in captions.
    Input must already be Roman/Hinglish text.
    """
    patterns = [
        (r'\b(nahi|nahi|never|no|not|mat|bilkul\s+nahi|na)\b',              'negation'),
        (r'\b(bahut|very|really|ekdam|bilkul|kaafi|zyada|too|so)\b',   'intensifier'),
        (r'\b\d+\b',                                                    'number'),
        (r'\b(rupees?|rs\.?|₹|dollars?|percent|%|cr|lakh|crore)\b',   'money'),
        (r'\b(kya|kaise|kab|kahan|kyun|kaun|what|why|how|when|where|who)\b', 'question'),
        (r'\b(kyunki|because|isliye|lekin|but|phir|aur|magar)\b',      'connector'),
        (r'\b[A-Z]{2,}\b',                                              'acronym'),
        (r'\b(business|profit|sales|market|views|subscribe|follow|brand|product|strategy|customer|revenue|content|channel|trend)\b', 'keyword'),
    ]

    emphasis = []
    text_lower = text.lower()
    for pattern, etype in patterns:
        for match in re.finditer(pattern, text_lower, re.IGNORECASE):
            emphasis.append({
                'word':       text[match.start():match.end()],
                'start_char': match.start(),
                'end_char':   match.end(),
                'type':       etype
            })

    return emphasis