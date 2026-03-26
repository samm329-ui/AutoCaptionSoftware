"""
Renderer Pro - Video Caption Rendering using OpenCV + Pillow
Frame-by-frame rendering - avoids FFmpeg path issues entirely!
"""

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from typing import Callable, Optional, List, Dict, Any
import subprocess
import os

FFMPEG_BIN = r"C:\Users\jishu\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin"
os.environ["PATH"] = FFMPEG_BIN + os.pathsep + os.environ.get("PATH", "")

FFMPEG_EXE = os.path.join(FFMPEG_BIN, "ffmpeg.exe")


def load_font(fonts_dir: str, font_name: str, size: int) -> ImageFont.FreeTypeFont:
    """Load font from fonts directory, fallback to Arial/default."""
    font_path = Path(fonts_dir) / font_name
    if font_path.exists():
        return ImageFont.truetype(str(font_path), size)
    try:
        return ImageFont.truetype("arial.ttf", size)
    except:
        return ImageFont.load_default()


def draw_text_with_style(
    draw: ImageDraw.ImageDraw,
    text: str,
    position: tuple,
    font,
    fill_color: tuple,
    stroke_color: Optional[tuple] = None,
    stroke_width: int = 0,
    shadow: bool = False,
    shadow_color: tuple = (0, 0, 0, 128),
    shadow_offset: tuple = (3, 3),
    opacity: float = 1.0,
):
    """Draw styled text with optional stroke, shadow, and opacity."""
    x, y = position
    
    if opacity < 1.0:
        fill_color = (fill_color[0], fill_color[1], fill_color[2], int(255 * opacity))
        if stroke_color:
            stroke_color = (stroke_color[0], stroke_color[1], stroke_color[2], int(255 * opacity))
    
    if shadow:
        draw.text((x + shadow_offset[0], y + shadow_offset[1]), text, font=font, fill=shadow_color)
    
    draw.text((x, y), text, font=font, fill=fill_color, stroke_fill=stroke_color, stroke_width=stroke_width)


def _ease_out_cubic(t: float) -> float:
    return 1 - pow(1 - t, 3)


def _ease_out_bounce(t: float) -> float:
    n1, d1 = 7.5625, 2.75
    if t < 1 / d1:
        return n1 * t * t
    if t < 2 / d1:
        t -= 1.5 / d1
        return n1 * t * t + 0.75
    if t < 2.5 / d1:
        t -= 2.25 / d1
        return n1 * t * t + 0.9375
    t -= 2.625 / d1
    return n1 * t * t + 0.984375


def _ease_out_back(t: float) -> float:
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2)


def _calculate_animation(animation_type: str, time_in_caption: float, fade_in_end: float) -> Dict:
    """Calculate animation state based on time in caption."""
    state = {"scale": 1.0, "opacity": 1.0, "y_offset": 0, "active_word_index": -1}
    
    if time_in_caption < fade_in_end:
        t = time_in_caption / fade_in_end
        
        if animation_type == "pop":
            state["scale"] = 0.5 + 0.5 * _ease_out_back(t)
            state["opacity"] = t
        elif animation_type == "slide":
            state["y_offset"] = 50 * (1 - _ease_out_cubic(t))
            state["opacity"] = t
        elif animation_type == "fade":
            state["opacity"] = t
        elif animation_type == "bounce":
            state["scale"] = _ease_out_bounce(t)
            state["opacity"] = t
    
    return state


