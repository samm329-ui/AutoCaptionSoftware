"""
Stage 6: Timeline Model

Every caption is an editable object with:
  - id, start, end, text
  - words (from canonical transcript)
  - style, animation, position
  - editable flag

Timeline JSON structure used by preview and export.
"""

import uuid
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class Caption:
    id: str
    index: int
    start: float
    end: float
    text: str
    words: List[Dict[str, Any]] = field(default_factory=list)
    style: str = "default"
    animation: str = "pop_in"
    position: Dict[str, float] = field(default_factory=lambda: {"x": 0.5, "y": 0.82})
    editable: bool = True
    confidence: float = 1.0
    emphasis: List[Dict] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Caption":
        return cls(**data)


@dataclass 
class Timeline:
    id: str
    source_file: str
    duration: float
    captions: List[Caption] = field(default_factory=list)
    language: str = "mixed"
    created_at: float = 0
    updated_at: float = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "source_file": self.source_file,
            "duration": self.duration,
            "language": self.language,
            "captions": [c.to_dict() for c in self.captions],
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Timeline":
        captions = [Caption.from_dict(c) for c in data.get("captions", [])]
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            source_file=data.get("source_file", ""),
            duration=data.get("duration", 0),
            captions=captions,
            language=data.get("language", "mixed"),
            created_at=data.get("created_at", 0),
            updated_at=data.get("updated_at", 0)
        )


class TimelineEditor:
    """Edit timeline captions."""
    
    def __init__(self, timeline: Timeline):
        self.timeline = timeline
    
    def get_caption(self, caption_id: str) -> Optional[Caption]:
        for cap in self.timeline.captions:
            if cap.id == caption_id:
                return cap
        return None
    
    def update_caption(
        self,
        caption_id: str,
        text: Optional[str] = None,
        start: Optional[float] = None,
        end: Optional[float] = None,
        style: Optional[str] = None,
        animation: Optional[str] = None,
        position: Optional[Dict[str, float]] = None,
        emphasis: Optional[List[Dict]] = None
    ) -> Optional[Caption]:
        cap = self.get_caption(caption_id)
        if not cap:
            return None
        
        if text is not None:
            cap.text = text
        if start is not None:
            cap.start = start
        if end is not None:
            cap.end = end
        if style is not None:
            cap.style = style
        if animation is not None:
            cap.animation = animation
        if position is not None:
            cap.position = position
        if emphasis is not None:
            cap.emphasis = emphasis
        
        self.timeline.updated_at = __import__("time").time()
        return cap
    
    def delete_caption(self, caption_id: str) -> bool:
        original_count = len(self.timeline.captions)
        self.timeline.captions = [c for c in self.timeline.captions if c.id != caption_id]
        
        for i, cap in enumerate(self.timeline.captions):
            cap.index = i
            cap.id = f"cap_{i:03d}"
        
        self.timeline.updated_at = __import__("time").time()
        return len(self.timeline.captions) < original_count
    
    def split_caption(self, caption_id: str, split_at_time: float) -> Optional[List[Caption]]:
        cap = self.get_caption(caption_id)
        if not cap:
            return None
        
        if not (cap.start < split_at_time < cap.end):
            return None
        
        words_before = [w for w in cap.words if w.get("end", 0) <= split_at_time]
        words_after = [w for w in cap.words if w.get("start", 0) >= split_at_time]
        
        if not words_before or not words_after:
            return None
        
        cap1 = Caption(
            id=f"cap_{cap.index:03d}",
            index=cap.index,
            start=cap.start,
            end=split_at_time,
            text=cap.text,
            words=words_before,
            style=cap.style,
            animation=cap.animation,
            position=cap.position.copy(),
            editable=True,
            confidence=cap.confidence
        )
        
        cap2 = Caption(
            id=f"cap_{cap.index + 1:03d}",
            index=cap.index + 1,
            start=split_at_time,
            end=cap.end,
            text=" ".join(w.get("text", "") for w in words_after),
            words=words_after,
            style=cap.style,
            animation=cap.animation,
            position=cap.position.copy(),
            editable=True,
            confidence=cap.confidence
        )
        
        insert_idx = cap.index + 1
        self.timeline.captions = (
            self.timeline.captions[:insert_idx] + 
            [cap2] + 
            self.timeline.captions[insert_idx:]
        )
        
        cap1.text = " ".join(w.get("text", "") for w in words_before)
        self.timeline.captions[cap.index] = cap1
        
        for i, c in enumerate(self.timeline.captions):
            c.index = i
            c.id = f"cap_{i:03d}"
        
        self.timeline.updated_at = __import__("time").time()
        return [cap1, cap2]
    
    def merge_caption_with_next(self, caption_id: str) -> Optional[Caption]:
        cap = self.get_caption(caption_id)
        if not cap:
            return None
        
        next_idx = cap.index + 1
        if next_idx >= len(self.timeline.captions):
            return None
        
        next_cap = self.timeline.captions[next_idx]
        
        merged = Caption(
            id=cap.id,
            index=cap.index,
            start=cap.start,
            end=next_cap.end,
            text=cap.text + " " + next_cap.text,
            words=cap.words + next_cap.words,
            style=cap.style,
            animation=cap.animation,
            position=cap.position.copy(),
            editable=True,
            confidence=(cap.confidence + next_cap.confidence) / 2
        )
        
        self.timeline.captions = (
            self.timeline.captions[:cap.index] +
            [merged] +
            self.timeline.captions[cap.index + 2:]
        )
        
        for i, c in enumerate(self.timeline.captions):
            c.index = i
            c.id = f"cap_{i:03d}"
        
        self.timeline.updated_at = __import__("time").time()
        return merged
    
    def apply_style_to_all(self, style: str, animation: str = None):
        for cap in self.timeline.captions:
            cap.style = style
            if animation:
                cap.animation = animation
        
        self.timeline.updated_at = __import__("time").time()
    
    def reorder_captions(self, caption_ids: List[str]):
        id_to_cap = {c.id: c for c in self.timeline.captions}
        
        reordered = []
        for cid in caption_ids:
            if cid in id_to_cap:
                reordered.append(id_to_cap[cid])
        
        for i, cap in enumerate(reordered):
            cap.index = i
            cap.id = f"cap_{i:03d}"
        
        self.timeline.captions = reordered
        self.timeline.updated_at = __import__("time").time()
