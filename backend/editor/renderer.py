"""
Renderer - Preview generation and video export

Handles compositing frames from timeline and rendering to video files.
"""

import os
import subprocess
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path
import io

import numpy as np

from .timeline import Timeline, Track, Clip, TrackType, CaptionStyle
from .engine import VideoEngine, VideoFrame, get_engine

logger = logging.getLogger(__name__)


class PreviewRenderer:
    """
    Generates preview frames from timeline.
    
    Composites all visible tracks at a given time position
    and renders subtitle overlays with styling.
    """
    
    def __init__(self, engine: Optional[VideoEngine] = None):
        self.engine = engine or get_engine()
    
    def render_frame(self, timeline: Timeline, time: float, source_dir: str = "") -> Optional[np.ndarray]:
        """
        Render a single frame at the given time.
        
        Args:
            timeline: The timeline to render
            time: Time in seconds
            source_dir: Base directory for resolving relative source paths
            
        Returns:
            RGB numpy array (height, width, 3) or None
        """
        # Create base frame
        frame = np.zeros((timeline.height, timeline.width, 3), dtype=np.uint8)
        
        # Render video tracks (bottom to top)
        for track in timeline.video_tracks:
            if not track.visible:
                continue
            
            clip = track.get_clip_at(time)
            if clip and clip.source:
                source_path = self._resolve_path(clip.source, source_dir)
                if source_path and os.path.exists(source_path):
                    # Calculate time within the clip
                    clip_time = clip.source_in + (time - clip.timeline_start)
                    
                    video_frame = self.engine.seek(source_path, clip_time)
                    if video_frame:
                        # Resize if needed
                        if video_frame.width != timeline.width or video_frame.height != timeline.height:
                            from PIL import Image
                            img = Image.fromarray(video_frame.image)
                            img = img.resize((timeline.width, timeline.height), Image.LANCZOS)
                            frame = np.array(img)
                        else:
                            frame = video_frame.image
        
        # Render subtitle tracks (top layer)
        for track in timeline.subtitle_tracks:
            if not track.visible:
                continue
            
            clip = track.get_clip_at(time)
            if clip and clip.text:
                frame = self._draw_subtitle(frame, clip, timeline)
        
        return frame
    
    def _draw_subtitle(self, frame: np.ndarray, clip: Clip, timeline: Timeline) -> np.ndarray:
        """Draw subtitle text on frame"""
        try:
            from PIL import Image, ImageDraw, ImageFont
        except ImportError:
            logger.warning("Pillow not available for subtitle rendering")
            return frame
        
        img = Image.fromarray(frame)
        draw = ImageDraw.Draw(img)
        
        style = clip.style or CaptionStyle()
        
        # Calculate position
        x = int(timeline.width * style.x / 100)
        y = int(timeline.height * style.y / 100)
        
        # Get font
        font_size = style.font_size
        try:
            font = ImageFont.truetype(f"{style.font_family}.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("arial.ttf", font_size)
            except:
                font = ImageFont.load_default()
        
        # Get text bounding box
        text_bbox = draw.textbbox((0, 0), clip.text, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        
        # Adjust position based on alignment
        if style.alignment == "center":
            x = x - text_width // 2
        elif style.alignment == "right":
            x = x - text_width
        
        # Draw background
        padding = 10
        bg_box = [
            x - padding,
            y - padding,
            x + text_width + padding,
            y + text_height + padding
        ]
        draw.rectangle(bg_box, fill=style.background_color)
        
        # Draw text
        draw.text((x, y), clip.text, fill=style.color, font=font)
        
        return np.array(img)
    
    def _resolve_path(self, source: str, base_dir: str) -> Optional[str]:
        """Resolve source path relative to base directory"""
        if os.path.isabs(source):
            return source if os.path.exists(source) else None
        
        if base_dir:
            full_path = os.path.join(base_dir, source)
            if os.path.exists(full_path):
                return full_path
        
        return None
    
    def generate_preview_sheet(
        self,
        timeline: Timeline,
        source_dir: str = "",
        num_frames: int = 12,
        columns: int = 4
    ) -> bytes:
        """
        Generate a preview sheet with multiple frames.
        
        Returns:
            JPEG bytes of the preview sheet
        """
        from PIL import Image
        
        # Calculate frame times
        duration = max(timeline.duration, 1.0)
        interval = duration / num_frames
        times = [i * interval for i in range(num_frames)]
        
        # Generate frames
        frames = []
        for t in times:
            frame = self.render_frame(timeline, t, source_dir)
            if frame is not None:
                img = Image.fromarray(frame)
                img.thumbnail((320, 180), Image.LANCZOS)
                frames.append(img)
        
        if not frames:
            return b''
        
        # Create sheet
        rows = (len(frames) + columns - 1) // columns
        thumb_w, thumb_h = frames[0].size
        
        sheet = Image.new('RGB', (columns * thumb_w, rows * thumb_h), (0, 0, 0))
        
        for i, frame in enumerate(frames):
            row = i // columns
            col = i % columns
            sheet.paste(frame, (col * thumb_w, row * thumb_h))
        
        # Convert to bytes
        buffer = io.BytesIO()
        sheet.save(buffer, format='JPEG', quality=90)
        
        return buffer.getvalue()


class VideoExporter:
    """
    Exports timeline to video files using FFmpeg.
    
    Features:
    - Composite all tracks
    - Burn in subtitles with styling
    - Choose quality/codec
    - Export selection range
    """
    
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def export_video(
        self,
        timeline: Timeline,
        source_dir: str,
        output_name: str,
        include_subtitles: bool = True,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        quality: str = "high",
        progress_callback: Optional[callable] = None
    ) -> str:
        """
        Export timeline to video file.
        
        Args:
            timeline: The timeline to export
            source_dir: Base directory for source files
            output_name: Output filename (without path)
            include_subtitles: Whether to burn in subtitles
            start_time: Start of export range (None for 0)
            end_time: End of export range (None for timeline duration)
            quality: Quality preset (low, medium, high)
            progress_callback: Callback for progress updates
            
        Returns:
            Path to output file
        """
        output_path = str(self.output_dir / output_name)
        
        # Get video source files
        video_clips = self._get_sorted_video_clips(timeline, source_dir)
        if not video_clips:
            raise ValueError("No video clips found in timeline")
        
        # Build FFmpeg command
        cmd = self._build_ffmpeg_command(
            timeline=timeline,
            video_clips=video_clips,
            source_dir=source_dir,
            output_path=output_path,
            include_subtitles=include_subtitles,
            start_time=start_time or 0,
            end_time=end_time or timeline.duration,
            quality=quality
        )
        
        logger.info(f"Exporting video: {' '.join(cmd)}")
        
        # Run FFmpeg
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        
        # Monitor progress
        for line in process.stderr:
            if progress_callback and 'time=' in line:
                # Parse time from FFmpeg output
                try:
                    time_str = line.split('time=')[1].split()[0]
                    h, m, s = time_str.split(':')
                    current_time = int(h) * 3600 + int(m) * 60 + float(s)
                    duration = (end_time or timeline.duration) - (start_time or 0)
                    progress = min(100, int(current_time / duration * 100))
                    progress_callback(progress, f"Encoding: {progress}%")
                except:
                    pass
        
        process.wait()
        
        if process.returncode != 0:
            raise RuntimeError(f"FFmpeg export failed: {process.stderr.read()}")
        
        return output_path
    
    def _get_sorted_video_clips(self, timeline: Timeline, source_dir: str) -> List[Dict]:
        """Get video clips sorted by timeline position"""
        clips = []
        for track in timeline.video_tracks:
            for clip in sorted(track.clips, key=lambda c: c.timeline_start):
                source_path = self._resolve_path(clip.source, source_dir)
                if source_path and os.path.exists(source_path):
                    clips.append({
                        'path': source_path,
                        'timeline_start': clip.timeline_start,
                        'source_in': clip.source_in,
                        'source_out': clip.source_out,
                        'duration': clip.source_out - clip.source_in
                    })
        return clips
    
    def _build_ffmpeg_command(
        self,
        timeline: Timeline,
        video_clips: List[Dict],
        source_dir: str,
        output_path: str,
        include_subtitles: bool,
        start_time: float,
        end_time: float,
        quality: str
    ) -> List[str]:
        """Build FFmpeg command for export"""
        
        # Quality settings
        quality_map = {
            'low': ('ultrafast', '28'),
            'medium': ('medium', '23'),
            'high': ('slow', '18')
        }
        preset, crf = quality_map.get(quality, quality_map['high'])
        
        # Use first clip as base and concat
        cmd = [
            'ffmpeg', '-y',
        ]
        
        # Add input files
        for clip in video_clips:
            cmd.extend(['-i', clip['path']])
        
        # Build filter complex for concatenation
        if len(video_clips) == 1:
            filter_complex = f"[0:v]setpts=PTS-STARTPTS[v]"
        else:
            parts = []
            for i in range(len(video_clips)):
                parts.append(f"[{i}:v]setpts=PTS-STARTPTS[v{i}]")
            
            concat_inputs = ''.join(f'[v{i}]' for i in range(len(video_clips)))
            parts.append(f"{concat_inputs}concat=n={len(video_clips)}:v=1:a=0[v]")
            filter_complex = ';'.join(parts)
        
        # Add subtitle filter if needed
        if include_subtitles:
            subtitle_clips = self._get_subtitle_clips(timeline)
            if subtitle_clips:
                # Generate ASS subtitle file
                ass_path = output_path.replace('.mp4', '.ass')
                self._generate_ass_file(subtitle_clips, ass_path, timeline)
                filter_complex += f",ass={ass_path}"
        
        cmd.extend([
            '-filter_complex', filter_complex,
            '-map', '[v]',
            '-c:v', 'libx264',
            '-preset', preset,
            '-crf', crf,
            '-c:a', 'aac',
            '-b:a', '192k',
            '-t', str(end_time - start_time),
            output_path
        ])
        
        return cmd
    
    def _get_subtitle_clips(self, timeline: Timeline) -> List[Dict]:
        """Get all subtitle clips with timing and style"""
        clips = []
        for track in timeline.subtitle_tracks:
            if not track.visible:
                continue
            for clip in track.clips:
                clips.append({
                    'text': clip.text,
                    'start': clip.timeline_start,
                    'end': clip.timeline_start + clip.duration,
                    'style': clip.style
                })
        return clips
    
    def _generate_ass_file(self, clips: List[Dict], output_path: str, timeline: Timeline):
        """Generate ASS subtitle file for FFmpeg"""
        with open(output_path, 'w', encoding='utf-8') as f:
            # ASS header
            f.write("""[Script Info]
Title: Auto-generated subtitles
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Inter,28,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2,1,2,10,10,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""".format(width=timeline.width, height=timeline.height))
            
            # Add subtitle events
            for clip in clips:
                start_time = self._seconds_to_ass(clip['start'])
                end_time = self._seconds_to_ass(clip['end'])
                text = clip['text'].replace('\n', '\\N')
                f.write(f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{text}\n")
    
    def _seconds_to_ass(self, seconds: float) -> str:
        """Convert seconds to ASS time format (H:MM:SS.cc)"""
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        cs = int((seconds % 1) * 100)
        return f"{h}:{m:02d}:{s:02d}.{cs:02d}"
    
    def _resolve_path(self, source: str, base_dir: str) -> Optional[str]:
        """Resolve source path"""
        if os.path.isabs(source):
            return source if os.path.exists(source) else None
        if base_dir:
            full_path = os.path.join(base_dir, source)
            if os.path.exists(full_path):
                return full_path
        return None
    
    def export_captions(self, timeline: Timeline, format: str = "srt") -> str:
        """Export captions to SRT or VTT format"""
        clips = []
        for track in timeline.subtitle_tracks:
            for clip in track.clips:
                clips.append(clip)
        
        clips.sort(key=lambda c: c.timeline_start)
        
        if format == "vtt":
            return self._generate_vtt(clips)
        else:
            return self._generate_srt(clips)
    
    def _generate_srt(self, clips: List[Clip]) -> str:
        """Generate SRT format"""
        lines = []
        for i, clip in enumerate(clips, 1):
            start = self._seconds_to_srt(clip.timeline_start)
            end = self._seconds_to_srt(clip.timeline_start + clip.duration)
            lines.append(str(i))
            lines.append(f"{start} --> {end}")
            lines.append(clip.text)
            lines.append("")
        return "\n".join(lines)
    
    def _generate_vtt(self, clips: List[Clip]) -> str:
        """Generate VTT format"""
        lines = ["WEBVTT", ""]
        for clip in clips:
            start = self._seconds_to_vtt(clip.timeline_start)
            end = self._seconds_to_vtt(clip.timeline_start + clip.duration)
            lines.append(f"{start} --> {end}")
            lines.append(clip.text)
            lines.append("")
        return "\n".join(lines)
    
    def _seconds_to_srt(self, seconds: float) -> str:
        """Convert seconds to SRT time format"""
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int((seconds % 1) * 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
    
    def _seconds_to_vtt(self, seconds: float) -> str:
        """Convert seconds to VTT time format"""
        return self._seconds_to_srt(seconds).replace(',', '.')
