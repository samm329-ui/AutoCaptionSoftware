#!/usr/bin/env python3
"""Smoke test for the production spelling/transcription fix."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from text_normalizer import normalize_word, normalize_words

CASES = [
    ("fir", "phir", "hi"),
    ("phir", "phir", "hi"),
    ("hai", "hai", "hi"),
    ("nahi", "nahi", "hi"),
    ("marjin", "margin", "hi"),
    ("nmbrz", "numbers", "hi"),
    ("business", "business", "hi"),
    ("hello", "hello", "en"),
    ("बिजनेस", "business", "hi"),
]


def main() -> int:
    ok = True
    for word, expected, lang in CASES:
        got = normalize_word(word, doc_lang=lang)
        print(f"{word!r} -> {got!r} (expected {expected!r})")
        if got != expected:
            ok = False
    sample = [
        {"text": "fir", "start": 0.0, "end": 0.2, "score": 0.98},
        {"text": "business", "start": 0.21, "end": 0.5, "score": 0.95},
    ]
    out = normalize_words(sample, doc_lang="hi")
    print("normalize_words sample:", out)
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())
