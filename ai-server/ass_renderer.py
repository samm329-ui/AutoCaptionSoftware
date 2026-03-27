"""
Stage 8: ASS Subtitle Export

FFmpeg + ASS subtitles for final burned video.

FFmpeg: auto-detected from PATH, or set FFMPEG_BIN env variable.
"""

import os
import subprocess
import shutil
from typing import List, Dict, Any, Optional
from pathlib import Path


def _get_ffmpeg_exe() -> str:
    custom_bin = os.environ.get("FFMPEG_BIN", "")
    if custom_bin:
        for name in ["ffmpeg.exe", "ffmpeg"]:
            candidate = os.path.join(custom_bin, name)
            if os.path.isfile(candidate):
                return candidate
    found = shutil.which("ffmpeg")
    if found:
        return found
    raise RuntimeError(
        "ffmpeg not found. Install ffmpeg and add it to PATH, "
        "or set FFMPEG_BIN environment variable."
    )


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
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours}:{minutes:02d}:{secs:05.2f}"


def caption_to_ass(text: str, start: float, end: float, style: str = "Default") -> str:
    start_time = format_timeass(start)
    end_time = format_timeass(end)
    text_escaped = text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")
    text_escaped = text_escaped.replace("\n", "\\N")
    return f"Dialogue: 0,{start_time},{end_time},{style},,0,0,0,,{text_escaped}\n"


def render_video_with_ass(
    video_path: str,
    ass_path: str,
    output_path: str,
    font_path: Optional[str] = None
) -> str:
    ffmpeg_exe = _get_ffmpeg_exe()

    # Cross-platform path fix for ASS filter
    ass_path_clean = ass_path.replace("\\", "/")
    if ":" in ass_path_clean:
        # Windows drive letter — escape it for FFmpeg filter
        ass_path_clean = ass_path_clean.replace(":", "\\:")

    vf_filter = f"subtitles='{ass_path_clean}'"

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

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg render failed: {result.stderr}")

    return output_path


class ASSRenderer:
    def __init__(self, fonts_dir: str = None):
        self.fonts_dir = fonts_dir or ""
        self.fonts = self._load_fonts()

    def _load_fonts(self) -> Dict[str, str]:
        fonts = {}
        if self.fonts_dir and os.path.isdir(self.fonts_dir):
            for f in Path(self.fonts_dir).glob("*.ttf"):
                fonts[f.stem] = str(f)
            for f in Path(self.fonts_dir).glob("*.otf"):
                fonts[f.stem] = str(f)
        return fonts

    def get_style_config(self, style_name: str) -> Dict[str, Any]:
        configs = {
            "default": {"font": "Arial", "size": 48, "primary_color": "&H00FFFFFF", "bold": False, "outline": 2, "shadow": 2},
            "bold":    {"font": "Arial", "size": 48, "primary_color": "&H00FFFFFF", "bold": True,  "outline": 2, "shadow": 2},
            "gold":    {"font": "Arial", "size": 48, "primary_color": "&H00FFD700", "bold": False, "outline": 2, "shadow": 2},
            "fire":    {"font": "Arial", "size": 52, "primary_color": "&H00FF4500", "bold": True,  "outline": 3, "shadow": 3},
        }
        return configs.get(style_name, configs["default"])

    def generate_custom_ass(
        self,
        captions: List[Dict[str, Any]],
        output_path: str,
        style: str = "default"
    ) -> str:
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
            text_esc = text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")
            text_esc = text_esc.replace("\n", "\\N")
            content += f"Dialogue: 0,{format_timeass(start)},{format_timeass(end)},Caption,,0,0,0,,{text_esc}\n"

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

        return output_path

    def export_video(self, video_path: str, ass_path: str, output_path: str) -> str:
        return render_video_with_ass(video_path, ass_path, output_path, self.fonts_dir)