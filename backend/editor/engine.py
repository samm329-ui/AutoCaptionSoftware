"""
Video Engine - PyAV-based video processing

Provides frame-accurate video/audio decoding and preview generation.
"""

import os
import logging
from typing import Optional, List, Tuple, Dict, Any
from dataclasses import dataclass
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

# Check if PyAV is available
try:
    import av
    PYAV_AVAILABLE = True
except ImportError:
    PYAV_AVAILABLE = False
    logger.warning("PyAV not installed. Video engine will not be available. Install with: pip install av")


@dataclass
class VideoFrame:
    """A single video frame with metadata"""
    image: np.ndarray  # RGB array (height, width, 3)
    time: float        # Time in seconds
    index: int         # Frame index
    width: int         # Frame width
    height: int        # Frame height


@dataclass
class VideoInfo:
    """Information about a video file"""
    path: str
    duration: float
    fps: float
    width: int
    height: int
    frame_count: int
    codec: str
    has_audio: bool


class VideoEngine:
    """
    Core video engine using PyAV for frame-accurate video operations.
    
    Features:
    - Open and cache video files
    - Seek to exact time positions
    - Extract individual frames
    - Get video metadata
    - Generate preview thumbnails
    """
    
    def __init__(self):
        if not PYAV_AVAILABLE:
            raise ImportError("PyAV is required for video engine. Install with: pip install av")
        
        self._containers: Dict[str, av.container.InputContainer] = {}
        self._video_info: Dict[str, VideoInfo] = {}
    
    def open(self, path: str) -> av.container.InputContainer:
        """Open a video file and cache the container"""
        path = os.path.abspath(path)
        
        if path not in self._containers:
            if not os.path.exists(path):
                raise FileNotFoundError(f"Video file not found: {path}")
            
            self._containers[path] = av.open(path)
            logger.info(f"Opened video: {path}")
        
        return self._containers[path]
    
    def get_video_info(self, path: str) -> VideoInfo:
        """Get video file information"""
        path = os.path.abspath(path)
        
        if path not in self._video_info:
            container = self.open(path)
            
            # Find video stream
            video_stream = None
            for stream in container.streams:
                if stream.type == 'video':
                    video_stream = stream
                    break
            
            if video_stream is None:
                raise ValueError(f"No video stream found in: {path}")
            
            # Calculate FPS
            fps = float(video_stream.average_rate or 30.0)
            
            # Get duration
            duration = float(container.duration / av.time_base) if container.duration else 0.0
            
            # Check for audio
            has_audio = any(s.type == 'audio' for s in container.streams)
            
            self._video_info[path] = VideoInfo(
                path=path,
                duration=duration,
                fps=fps,
                width=video_stream.width,
                height=video_stream.height,
                frame_count=int(duration * fps),
                codec=video_stream.codec_context.name,
                has_audio=has_audio
            )
        
        return self._video_info[path]
    
    def seek(self, path: str, time: float) -> Optional[VideoFrame]:
        """
        Seek to exact time and return the frame.
        
        Args:
            path: Path to video file
            time: Time in seconds to seek to
            
        Returns:
            VideoFrame at the given time, or None if not found
        """
        container = self.open(path)
        video_info = self.get_video_info(path)
        
        # Get video stream
        video_stream = container.streams.video[0]
        
        # Calculate timestamp (in stream time_base units)
        timestamp = int(time * video_info.fps)
        
        # Seek to nearest keyframe
        try:
            container.seek(timestamp, stream=video_stream, any_frame=False, backward=True)
        except av.AVError as e:
            logger.warning(f"Seek failed for {path} at {time}s: {e}")
            return None
        
        # Decode frames until we get close to target time
        target_time = time
        
        for frame in container.decode(video_stream):
            frame_time = float(frame.pts * video_stream.time_base) if frame.pts else 0.0
            
            # Check if we're close enough to target (within 1 frame)
            if abs(frame_time - target_time) < (1.0 / video_info.fps):
                image = frame.to_ndarray(format='rgb24')
                return VideoFrame(
                    image=image,
                    time=frame_time,
                    index=int(frame_time * video_info.fps),
                    width=frame.width,
                    height=frame.height
                )
            
            # If we've gone past the target, return this frame
            if frame_time > target_time:
                image = frame.to_ndarray(format='rgb24')
                return VideoFrame(
                    image=image,
                    time=frame_time,
                    index=int(frame_time * video_info.fps),
                    width=frame.width,
                    height=frame.height
                )
        
        return None
    
    def get_frame_at_index(self, path: str, frame_index: int) -> Optional[VideoFrame]:
        """Get frame by index number"""
        video_info = self.get_video_info(path)
        time = frame_index / video_info.fps
        return self.seek(path, time)
    
    def generate_thumbnails(
        self, 
        path: str, 
        count: int = 10, 
        max_width: int = 160,
        max_height: int = 90
    ) -> List[Dict[str, Any]]:
        """
        Generate thumbnail images evenly spaced across the video.
        
        Args:
            path: Path to video file
            count: Number of thumbnails to generate
            max_width: Maximum thumbnail width
            max_height: Maximum thumbnail height
            
        Returns:
            List of dicts with 'time' and 'image' (as bytes PNG)
        """
        import io
        from PIL import Image
        
        video_info = self.get_video_info(path)
        thumbnails = []
        
        if video_info.duration <= 0:
            return thumbnails
        
        # Calculate evenly spaced times
        times = [i * video_info.duration / count for i in range(count)]
        
        for t in times:
            frame = self.seek(path, t)
            if frame:
                # Resize thumbnail
                img = Image.fromarray(frame.image)
                img.thumbnail((max_width, max_height), Image.LANCZOS)
                
                # Convert to bytes
                buffer = io.BytesIO()
                img.save(buffer, format='PNG')
                
                thumbnails.append({
                    'time': t,
                    'image': buffer.getvalue()
                })
        
        return thumbnails
    
    def extract_audio(self, path: str, output_path: str, start: float = 0, end: float = None) -> str:
        """
        Extract audio segment from video file.
        
        Args:
            path: Source video path
            output_path: Output audio file path
            start: Start time in seconds
            end: End time in seconds (None for end of video)
            
        Returns:
            Path to extracted audio file
        """
        container = self.open(path)
        video_info = self.get_video_info(path)
        
        if not video_info.has_audio:
            raise ValueError("Video has no audio stream")
        
        # Use ffmpeg for extraction
        import subprocess
        
        cmd = [
            'ffmpeg', '-y',
            '-i', path,
            '-ss', str(start),
        ]
        
        if end is not None:
            cmd.extend(['-to', str(end)])
        
        cmd.extend([
            '-vn',  # No video
            '-acodec', 'pcm_s16le',
            output_path
        ])
        
        subprocess.run(cmd, check=True, capture_output=True)
        
        return output_path
    
    def get_frame_thumbnail(self, path: str, time: float, size: Tuple[int, int] = (160, 90)) -> bytes:
        """Get a single frame as thumbnail bytes"""
        from PIL import Image
        import io
        
        frame = self.seek(path, time)
        if frame is None:
            return b''
        
        img = Image.fromarray(frame.image)
        img.thumbnail(size, Image.LANCZOS)
        
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        
        return buffer.getvalue()
    
    def clear_cache(self) -> None:
        """Close all cached containers"""
        for container in self._containers.values():
            try:
                container.close()
            except:
                pass
        self._containers.clear()
        self._video_info.clear()
    
    def close(self, path: str = None) -> None:
        """Close specific or all video files"""
        if path:
            path = os.path.abspath(path)
            if path in self._containers:
                self._containers[path].close()
                del self._containers[path]
                if path in self._video_info:
                    del self._video_info[path]
        else:
            self.clear_cache()
    
    def __del__(self):
        """Cleanup on deletion"""
        self.clear_cache()


# Singleton instance
_engine_instance: Optional[VideoEngine] = None


def get_engine() -> VideoEngine:
    """Get or create the singleton VideoEngine instance"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = VideoEngine()
    return _engine_instance
