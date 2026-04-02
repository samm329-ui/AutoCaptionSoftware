"""
Timeline Data Structures

Defines the core data classes for timeline-based editing:
- Clip: Represents a single media clip on the timeline
- Track: Container for clips of a specific type
- Timeline: Main timeline containing all tracks and project settings
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
import json


class TrackType(Enum):
    VIDEO = "video"
    AUDIO = "audio"
    SUBTITLE = "subtitle"


class AudioType(Enum):
    STEREO = "stereo"
    MONO = "mono"
    SURROUND_5_1 = "5.1"
    ADAPTIVE = "adaptive"


@dataclass
class CaptionStyle:
    """Style properties for subtitle rendering"""
    font_family: str = "Inter"
    font_size: int = 28
    font_weight: str = "normal"
    color: str = "#ffffff"
    background_color: str = "rgba(0,0,0,0.5)"
    x: float = 50.0  # Percentage from left (0-100)
    y: float = 85.0  # Percentage from top (0-100)
    alignment: str = "center"  # left, center, right
    animation: str = "none"  # none, fade-in, slide-up, pop, bounce
    
    def to_dict(self) -> dict:
        return {
            "font_family": self.font_family,
            "font_size": self.font_size,
            "font_weight": self.font_weight,
            "color": self.color,
            "background_color": self.background_color,
            "x": self.x,
            "y": self.y,
            "alignment": self.alignment,
            "animation": self.animation
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "CaptionStyle":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Clip:
    """Represents a single clip on the timeline"""
    id: str
    source: str  # Source file path or "generated" for subtitles
    
    # For video/audio clips
    timeline_start: float = 0.0  # Start position on timeline (seconds)
    source_in: float = 0.0       # Start point in source file (seconds)
    source_out: float = 0.0      # End point in source file (seconds)
    
    # For subtitle clips
    text: str = ""
    duration: float = 2.0
    
    # Style properties (for subtitles)
    style: Optional[CaptionStyle] = None
    
    # Additional properties
    effects: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def clip_duration(self) -> float:
        """Duration of this clip on timeline"""
        if self.text:  # Subtitle clip
            return self.duration
        return self.source_out - self.source_in
    
    @property
    def timeline_end(self) -> float:
        """End position on timeline"""
        return self.timeline_start + self.clip_duration
    
    def to_dict(self) -> dict:
        result = {
            "id": self.id,
            "source": self.source,
            "timeline_start": self.timeline_start,
            "text": self.text,
            "duration": self.duration,
            "effects": self.effects,
            "metadata": self.metadata
        }
        if not self.text:
            result["source_in"] = self.source_in
            result["source_out"] = self.source_out
        if self.style:
            result["style"] = self.style.to_dict()
        return result
    
    @classmethod
    def from_dict(cls, data: dict) -> "Clip":
        style_data = data.pop("style", None)
        style = CaptionStyle.from_dict(style_data) if style_data else None
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__}, style=style)


@dataclass
class Track:
    """Represents a track containing clips"""
    id: str
    label: str
    track_type: TrackType
    clips: List[Clip] = field(default_factory=list)
    visible: bool = True
    locked: bool = False
    
    # Audio-specific properties
    muted: bool = False
    solo: bool = False
    audio_type: AudioType = AudioType.STEREO
    
    @property
    def duration(self) -> float:
        """Total duration of content on this track"""
        if not self.clips:
            return 0.0
        return max(c.timeline_end for c in self.clips)
    
    def get_clip_at(self, time: float) -> Optional[Clip]:
        """Get clip at given time position"""
        for clip in self.clips:
            if clip.timeline_start <= time < clip.timeline_end:
                return clip
        return None
    
    def add_clip(self, clip: Clip) -> None:
        """Add a clip to this track"""
        self.clips.append(clip)
        self.clips.sort(key=lambda c: c.timeline_start)
    
    def remove_clip(self, clip_id: str) -> Optional[Clip]:
        """Remove and return clip by ID"""
        for i, clip in enumerate(self.clips):
            if clip.id == clip_id:
                return self.clips.pop(i)
        return None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "label": self.label,
            "type": self.track_type.value,
            "clips": [c.to_dict() for c in self.clips],
            "visible": self.visible,
            "locked": self.locked,
            "muted": self.muted,
            "solo": self.solo,
            "audio_type": self.audio_type.value
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Track":
        track_type = TrackType(data.get("type", "video"))
        audio_type = AudioType(data.get("audio_type", "stereo"))
        clips_data = data.pop("clips", [])
        clips = [Clip.from_dict(c) for c in clips_data]
        data.pop("type", None)
        data.pop("audio_type", None)
        return cls(
            **{k: v for k, v in data.items() if k in cls.__dataclass_fields__},
            track_type=track_type,
            audio_type=audio_type,
            clips=clips
        )


@dataclass
class Marker:
    """Timeline marker for important points"""
    id: str
    time: float
    label: str
    color: str = "#a7a5ff"


@dataclass
class Timeline:
    """Main timeline containing all tracks and project settings"""
    version: str = "1.0"
    fps: float = 30.0
    width: int = 1920
    height: int = 1080
    duration: float = 0.0
    
    # Playback state
    playhead: float = 0.0
    in_point: Optional[float] = None
    out_point: Optional[float] = None
    zoom: float = 1.0
    
    # Tracks organized by type
    video_tracks: List[Track] = field(default_factory=list)
    audio_tracks: List[Track] = field(default_factory=list)
    subtitle_tracks: List[Track] = field(default_factory=list)
    
    # Markers
    markers: List[Marker] = field(default_factory=list)
    
    # Active tool
    active_tool: str = "selection"
    
    @property
    def all_tracks(self) -> List[Track]:
        return self.video_tracks + self.audio_tracks + self.subtitle_tracks
    
    def get_track(self, track_id: str) -> Optional[Track]:
        """Find track by ID"""
        for track in self.all_tracks:
            if track.id == track_id:
                return track
        return None
    
    def get_clip(self, clip_id: str) -> Optional[Clip]:
        """Find clip by ID across all tracks"""
        for track in self.all_tracks:
            for clip in track.clips:
                if clip.id == clip_id:
                    return clip
        return None
    
    def add_track(self, track_type: TrackType, label: str = None) -> Track:
        """Add a new track"""
        prefix_map = {
            TrackType.VIDEO: ("V", self.video_tracks),
            TrackType.AUDIO: ("A", self.audio_tracks),
            TrackType.SUBTITLE: ("S", self.subtitle_tracks)
        }
        prefix, track_list = prefix_map[track_type]
        track_id = f"{prefix}{len(track_list) + 1}"
        
        if label is None:
            label = f"{track_type.value.capitalize()} {len(track_list) + 1}"
        
        track = Track(id=track_id, label=label, track_type=track_type)
        track_list.append(track)
        return track
    
    def remove_track(self, track_id: str) -> Optional[Track]:
        """Remove track by ID"""
        for track_list in [self.video_tracks, self.audio_tracks, self.subtitle_tracks]:
            for i, track in enumerate(track_list):
                if track.id == track_id:
                    return track_list.pop(i)
        return None
    
    def add_marker(self, time: float, label: str = None) -> Marker:
        """Add a marker at given time"""
        marker = Marker(
            id=f"m_{len(self.markers) + 1}",
            time=time,
            label=label or f"Marker {len(self.markers) + 1}"
        )
        self.markers.append(marker)
        self.markers.sort(key=lambda m: m.time)
        return marker
    
    def remove_marker(self, marker_id: str) -> Optional[Marker]:
        """Remove marker by ID"""
        for i, marker in enumerate(self.markers):
            if marker.id == marker_id:
                return self.markers.pop(i)
        return None
    
    def get_clips_at_time(self, time: float) -> Dict[str, Optional[Clip]]:
        """Get all clips visible at given time"""
        return {
            track.id: track.get_clip_at(time)
            for track in self.all_tracks
            if track.visible and not (track.track_type == TrackType.AUDIO and track.muted)
        }
    
    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "fps": self.fps,
            "width": self.width,
            "height": self.height,
            "duration": self.duration,
            "playhead": self.playhead,
            "in_point": self.in_point,
            "out_point": self.out_point,
            "zoom": self.zoom,
            "active_tool": self.active_tool,
            "markers": [m.__dict__ for m in self.markers],
            "tracks": {
                "video": [t.to_dict() for t in self.video_tracks],
                "audio": [t.to_dict() for t in self.audio_tracks],
                "subtitles": [t.to_dict() for t in self.subtitle_tracks]
            }
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)
    
    @classmethod
    def from_dict(cls, data: dict) -> "Timeline":
        tracks_data = data.pop("tracks", {})
        markers_data = data.pop("markers", [])
        
        video_tracks = [Track.from_dict(t) for t in tracks_data.get("video", [])]
        audio_tracks = [Track.from_dict(t) for t in tracks_data.get("audio", [])]
        subtitle_tracks = [Track.from_dict(t) for t in tracks_data.get("subtitles", [])]
        markers = [Marker(**m) for m in markers_data]
        
        # Remove nested dicts that we've processed
        data.pop("version", None)
        
        return cls(
            **{k: v for k, v in data.items() if k in cls.__dataclass_fields__},
            video_tracks=video_tracks,
            audio_tracks=audio_tracks,
            subtitle_tracks=subtitle_tracks,
            markers=markers
        )
    
    @classmethod
    def from_json(cls, json_str: str) -> "Timeline":
        return cls.from_dict(json.loads(json_str))
    
    @classmethod
    def create_default(cls, fps: float = 30.0, width: int = 1920, height: int = 1080) -> "Timeline":
        """Create a timeline with default tracks"""
        timeline = cls(fps=fps, width=width, height=height)
        timeline.add_track(TrackType.VIDEO, "Video 1")
        timeline.add_track(TrackType.AUDIO, "Audio 1")
        timeline.add_track(TrackType.SUBTITLE, "Subtitles 1")
        return timeline
