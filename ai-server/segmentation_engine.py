"""
Caption Segmentation Engine
Smart 3-word grouping with natural pause detection
"""

import re
from typing import List, Dict, Any


class CaptionSegmenter:
    def __init__(self):
        self.punctuation_breaks = {".", "?", "!", ",", ";", "।"}
        print("Caption Segmenter initialized")
    
    def segment(
        self,
        words: List[Dict[str, Any]],
        max_words: int = 3,
        max_chars: int = 40,
        min_words: int = 1
    ) -> List[Dict[str, Any]]:
        if not words:
            return []
        
        segments = []
        current_group = []
        
        for i, word_data in enumerate(words):
            current_group.append(word_data)
            
            should_break = (
                len(current_group) >= max_words or
                self._has_punctuation(word_data["word"]) or
                self._total_chars(current_group) >= max_chars or
                (i + 1 < len(words) and self._is_natural_pause(word_data, words[i + 1]))
            )
            
            if should_break and len(current_group) >= min_words:
                segment = self._create_segment(current_group)
                segments.append(segment)
                current_group = []
        
        if current_group:
            segment = self._create_segment(current_group)
            segments.append(segment)
        
        for i, seg in enumerate(segments):
            seg["id"] = f"caption_{i}"
            seg["index"] = i
            seg["editable"] = True
        
        return segments
    
    def _create_segment(self, word_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        text_parts = [w["word"].strip() for w in word_list]
        text = " ".join(text_parts)
        
        scores = [w.get("score", 1.0) for w in word_list]
        confidence = sum(scores) / len(scores) if scores else 1.0
        
        emphasis_indices = []
        for i, word_data in enumerate(word_list):
            word = word_data["word"].strip().lower()
            if self._should_emphasize(word):
                emphasis_indices.append(i)
        
        return {
            "text": text,
            "start": word_list[0]["start"],
            "end": word_list[-1]["end"],
            "words": word_list.copy(),
            "confidence": confidence,
            "emphasis_indices": emphasis_indices
        }
    
    def _has_punctuation(self, word: str) -> bool:
        return any(word.strip().endswith(p) for p in self.punctuation_breaks)
    
    def _total_chars(self, word_list: List[Dict[str, Any]]) -> int:
        return sum(len(w["word"]) for w in word_list)
    
    def _is_natural_pause(self, word1: Dict[str, Any], word2: Dict[str, Any]) -> bool:
        gap = word2["start"] - word1["end"]
        return gap > 0.3
    
    def _should_emphasize(self, word: str) -> bool:
        word = word.lower().strip()
        
        if word in ["nahi", "never", "no", "not", "mat", "नहीं"]:
            return True
        
        if word in ["bahut", "very", "really", "ekdam", "bilkul", "बहुत"]:
            return True
        
        if word in ["kya", "kaise", "kahan", "kyun", "what", "why", "how"]:
            return True
        
        if re.match(r'^\d+$', word):
            return True
        
        if re.match(r'^[A-Z]{2,}$', word):
            return True
        
        return False
    
    def merge_segments(
        self,
        segments: List[Dict[str, Any]],
        index1: int,
        index2: int
    ) -> List[Dict[str, Any]]:
        if index1 >= len(segments) or index2 >= len(segments):
            return segments
        
        if abs(index1 - index2) != 1:
            return segments
        
        if index1 > index2:
            index1, index2 = index2, index1
        
        seg1 = segments[index1]
        seg2 = segments[index2]
        
        merged_words = seg1["words"] + seg2["words"]
        merged = self._create_segment(merged_words)
        
        new_segments = segments[:index1] + [merged] + segments[index2 + 1:]
        
        for i, seg in enumerate(new_segments):
            seg["index"] = i
            seg["id"] = f"caption_{i}"
        
        return new_segments
    
    def split_segment(
        self,
        segments: List[Dict[str, Any]],
        index: int,
        split_at_word: int
    ) -> List[Dict[str, Any]]:
        if index >= len(segments):
            return segments
        
        seg = segments[index]
        words = seg["words"]
        
        if split_at_word <= 0 or split_at_word >= len(words):
            return segments
        
        words1 = words[:split_at_word]
        words2 = words[split_at_word:]
        
        seg1 = self._create_segment(words1)
        seg2 = self._create_segment(words2)
        
        new_segments = segments[:index] + [seg1, seg2] + segments[index + 1:]
        
        for i, seg in enumerate(new_segments):
            seg["index"] = i
            seg["id"] = f"caption_{i}"
        
        return new_segments