class VideoRendererPro:
    def __init__(self):
        self.ffmpeg_exe = FFMPEG_EXE
    
    def render(
        self,
        video_path: str,
        caption_groups: List[Dict[str, Any]],
        theme_config: Dict[str, Any],
        output_path: str,
        fonts_dir: str,
        progress_callback: Optional[Callable[[float], None]] = None,
    ):
        style = theme_config.get("style", {})
        animation_config = theme_config.get("animation", {})
        
        font_name = style.get("font", "Arial.ttf")
        font_size = style.get("font_size", 48)
        position_y = style.get("position_y", 0.85)
        text_color = tuple(int(c) for c in style.get("text_color", [255, 255, 255, 255]))
        stroke_color = tuple(int(c) for c in style.get("stroke_color", [0, 0, 0, 255]))
        stroke_width = style.get("stroke_width", 3)
        has_shadow = style.get("shadow", True)
        highlight_color = tuple(int(c) for c in style.get("highlight_color", [255, 215, 0, 255]))
        bg_enabled = style.get("background", False)
        bg_color = tuple(int(c) for c in style.get("bg_color", [0, 0, 0, 160]))
        bg_padding = style.get("bg_padding", 15)
        
        animation_type = animation_config.get("type", "fade")
        animation_duration = animation_config.get("duration", 0.15)
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {video_path}")
        
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1920)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 1080)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 1)
        
        temp_output = output_path.replace(".mp4", "_temp.mp4")
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(temp_output, fourcc, fps, (width, height))
        
        print(f"Rendering {total_frames} frames...")
        
        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            current_time = float(frame_idx) / fps
            
            active_group = None
            for group in caption_groups:
                if group["start"] <= current_time <= group["end"]:
                    active_group = group
                    break
            
            if active_group:
                time_in_caption = current_time - active_group["start"]
                anim_state = _calculate_animation(animation_type, time_in_caption, animation_duration)
                
                frame = self._render_caption_frame(
                    frame, active_group, style, fonts_dir,
                    font_name, font_size, position_y, text_color, stroke_color,
                    stroke_width, has_shadow, highlight_color, bg_enabled,
                    bg_color, bg_padding, width, height, anim_state
                )
            
            writer.write(frame)
            frame_idx += 1
            
            if progress_callback and frame_idx % 30 == 0:
                progress_callback(frame_idx / max(total_frames, 1))
        
        cap.release()
        writer.release()
        
        cmd = [
            self.ffmpeg_exe,
            "-i", temp_output,
            "-i", video_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-map", "0:v:0",
            "-map", "1:a:0?",
            "-shortest",
            "-y",
            output_path
        ]
        subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if os.path.exists(temp_output):
            os.remove(temp_output)
        
        if progress_callback:
            progress_callback(1.0)
        
        print(f"Video rendered: {output_path}")
    
    def _render_caption_frame(
        self,
        frame: np.ndarray,
        group: Dict,
        style: Dict,
        fonts_dir: str,
        font_name: str,
        font_size: int,
        position_y: float,
        text_color: tuple,
        stroke_color: tuple,
        stroke_width: int,
        has_shadow: bool,
        highlight_color: tuple,
        bg_enabled: bool,
        bg_color: tuple,
        bg_padding: int,
        width: int,
        height: int,
        anim_state: Dict,
    ) -> np.ndarray:
        h, w = frame.shape[:2]
        font_size_scaled = int(font_size * (h / 1080))
        
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(frame_rgb)
        overlay = Image.new("RGBA", pil_image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        
        font = load_font(fonts_dir, font_name, font_size_scaled)
        
        opacity = anim_state.get("opacity", 1.0)
        scale = anim_state.get("scale", 1.0)
        y_offset = anim_state.get("y_offset", 0)
        
        if scale != 1.0:
            font = load_font(fonts_dir, font_name, int(font_size_scaled * scale))
        
        text = group.get("text", "")
        words = group.get("words", [])
        
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        text_h = text_bbox[3] - text_bbox[1]
        x = (w - text_w) // 2
        y = int(h * position_y) - text_h // 2 + int(y_offset)
        
        if bg_enabled:
            draw.rounded_rectangle(
                [x - bg_padding, y - bg_padding, x + text_w + bg_padding, y + text_h + bg_padding],
                radius=12, fill=bg_color
            )
        
        draw_text_with_style(
            draw, text, (x, y), font,
            fill_color=text_color,
            stroke_color=stroke_color,
            stroke_width=stroke_width,
            shadow=has_shadow,
            opacity=opacity
        )
        
        pil_image = Image.alpha_composite(pil_image.convert("RGBA"), overlay)
        result = cv2.cvtColor(np.array(pil_image.convert("RGB")), cv2.COLOR_RGB2BGR)
        
        return result
