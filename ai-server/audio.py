"""
Audio extraction using FFmpeg.
Converts video to 16kHz mono WAV for WhisperX.
"""

import subprocess
import os
from pathlib import Path
from typing import Optional

# Path to local FFmpeg binaries - check local bin first, then system PATH
BASE_DIR = Path(__file__).parent
LOCAL_FFMPEG = BASE_DIR / "bin" / "ffmpeg.exe"
LOCAL_FFPROBE = BASE_DIR / "bin" / "ffprobe.exe"

# Also check winget installation location
WINGET_FFMPEG = Path("C:/Users/jishu/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1-full_build/bin/ffmpeg.exe")
WINGET_FFPROBE = Path("C:/Users/jishu/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1-full_build/bin/ffprobe.exe")

FFMPEG_EXE = str(LOCAL_FFMPEG) if LOCAL_FFMPEG.exists() else (str(WINGET_FFMPEG) if WINGET_FFMPEG.exists() else "ffmpeg")
FFPROBE_EXE = str(LOCAL_FFPROBE) if LOCAL_FFPROBE.exists() else (str(WINGET_FFPROBE) if WINGET_FFPROBE.exists() else "ffprobe")

def extract_audio(video_path: str, output_path: Optional[str] = None) -> str:
    """
    Extract audio from video file using FFmpeg.
    
    Args:
        video_path: Path to the input video file.
        output_path: Optional output path. Auto-generated if not provided.
    
    Returns:
        Path to the extracted WAV file.
    """
    if output_path is None:
        video_p = Path(video_path)
        output_path = str(video_p.parent / f"{video_p.stem}_audio.wav")

    cmd = [
        FFMPEG_EXE,
        "-i", video_path,
        "-vn",                  # No video
        "-acodec", "pcm_s16le", # 16-bit PCM
        "-ar", "16000",         # 16kHz sample rate (WhisperX requirement)
        "-ac", "1",             # Mono channel
        "-y",                   # Overwrite output
        output_path,
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=300,  # 5 minute timeout
    )

    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg audio extraction failed: {result.stderr}")

    if not os.path.exists(output_path):
        raise FileNotFoundError(f"Audio output not found: {output_path}")

    return output_path


def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds using FFprobe."""
    cmd = [
        FFPROBE_EXE,
        "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        video_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

    if result.returncode != 0:
        raise RuntimeError(f"FFprobe failed: {result.stderr}")

    return float(result.stdout.strip())


def get_video_info(video_path: str) -> dict:
    """Get video metadata (resolution, fps, duration, codec)."""
    cmd = [
        FFPROBE_EXE,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        video_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

    if result.returncode != 0:
        raise RuntimeError(f"FFprobe failed: {result.stderr}")

    import json
    info = json.loads(result.stdout)

    video_stream = next(
        (s for s in info.get("streams", []) if s["codec_type"] == "video"), None
    )

    if video_stream is None:
        raise ValueError("No video stream found")

    fps_parts = video_stream.get("r_frame_rate", "30/1").split("/")
    fps = float(fps_parts[0]) / float(fps_parts[1]) if len(fps_parts) == 2 else 30.0

    return {
        "width": int(video_stream.get("width", 1920)),
        "height": int(video_stream.get("height", 1080)),
        "fps": round(float(fps), 2),
        "duration": float(info.get("format", {}).get("duration", 0)),
        "codec": video_stream.get("codec_name", "unknown"),
        "size_bytes": int(info.get("format", {}).get("size", 0)),
    }
