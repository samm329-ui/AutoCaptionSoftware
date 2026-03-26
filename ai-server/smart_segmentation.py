"""
Stage 4: Smart Caption Segmentation

Split by:
  - pause gap (natural speech boundaries)
  - reading speed (chars per second)
  - max line width (characters per line)
  - punctuation / clause boundary

NOT by fixed word count.
"""

import re
from typing import List, Dict, Any, Optional


class SmartSegmenter:
    def __init__(self):
        self.punctuation_breaks = {".", "?", "!", "।", "।"}
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
        Smart segmentation based on multiple factors:
        - Pause detection (300ms+ gap)
        - Reading speed (chars/second)
        - Line width (max characters)
        - Punctuation boundaries
        """
        if not words:
            return []
        
        segments = []
        current_words = []
        current_text = ""
        current_start = None
        
        for i, word in enumerate(words):
            word_text = word.get("text", "")
            word_start = word.get("start", 0)
            word_end = word.get("end", 0)
            
            if current_start is None:
                current_start = word_start
            
            current_words.append(word)
            current_text += word_text + " "
            
            is_last_word = (i == len(words) - 1)
            
            should_break = False
            break_reason = None
            
            if is_last_word:
                should_break = True
                break_reason = "end_of_audio"
            else:
                next_word = words[i + 1]
                pause_gap = next_word.get("start", 0) - word_end
                
                has_punct_break = self._ends_with_punctuation(word_text)
                has_clause_break = self._ends_with_clause_marker(word_text)
                is_long_pause = pause_gap >= min_pause_gap
                exceeds_width = len(current_text.strip()) >= max_line_width
                exceeds_speed = self._exceeds_reading_speed(current_words, max_reading_speed)
                
                if has_punct_break and is_long_pause:
                    should_break = True
                    break_reason = "punctuation + pause"
                elif has_punct_break:
                    should_break = True
                    break_reason = "punctuation"
                elif has_clause_break and is_long_pause:
                    should_break = True
                    break_reason = "clause + pause"
                elif is_long_pause and len(current_words) >= 2:
                    should_break = True
                    break_reason = "long_pause"
                elif exceeds_width and len(current_words) >= 2:
                    should_break = True
                    break_reason = "line_width"
                elif exceeds_speed:
                    should_break = True
                    break_reason = "reading_speed"
            
            if should_break:
                segment = self._create_segment(current_words, current_text.strip())
                segment["break_reason"] = break_reason
                segments.append(segment)
                current_words = []
                current_text = ""
                current_start = None
        
        for i, seg in enumerate(segments):
            seg["id"] = f"cap_{i:03d}"
            seg["index"] = i
        
        return segments
    
    def _ends_with_punctuation(self, word: str) -> bool:
        return any(word.rstrip().endswith(p) for p in self.punctuation_breaks)
    
    def _ends_with_clause_marker(self, word: str) -> bool:
        return any(word.rstrip().endswith(p) for p in self.clause_markers)
    
    def _exceeds_reading_speed(
        self,
        words: List[Dict[str, Any]],
        max_speed: float
    ) -> bool:
        if len(words) < 2:
            return False
        
        start = words[0].get("start", 0)
        end = words[-1].get("end", 0)
        duration = end - start
        
        if duration <= 0:
            return False
        
        text = " ".join(w.get("text", "") for w in words)
        char_count = len(text.replace(" ", ""))
        
        reading_speed = char_count / duration
        return reading_speed > max_speed
    
    def _create_segment(
        self,
        words: List[Dict[str, Any]],
        text: str
    ) -> Dict[str, Any]:
        confidence_scores = [w.get("score", 1.0) for w in words]
        confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 1.0
        
        return {
            "id": "",
            "index": 0,
            "text": text,
            "start": words[0].get("start", 0),
            "end": words[-1].get("end", 0),
            "words": words,
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
        """Merge two adjacent segments."""
        if index1 >= len(segments) or index2 >= len(segments):
            return segments
        
        if abs(index1 - index2) != 1:
            return segments
        
        if index1 > index2:
            index1, index2 = index2, index1
        
        seg1 = segments[index1]
        seg2 = segments[index2]
        
        merged_words = seg1["words"] + seg2["words"]
        merged_text = seg1["text"] + " " + seg2["text"]
        
        merged = self._create_segment(merged_words, merged_text)
        merged["id"] = seg1["id"]
        merged["index"] = index1
        
        result = segments[:index1] + [merged] + segments[index2 + 1:]
        
        for i, seg in enumerate(result):
            seg["index"] = i
            seg["id"] = f"cap_{i:03d}"
        
        return result
    
    def split(
        self,
        segments: List[Dict[str, Any]],
        segment_index: int,
        word_index: int
    ) -> List[Dict[str, Any]]:
        """Split a segment at a word boundary."""
        if segment_index >= len(segments):
            return segments
        
        seg = segments[segment_index]
        words = seg["words"]
        
        if word_index <= 0 or word_index >= len(words):
            return segments
        
        words1 = words[:word_index]
        words2 = words[word_index:]
        
        seg1 = self._create_segment(words1, " ".join(w.get("text", "") for w in words1))
        seg2 = self._create_segment(words2, " ".join(w.get("text", "") for w in words2))
        
        seg1["id"] = f"cap_{segment_index:03d}"
        seg1["index"] = segment_index
        seg2["id"] = f"cap_{segment_index + 1:03d}"
        seg2["index"] = segment_index + 1
        
        result = segments[:segment_index] + [seg1, seg2] + segments[segment_index + 1:]
        
        for i, s in enumerate(result):
            s["index"] = i
            s["id"] = f"cap_{i:03d}"
        
        return result
