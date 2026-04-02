"""
Video Editor Module

Provides timeline-based video editing capabilities including:
- Frame-accurate video/audio decoding via PyAV
- Multi-track timeline management
- Preview rendering
- Video export via FFmpeg
"""

from .engine import VideoEngine
from .timeline import Timeline, Track, Clip

__all__ = ["VideoEngine", "Timeline", "Track", "Clip"]
