"""
display_processor.py — FORMATTING ONLY (no language conversion)

TEXT MUST ALREADY BE ROMAN/HINGLISH by the time it reaches here.
This file only handles:
  - Proper casing
  - Emphasis detection (delegated to text_normalizer)
  - Display formatting

If you find yourself adding language conversion here → STOP.
Put it in text_normalizer.py where it belongs.
"""

import re
from typing import List, Dict, Any

from text_normalizer import detect_emphasis


class DisplayProcessor:
    def __init__(self):
        print("[DisplayProcessor] Initialized (format-only mode)")

    def format_for_display(self, text: str) -> str:
        if not text:
            return text
        text = text.strip()
        text = re.sub(r'\s+', ' ', text)
        if text:
            text = text[0].upper() + text[1:]
        return text

    def get_emphasis(self, text: str) -> List[Dict[str, Any]]:
        return detect_emphasis(text)

    def process_segment(self, text: str) -> Dict[str, Any]:
        formatted = self.format_for_display(text)
        emphasis = self.get_emphasis(formatted)
        return {"text": formatted, "emphasis": emphasis}


class HinglishProcessor(DisplayProcessor):
    """Alias for backwards compatibility with main.py."""

    def process_text(self, text: str) -> str:
        return self.format_for_display(text)

    def detect_emphasis(self, text: str) -> List[Dict[str, Any]]:
        return self.get_emphasis(text)