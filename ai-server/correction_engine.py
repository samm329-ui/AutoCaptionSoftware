from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

from rapidfuzz import fuzz, process

BASE_DIR = Path(__file__).resolve().parent
RESOURCE_DIR = BASE_DIR / "resources"
GLOSSARY_DIR = BASE_DIR / "glossaries"
DEFAULT_LEXICON_PATH = RESOURCE_DIR / "common_english_words.txt"

URL_RE = re.compile(r"^(?:https?://|www\.|mailto:|@)[^\s]+$", re.IGNORECASE)
NUMERIC_RE = re.compile(r"^[\d.,:+\-/%₹$€£]+$")
LATIN_RE = re.compile(r"[A-Za-z]")

# Keep punctuation handling simple and fully ASCII-safe.
LEADING_PUNCT = '"\'([{'
TRAILING_PUNCT = '"\')]}.,!?;:'

HINGLISH_CANONICAL = {
    "fir": "phir",
    "phir": "phir",
    "nahi": "nahi",
    "nahin": "nahi",
    "nai": "nahi",
    "hai": "hai",
    "hain": "hain",
    "ho": "ho",
    "main": "main",
    "mai": "main",
    "me": "mein",
    "mein": "mein",
    "aur": "aur",
    "lekin": "lekin",
    "kyunki": "kyunki",
    "kyun": "kyun",
    "kya": "kya",
    "kaise": "kaise",
    "kahan": "kahan",
    "kab": "kab",
    "kaun": "kaun",
    "ye": "ye",
    "yeh": "yeh",
    "wo": "wo",
    "woh": "woh",
    "isme": "ismein",
    "ismein": "ismein",
    "usme": "usmein",
    "usmein": "usmein",
    "to": "toh",
    "toh": "toh",
    "bahut": "bahut",
    "bilkul": "bilkul",
    "kaafi": "kaafi",
    "zyada": "zyada",
    "thoda": "thoda",
    "thodi": "thodi",
}

DETERMINISTIC_FIXES = {
    "phr": "phir",
    "fir": "phir",
    "phirr": "phir",
    "fhir": "phir",
    "mrgin": "margin",
    "marjin": "margin",
    "margen": "margin",
    "nmbrz": "numbers",
    "nmbr": "number",
    "nambar": "number",
    "numbr": "number",
    "buisness": "business",
    "bisness": "business",
    "biznes": "business",
    "biznis": "business",
    "prfit": "profit",
    "proft": "profit",
    "mkt": "market",
    "mrkt": "market",
    "kstmr": "customer",
    "custmr": "customer",
    "rvnju": "revenue",
    "revnue": "revenue",
    "kntnt": "content",
    "prdkt": "product",
    "strtji": "strategy",
    "stratyji": "strategy",
    "seels": "sales",
    "sels": "sales",
    "prais": "price",
    "pris": "price",
    "budjet": "budget",
    "bujet": "budget",
    "akount": "account",
    "cant": "can't",
    "dont": "don't",
    "wont": "won't",
    "isnt": "isn't",
    "arent": "aren't",
    "wasnt": "wasn't",
    "didnt": "didn't",
    "doesnt": "doesn't",
}

HINGLISH_SAFE = set(HINGLISH_CANONICAL.keys()) | {
    "business", "margin", "profit", "sales", "numbers", "strategy", "market", "customer", "revenue",
    "content", "channel", "brand", "product", "video", "subscribe", "follow", "like", "share",
    "comment", "trend", "price", "budget", "account", "views", "growth", "target", "audience",
    "engagement", "analytics", "performance", "conversion", "retention", "acquisition", "campaign",
    "creative", "organic", "paid", "reach", "impressions", "clicks", "website", "landing", "page",
    "social", "media", "platform", "algorithm", "monetization", "advertisement", "sponsorship",
    "collaboration", "partnership", "phir", "fir", "hai", "nahi", "nahin", "mein", "main", "aur",
    "lekin", "kyunki", "kyun", "kya", "kaise", "kab", "kahan", "wo", "woh", "ye", "yeh", "tab",
    "toh", "bahut", "bilkul", "kaafi", "zyada", "thoda", "thodi", "ho", "hain", "tha", "thi", "the",
    "karna", "karta", "karti", "karte", "jana", "jaana", "aana", "dena", "lena", "kehna", "sunna",
    "bolna", "samajhna", "batana", "rukna", "chalna", "banana", "lagana", "milna",
}


def load_word_list(path: Path) -> list[str]:
    if not path.exists():
        return []
    out: list[str] = []
    for line in path.read_text(encoding='utf-8', errors='ignore').splitlines():
        w = line.strip().lower()
        if not w or w.startswith('#'):
            continue
        if re.fullmatch(r"[a-z][a-z\-']*", w):
            out.append(w)
    return out


