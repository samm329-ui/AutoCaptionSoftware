"""
correction_engine.py

Deterministic correction layer for local CaptionAI deployments.

Goals:
- Correct a small set of high-frequency Whisper mishears.
- Keep valid Hinglish / English tokens unchanged.
- Avoid broad rewrites or hallucination-prone behavior.
- Provide a short vocabulary hint for Whisper initial_prompt.

This module is intentionally dependency-free (stdlib only).
"""

from __future__ import annotations

import difflib
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


PHONETIC_CORRECTIONS: Dict[str, str] = {
    # Business / creator words
    "bijlin": "business",
    "bislin": "business",
    "bijnes": "business",
    "bijalin": "business",
    "bijlis": "business",
    "bijnas": "business",
    "bizlin": "business",
    "biznes": "business",
    "biznis": "business",

    "marjin": "margin",
    "marjan": "margin",
    "mrjn": "margin",
    "marjn": "margin",

    "nambar": "number",
    "nambr": "number",
    "nmbr": "number",
    "nmbrz": "numbers",
    "nambrz": "numbers",
    "numbr": "number",
    "numbrs": "numbers",
    "nombr": "number",
    "nomber": "number",

    "strtji": "strategy",
    "stratyji": "strategy",
    "stratiji": "strategy",
    "stretji": "strategy",
    "stratji": "strategy",

    "sels": "sales",
    "seils": "sales",
    "selz": "sales",
    "seilz": "sales",
    "seyl": "sales",

    "pris": "price",
    "prais": "price",
    "prys": "price",
    "prays": "price",
    "pryse": "price",

    "prfit": "profit",
    "prafit": "profit",
    "prafeet": "profit",
    "profeet": "profit",

    "bjt": "budget",
    "bajet": "budget",
    "budjet": "budget",
    "bajat": "budget",
    "bajit": "budget",

    "mrkt": "market",
    "markit": "market",
    "markeet": "market",
    "markat": "market",
    "markate": "market",

    "kstmr": "customer",
    "kastmar": "customer",
    "kastumar": "customer",
    "kastamar": "customer",
    "kastemer": "customer",

    "rvnju": "revenue",
    "revnu": "revenue",
    "revnyu": "revenue",
    "ravenyu": "revenue",
    "ravenu": "revenue",

    "kntnt": "content",
    "kantent": "content",
    "kantnt": "content",
    "kantant": "content",
    "kontant": "content",

    "brnd": "brand",
    "braand": "brand",
    "brend": "brand",
    "brant": "brand",
    "brandt": "brand",

    "prdkt": "product",
    "pradakt": "product",
    "prodakt": "product",
    "pradact": "product",
    "prodact": "product",

    "vdyo": "video",
    "vidiyo": "video",
    "vidyo": "video",
    "vdeo": "video",
    "veedyo": "video",

    "chnal": "channel",
    "chanel": "channel",
    "chanal": "channel",
    "chaenal": "channel",
    "chanl": "channel",

    "sabskrayb": "subscribe",
    "sabskriyb": "subscribe",
    "sabskraib": "subscribe",
    "sabscrayb": "subscribe",
    "sabscribe": "subscribe",

    "folo": "follow",
    "falu": "follow",
    "pholo": "follow",
    "folou": "follow",
    "phalou": "follow",

    "layk": "like",
    "laik": "like",
    "lyke": "like",
    "lyk": "like",

    "sher": "share",
    "sheyar": "share",
    "shear": "share",
    "sheyr": "share",

    "kament": "comment",
    "kamnt": "comment",
    "coment": "comment",
    "kamant": "comment",
    "komant": "comment",

    "trend": "trend",
    "trnd": "trend",
    "trand": "trend",

    "akant": "account",
    "akaunt": "account",
    "akount": "account",
    "acount": "account",
    "acaunt": "account",

    "vyuz": "views",
    "vyus": "views",
    "viuz": "views",
    "vius": "views",
    "vyooz": "views",

    # Common contractions
    "cant": "can't",
    "dont": "don't",
    "wont": "won't",
    "isnt": "isn't",
    "arent": "aren't",
    "wasnt": "wasn't",
    "didnt": "didn't",
    "doesnt": "doesn't",
}

_COMMON_WORDS = """
a an and are as at be been being but by can could did do does doing done for from get got
had has have he her here him his i if in into is it its just let like me may might my no not
of on or our out over said say says she should so than that their them then there these
they this those to too under up us very was were we what when where who why will with would
you your
aur ya par lekin magar phir toh agar kyunki isliye tab jab mein se ka ki ke ne saath bina liye
bahut bilkul kaafi zyda zyada kam thoda abhi jaldi dheere achha achhi achhe bura bada badi bade
chhota chhoti chhote naya nayi naye purana purani purane sahi galat theek pehla doosra aakhri
main tum aap hum woh wo yeh ye ve mera meri mere tumhara tumhari hamara hamari hamare apna apni apne
kisi koi kuch sab sabhi aaj kal parso yahan wahan upar neeche andar bahar aage peechhe dayen bayen
paisa paise kaam samay baat baatein cheez log dost bhai yaar din saal ghar jagah raasta duniya zindagi
desh sheher gaon parivaar maa baap bhaiya
dekhiye suniye janiye jaante jaanti jaanta samjhe lagta lagti mila mili hua hui hue raha rahi rahe aaya aayi gaya gayi diya di liya kaha suna dekha pata naam
business margin profit sales price budget market customer revenue content brand product video channel subscribe follow like share comment trend account views
analytics performance conversion retention acquisition funnel campaign creative organic paid reach impressions clicks website landing page social media platform algorithm monetization
advertisement sponsorship collaboration partnership investment growth cost value team project strategy quality report data result support service software app system local cloud export import editor subtitle caption render
numbers number
""".split()

