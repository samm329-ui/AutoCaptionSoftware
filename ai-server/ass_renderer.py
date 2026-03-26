"""
Stage 8: ASS Subtitle Export

FFmpeg + ASS subtitles for final burned video.

ASS format supports:
  - Font styling (bold, italic)
  - Colors
  - Positioning
  - Animations
  - Unicode (with proper fonts)
"""

import os
import subprocess
from typing import List, Dict, Any, Optional
from pathlib import Path


FFMPEG_BIN = r"C:\Users\jishu\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin"
os.environ["PATH"] = FFMPEG_BIN + os.pathsep + os.environ.get("PATH", "")

ASS_HEADER = """[Script Info]
Title: CaptionAI Pro Export
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,30,1
Style: Bold,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,2,2,10,10,30,1
Style: Gold,Arial,48,&H00FFD700,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,30,1
Style: Fire,Arial,52,&H00FF4500,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,3,2,10,10,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def format_timeass(seconds: float) -> str:
    """Convert seconds to ASS time format (H:MM:SS.cc)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours}:{minutes:02d}:{secs:05.2f}"


def caption_to_ass(
    text: str,
    start: float,
    end: float,
    style: str = "Default"
) -> str:
    """Convert a caption to ASS dialogue line."""
    start_time = format_timeass(start)
    end_time = format_timeass(end)
    
    text_escaped = text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")
    text_escaped = text_escaped.replace("\n", "\\N")
    
    return f"Dialogue: 0,{start_time},{end_time},{style},,0,0,0,,{text_escaped}\n"


def generate_ass(
    captions: List[Dict[str, Any]],
    output_path: str,
    default_style: str = "Default"
) -> str:
    """Generate ASS subtitle file from captions."""
    content = ASS_HEADER
    
    for cap in captions:
        text = cap.get("text", "")
        if not text:
            continue
        
        start = cap.get("start", 0)
        end = cap.get("end", 0)
        style = cap.get("style", default_style)
        
        content += caption_to_ass(text, start, end, style)
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    return output_path


def render_video_with_ass(
    video_path: str,
    ass_path: str,
    output_path: str,
    font_path: Optional[str] = None
) -> str:
    """
    Render video with ASS subtitles using FFmpeg.
    Burns subtitles into the video.
    Uses subtitles filter instead of ass filter to avoid Windows path issues.
    """
    ffmpeg_exe = os.path.join(FFMPEG_BIN, "ffmpeg.exe")
    
    ass_path_ffmpeg = ass_path.replace("\\", "/").replace(":", "\\:")
    
    vf_filter = f"subtitles='{ass_path_ffmpeg}'"
    
    cmd = [
        ffmpeg_exe,
        "-i", video_path,
        "-vf", vf_filter,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-y",
        output_path
    ]
    
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"FFmpeg error: {result.stderr}")
        raise RuntimeError(f"FFmpeg failed: {result.stderr}")
    
    return output_path


def render_video_simple(
    video_path: str,
    output_path: str,
    fonts_dir: str = None
) -> str:
    """
    Simple FFmpeg render without ASS (for when subtitles are pre-burned).
    Just copies audio and re-encodes video.
    """
    ffmpeg_exe = os.path.join(FFMPEG_BIN, "ffmpeg.exe")
    
    cmd = [
        ffmpeg_exe,
        "-i", video_path,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-y",
        output_path
    ]
    
    subprocess.run(cmd, capture_output=True, text=True, check=True)
    
    return output_path


class ASSRenderer:
    """ASS subtitle renderer with theme support."""
    
    def __init__(self, fonts_dir: str = None):
        self.fonts_dir = fonts_dir or ""
        self.fonts = self._load_fonts()
    
    def _load_fonts(self) -> Dict[str, str]:
        """Load available fonts from fonts directory."""
        fonts = {}
        if self.fonts_dir and os.path.isdir(self.fonts_dir):
            for f in Path(self.fonts_dir).glob("*.ttf"):
                fonts[f.stem] = str(f)
            for f in Path(self.fonts_dir).glob("*.otf"):
                fonts[f.stem] = str(f)
        return fonts
    
    def get_style_config(self, style_name: str) -> Dict[str, Any]:
        """Get ASS style configuration for a named style."""
        configs = {
            "default": {
                "font": "Arial",
                "size": 48,
                "primary_color": "&H00FFFFFF",
                "bold": False,
                "outline": 2,
                "shadow": 2
            },
            "bold": {
                "font": "Arial",
                "size": 48,
                "primary_color": "&H00FFFFFF",
                "bold": True,
                "outline": 2,
                "shadow": 2
            },
            "gold": {
                "font": "Arial",
                "size": 48,
                "primary_color": "&H00FFD700",
                "bold": False,
                "outline": 2,
                "shadow": 2
            },
            "fire": {
                "font": "Arial",
                "size": 52,
                "primary_color": "&H00FF4500",
                "bold": True,
                "outline": 3,
                "shadow": 3
            },
            "karaoke": {
                "font": "Arial",
                "size": 48,
                "primary_color": "&H00FFD700",
                "bold": False,
                "outline": 2,
                "shadow": 2
            }
        }
        return configs.get(style_name, configs["default"])
    
    def generate_custom_ass(
        self,
        captions: List[Dict[str, Any]],
        output_path: str,
        style: str = "default"
    ) -> str:
        """Generate ASS file with custom styling."""
        config = self.get_style_config(style)
        
        header = f"""[Script Info]
Title: CaptionAI Pro - {style}
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,{config['font']},{config['size']},{config['primary_color']},&H000000FF,&H00000000,&H00000000,{1 if config['bold'] else 0},0,0,0,100,100,0,0,1,{config['outline']},{config['shadow']},2,10,10,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        
        content = header
        for cap in captions:
            text = cap.get("text", "")
            if not text:
                continue
            
            start = cap.get("start", 0)
            end = cap.get("end", 0)
            
            text_escaped = text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")
            text_escaped = text_escaped.replace("\n", "\\N")
            
            start_str = format_timeass(start)
            end_str = format_timeass(end)
            
            content += f"Dialogue: 0,{start_str},{end_str},Caption,,0,0,0,,{text_escaped}\n"
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        return output_path
    
    def export_video(
        self,
        video_path: str,
        ass_path: str,
        output_path: str
    ) -> str:
        """Export final video with burned subtitles."""
        return render_video_with_ass(video_path, ass_path, output_path, self.fonts_dir)