def script_of(text: str) -> str:
    if not text:
        return "unknown"
    if any(0x0900 <= ord(c) <= 0x097F for c in text):
        return "devanagari"
    if any(0x0600 <= ord(c) <= 0x06FF for c in text):
        return "arabic"
    if any(c.isalpha() and ord(c) < 128 for c in text):
        return "latin"
    return "unknown"


def phonetic_key(token: str) -> str:
    token = re.sub(r"[^a-z]", "", token.lower())
    if not token:
        return ""
    token = re.sub(r"[aeiouy]+", "", token)
    token = re.sub(r"(.)\1+", r"\1", token)
    return token


def split_punct(token: str) -> tuple[str, str, str]:
    token = token.strip()
    if not token:
        return "", "", ""

    prefix = []
    suffix = []

    while token and token[0] in LEADING_PUNCT:
        prefix.append(token[0])
        token = token[1:]

    while token and token[-1] in TRAILING_PUNCT:
        suffix.append(token[-1])
        token = token[:-1]

    return ''.join(prefix), token, ''.join(reversed(suffix))


def is_probably_acronym(token: str) -> bool:
    core = re.sub(r"[^A-Za-z]", "", token)
    return len(core) >= 2 and core.isupper()


class TextRepairEngine:
    def __init__(self) -> None:
        lexicon = load_word_list(DEFAULT_LEXICON_PATH)
        extra: list[str] = []
        if GLOSSARY_DIR.exists():
            for file in sorted(GLOSSARY_DIR.glob('*.txt')):
                extra.extend(load_word_list(file))

        merged: list[str] = []
        seen: set[str] = set()
        for word in extra + lexicon + sorted(HINGLISH_SAFE):
            if word not in seen:
                seen.add(word)
                merged.append(word)

        self.lexicon = merged
        self.lexicon_set = set(merged)
        self.phonetic_index: dict[str, str] = {}
        for word in merged:
            key = phonetic_key(word)
            if key and key not in self.phonetic_index:
                self.phonetic_index[key] = word

    def _best_lexicon_match(self, token: str, min_score: int = 88) -> Optional[str]:
        if not self.lexicon:
            return None
        key = phonetic_key(token)
        if key and key in self.phonetic_index:
            candidate = self.phonetic_index[key]
            if candidate != token:
                return candidate
        match = process.extractOne(token, self.lexicon, scorer=fuzz.WRatio)
        if not match:
            return None
        candidate, score, _ = match
        return candidate if score >= min_score else None

    def repair_token(self, token: str, *, doc_lang: Optional[str] = None, source_script: Optional[str] = None, score: Optional[float] = None, english_mode: bool = False) -> str:
        """
        english_mode=True: skip HINGLISH_CANONICAL rewrites entirely.
        Prevents 'to' becoming 'toh', 'me' becoming 'mein', etc. in English videos.
        """
        if not token:
            return ""

        prefix, core, suffix = split_punct(token.strip())
        if not core:
            return prefix + suffix

        lower = core.lower()

        if is_probably_acronym(core) or NUMERIC_RE.fullmatch(core) or URL_RE.fullmatch(core):
            return prefix + core + suffix

        if lower in HINGLISH_SAFE or lower in self.lexicon_set:
            # In English mode: skip Hinglish canonical rewrites entirely
            if english_mode:
                return prefix + lower + suffix
            return prefix + HINGLISH_CANONICAL.get(lower, lower) + suffix

        lang = (doc_lang or "").lower()
        if lang in {"hi", "hindi", "ur", "urdu"} or source_script in {"devanagari", "arabic"}:
            if lower in DETERMINISTIC_FIXES:
                return prefix + DETERMINISTIC_FIXES[lower] + suffix
            if lower in HINGLISH_CANONICAL:
                return prefix + HINGLISH_CANONICAL[lower] + suffix

        if LATIN_RE.search(core) and lower in self.lexicon_set:
            return prefix + lower + suffix

        likely_broken = (
            len(lower) >= 4 and (
                sum(ch in 'aeiou' for ch in lower) <= 1
                or re.search(r'(.)\1\1+', lower) is not None
                or lower.endswith(('z', 'x', 'q'))
                or len(re.sub(r'[^a-z]', '', lower)) >= 4
            )
        )
        if likely_broken:
            threshold = 86 if lang in {"hi", "hindi", "ur", "urdu"} else 91
            candidate = self._best_lexicon_match(lower, min_score=threshold)
            if candidate:
                if len(lower) <= 3 and candidate not in HINGLISH_SAFE:
                    return prefix + core + suffix
                return prefix + candidate + suffix

        if lang in {"hi", "hindi", "ur", "urdu"}:
            if lower in DETERMINISTIC_FIXES:
                return prefix + DETERMINISTIC_FIXES[lower] + suffix
            return prefix + lower + suffix

        return prefix + lower + suffix


REPAIR_ENGINE = TextRepairEngine()