SAFE_WORDS = frozenset({w.strip().lower() for w in _COMMON_WORDS if w.strip()})

VOCAB_HINT_WORDS = (
    "business margin profit sales numbers strategy market customer revenue "
    "content brand product video channel subscribe follow like share comment "
    "trend price budget account views cost investment growth target audience "
    "engagement metrics analytics performance conversion retention acquisition "
    "funnel campaign creative organic paid reach impressions clicks "
    "website landing page social media platform algorithm monetization "
    "advertisement sponsorship collaboration partnership subtitle caption render"
).split()


def build_vocabulary_hint(max_words: int = 48) -> str:
    seen = []
    for word in VOCAB_HINT_WORDS:
        w = word.strip().lower()
        if w and w not in seen:
            seen.append(w)
        if len(seen) >= max_words:
            break
    return " ".join(seen)


def _strip_wrapping_punct(token: str) -> Tuple[str, str, str]:
    if not token:
        return "", "", ""
    m = re.match(r"^(\W*)([A-Za-z][A-Za-z'\-]*)(\W*)$", token)
    if not m:
        return "", token, ""
    return m.group(1), m.group(2), m.group(3)


def _clean_alpha(word: str) -> str:
    return re.sub(r"[^a-z]", "", word.lower())


def _collapse_repeats(word: str) -> str:
    return re.sub(r"(.)\1{1,}", r"\1", word)


def _phonetic_signature(word: str) -> str:
    w = _clean_alpha(word)
    if not w:
        return ""
    for old, new in (("ph", "f"), ("ck", "k"), ("qu", "kw"), ("x", "ks"), ("sh", "s"), ("ch", "c"), ("j", "z"), ("v", "w")):
        w = w.replace(old, new)
    w = _collapse_repeats(w)
    if len(w) <= 1:
        return w
    rest = re.sub(r"[aeiouy]", "", w[1:])
    return w[0] + rest


@dataclass
class CorrectionEngine:
    explicit_map: Dict[str, str] = field(default_factory=lambda: dict(PHONETIC_CORRECTIONS))
    safe_words: frozenset[str] = SAFE_WORDS
    max_candidates: int = 3
    close_match_cutoff: float = 0.78

    def __post_init__(self) -> None:
        self._candidate_words = sorted(set(self.safe_words) | set(self.explicit_map.values()))
        self._signature_index: Dict[str, List[str]] = {}
        for word in self._candidate_words:
            sig = _phonetic_signature(word)
            if sig:
                self._signature_index.setdefault(sig, []).append(word)

    @staticmethod
    def looks_broken(token: str) -> bool:
        w = _clean_alpha(token)
        if len(w) < 4:
            return False
        vowels = sum(1 for c in w if c in "aeiouy")
        consonants = len(w) - vowels
        if vowels == 0:
            return True
        if len(w) >= 6 and vowels <= 1:
            return True
        if re.search(r"(?:[^aeiouy]{4,})", w):
            return True
        if w.endswith(("z", "j", "q", "x")) and len(w) >= 5:
            return True
        if consonants / max(len(w), 1) >= 0.8:
            return True
        return False

    def correct_token(self, token: str, *, confidence: Optional[float] = None) -> str:
        if not token:
            return token

        prefix, core, suffix = _strip_wrapping_punct(token)
        if not core:
            return token

        if any(ch.isdigit() for ch in core):
            return token

        core_l = core.lower()

        if core_l in self.safe_words:
            return prefix + core_l + suffix

        if core_l in self.explicit_map:
            return prefix + self.explicit_map[core_l] + suffix

        if re.fullmatch(r"[a-z]+(?:'[a-z]+)?(?:-[a-z]+)*", core_l):
            if not self.looks_broken(core_l):
                return prefix + core_l + suffix

        if confidence is not None and confidence >= 0.90 and core_l in self.safe_words:
            return prefix + core_l + suffix

        if not self.looks_broken(core_l) and core_l not in self._candidate_words:
            return prefix + core_l + suffix

        candidates = difflib.get_close_matches(
            core_l,
            self._candidate_words,
            n=self.max_candidates,
            cutoff=self.close_match_cutoff,
        )
        if candidates:
            best = candidates[0]
            if len(candidates) == 1:
                return prefix + best + suffix
            best_score = difflib.SequenceMatcher(None, core_l, best).ratio()
            second_score = difflib.SequenceMatcher(None, core_l, candidates[1]).ratio()
            if best_score - second_score >= 0.08:
                return prefix + best + suffix

        sig = _phonetic_signature(core_l)
        if sig and sig in self._signature_index:
            sig_candidates = self._signature_index[sig]
            if len(sig_candidates) == 1:
                return prefix + sig_candidates[0] + suffix

            ranked = sorted(
                ((difflib.SequenceMatcher(None, core_l, cand).ratio(), cand) for cand in sig_candidates),
                reverse=True,
            )
            if ranked:
                score, best = ranked[0]
                if score >= 0.80:
                    return prefix + best + suffix

        return prefix + core_l + suffix

    def correct_text(self, text: str, confidence: Optional[float] = None) -> str:
        if not text:
            return text
        parts = re.split(r"(\s+)", text)
        fixed: List[str] = []
        for part in parts:
            if not part or part.isspace():
                fixed.append(part)
            else:
                fixed.append(self.correct_token(part, confidence=confidence))
        return "".join(fixed)

    def vocab_hint(self, max_words: int = 48) -> str:
        return build_vocabulary_hint(max_words=max_words)


DEFAULT_CORRECTION_ENGINE = CorrectionEngine()
