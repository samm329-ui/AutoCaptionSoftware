"""
Stage 4: Smart Caption Segmentation

Rules:
  - Split by natural pause gap (300ms+)
  - Split by reading speed
  - Split by max line width
  - Split by punctuation
  - NEVER by fixed word count
  - NEVER modify text — only group words

Input:  normalized word list [{"text":"bhai","start":0.5,"end":0.8}, ...]
Output: caption segments [{"text":"bhai sun","start":0.5,"end":1.2}, ...]
"""

import re
from typing import List, Dict, Any, Optional


class SmartSegmenter:
    def __init__(self):
        self.punctuation_breaks = {".", "?", "!", "।", "॥"}
        self.clause_markers = {",", ";", ":", "—", "–", "،"}
        print("[SmartSegmenter] Initialized")

    def segment(
        self,
        words: List[Dict[str, Any]],
        max_line_width: int = 42,
        min_pause_gap: float = 0.3,
        max_reading_speed: float = 25.0
    ) -> List[Dict[str, Any]]:
        """
        Group normalized words into caption segments.
        TEXT IS NEVER MODIFIED HERE.
        """
        if not words:
            return []

        # Filter out empty words that normalization may have produced
        words = [w for w in words if w.get("text", "").strip()]

        segments = []
        current_words = []
        current_text = ""

        for i, word in enumerate(words):
            word_text = word.get("text", "")
            word_end = word.get("end", 0)

            current_words.append(word)
            current_text = " ".join(w["text"] for w in current_words)

            is_last = (i == len(words) - 1)

            if is_last:
                segments.append(self._create_segment(current_words))
                break

            next_word = words[i + 1]
            pause_gap = next_word.get("start", 0) - word_end

            has_punct = self._ends_with_punct(word_text)
            has_clause = self._ends_with_clause(word_text)
            long_pause = pause_gap >= min_pause_gap
            too_wide = len(current_text) >= max_line_width
            too_fast = self._exceeds_speed(current_words, max_reading_speed)

            should_break = False

            if has_punct:
                should_break = True
            elif has_clause and long_pause:
                should_break = True
            elif long_pause and len(current_words) >= 2:
                should_break = True
            elif too_wide and len(current_words) >= 2:
                should_break = True
            elif too_fast:
                should_break = True

            if should_break:
                segments.append(self._create_segment(current_words))
                current_words = []
                current_text = ""

        # Re-index
        for i, seg in enumerate(segments):
            seg["id"] = f"cap_{i:03d}"
            seg["index"] = i

        return segments

    def _ends_with_punct(self, word: str) -> bool:
        return any(word.rstrip().endswith(p) for p in self.punctuation_breaks)

    def _ends_with_clause(self, word: str) -> bool:
        return any(word.rstrip().endswith(p) for p in self.clause_markers)

    def _exceeds_speed(self, words: List[Dict], max_speed: float) -> bool:
        if len(words) < 3:
            return False
        start = words[0].get("start", 0)
        end = words[-1].get("end", 0)
        duration = end - start
        if duration <= 0:
            return False
        text = " ".join(w.get("text", "") for w in words)
        char_count = len(text.replace(" ", ""))
        return (char_count / duration) > max_speed

    def _create_segment(self, words: List[Dict[str, Any]]) -> Dict[str, Any]:
        text = " ".join(w.get("text", "") for w in words)
        scores = [w.get("score", 1.0) for w in words]
        confidence = sum(scores) / len(scores) if scores else 1.0

        return {
            "id": "",
            "index": 0,
            "text": text,
            "start": words[0].get("start", 0),
            "end": words[-1].get("end", 0),
            "words": [w.copy() for w in words],
            "confidence": confidence,
            "editable": True,
            "style": "default",
            "animation": "pop_in",
            "position": {"x": 0.5, "y": 0.82}
        }

    def merge(
        self,
        segments: List[Dict[str, Any]],
        index1: int,
        index2: int
    ) -> List[Dict[str, Any]]:
        if abs(index1 - index2) != 1:
            return segments
        if index1 > index2:
            index1, index2 = index2, index1

        seg1 = segments[index1]
        seg2 = segments[index2]
        merged_words = seg1["words"] + seg2["words"]
        merged = self._create_segment(merged_words)
        merged["id"] = seg1["id"]
        merged["index"] = index1

        result = segments[:index1] + [merged] + segments[index2 + 1:]
        for i, s in enumerate(result):
            s["index"] = i
            s["id"] = f"cap_{i:03d}"
        return result

    def split(
        self,
        segments: List[Dict[str, Any]],
        segment_index: int,
        word_index: int
    ) -> List[Dict[str, Any]]:
        if segment_index >= len(segments):
            return segments
        seg = segments[segment_index]
        words = seg["words"]
        if word_index <= 0 or word_index >= len(words):
            return segments

        seg1 = self._create_segment(words[:word_index])
        seg2 = self._create_segment(words[word_index:])

        result = segments[:segment_index] + [seg1, seg2] + segments[segment_index + 1:]
        for i, s in enumerate(result):
            s["index"] = i
            s["id"] = f"cap_{i:03d}"
        return result