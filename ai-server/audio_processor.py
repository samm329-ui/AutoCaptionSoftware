"""
Audio Processing Module
Extract audio from video, get video metadata
"""

import subprocess
import json
import os
from pathlib import Path
from typing import Dict, Any, Optional

FFMPEG_PATH = r"C:\Users\jishu\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin"
FFPROBE_PATH = FFMPEG_PATH


def extract_audio(
    video_path: str,
    output_dir: str = "./storage/audio",
    sample_rate: int = 16000
) -> str:
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    video_name = Path(video_path).stem
    audio_path = str(Path(output_dir) / f"{video_name}.wav")
    
    ffmpeg_exe = os.path.join(FFMPEG_PATH, "ffmpeg.exe")
    
    cmd = [
        ffmpeg_exe,
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", str(sample_rate),
        "-ac", "1",
        "-y",
        audio_path
    ]
    
    try:
        subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=300
        )
        print(f"Audio extracted: {audio_path}")
        return audio_path
    
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr}")
        raise RuntimeError(f"Failed to extract audio: {e.stderr}")
    
    except subprocess.TimeoutExpired:
        raise RuntimeError("Audio extraction timed out (>5 minutes)")


def get_video_info(video_path: str) -> Dict[str, Any]:
    ffprobe_exe = os.path.join(FFPROBE_PATH, "ffprobe.exe")
    
    cmd = [
        ffprobe_exe,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        video_path
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=30
        )
        
        data = json.loads(result.stdout)
        
        video_stream = None
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video":
                video_stream = stream
                break
        
        if not video_stream:
            raise ValueError("No video stream found")
        
        fps_str = video_stream.get("r_frame_rate", "30/1")
        if "/" in fps_str:
            num, den = map(float, fps_str.split("/"))
            fps = num / den if den != 0 else 30.0
        else:
            fps = float(fps_str)
        
        return {
            "width": int(video_stream.get("width", 1920)),
            "height": int(video_stream.get("height", 1080)),
            "fps": fps,
            "duration": float(data.get("format", {}).get("duration", 0)),
            "codec": video_stream.get("codec_name", "unknown"),
            "bitrate": int(data.get("format", {}).get("bit_rate", 0))
        }
    
    except (subprocess.CalledProcessError, json.JSONDecodeError, ValueError) as e:
        print(f"Could not get video info: {e}")
        return {
            "width": 1920,
            "height": 1080,
            "fps": 30.0,
            "duration": 0,
            "codec": "unknown",
            "bitrate": 0
        }


def get_video_duration(video_path: str) -> float:
    info = get_video_info(video_path)
    return info.get("duration", 0)
