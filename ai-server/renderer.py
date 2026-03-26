"""
Caption Rendering Engine using OpenCV + Pillow.
Renders styled captions frame-by-frame onto the video.
Supports Bengali text rendering via Noto Sans Bengali fonts.
"""

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from typing import Callable, Optional
import subprocess
import os

# Path to local FFmpeg binaries
BASE_DIR = Path(__file__).parent

FFMPEG_BIN = r"C:\Users\jishu\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin"
os.environ["PATH"] = FFMPEG_BIN + os.pathsep + os.environ.get("PATH", "")

FFMPEG_EXE = os.path.join(FFMPEG_BIN, "ffmpeg.exe")

from audio import get_video_info
from animator import calculate_animation_state


def load_font(fonts_dir: str, font_name: str, size: int) -> ImageFont.FreeTypeFont:
    """Load a font from the fonts directory."""
    font_path = Path(fonts_dir) / font_name
    if font_path.exists():
        return ImageFont.truetype(str(font_path), size)
    # Fallback to default
    try:
        return ImageFont.truetype("arial.ttf", size)
    except:
        return ImageFont.load_default()


def draw_text_with_style(
    draw: ImageDraw.ImageDraw,
    text: str,
    position: tuple[int, int],
    font: ImageFont.FreeTypeFont,
    fill_color: tuple[int, ...],
    stroke_color: Optional[tuple[int, ...]] = None,
    stroke_width: int = 0,
    shadow: bool = False,
    shadow_color: tuple[int, ...] = (0, 0, 0, 128),
    shadow_offset: tuple[int, int] = (3, 3),
    opacity: float = 1.0,
):
    """Draw styled text with optional stroke, shadow, and opacity."""
    x, y = position

    if opacity < 1.0:
        fill_color = (fill_color[0], fill_color[1], fill_color[2], int(fill_color[3] * opacity if len(fill_color) > 3 else 255 * opacity))
        if stroke_color:
            stroke_color = (stroke_color[0], stroke_color[1], stroke_color[2], int(stroke_color[3] * opacity if len(stroke_color) > 3 else 255 * opacity))

    # Shadow
    if shadow:
        draw.text(
            (x + shadow_offset[0], y + shadow_offset[1]),
            text,
            font=font,
            fill=shadow_color,
        )

    # Main text with stroke
    draw.text(
        (x, y),
        text,
        font=font,
        fill=fill_color,
        stroke_fill=stroke_color,
        stroke_width=stroke_width,
    )


def render_caption_on_frame(
    frame: np.ndarray,
    text: str,
    words: list,
    current_time: float,
    theme_config: dict,
    fonts_dir: str,
    animation_state: dict,
) -> np.ndarray:
    """
    Render a caption group onto a single video frame.

    Args:
        frame: OpenCV BGR frame (numpy array).
        text: Full caption text to display.
        words: List of word dicts with timing info.
        current_time: Current frame time in seconds.
        theme_config: Theme configuration dict.
        fonts_dir: Path to fonts directory.
        animation_state: Animation parameters (scale, opacity, y_offset, etc.).

    Returns:
        Frame with caption overlay.
    """
    h, w = frame.shape[:2]

    # Convert OpenCV BGR to Pillow RGBA
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(frame_rgb)
    overlay = Image.new("RGBA", pil_image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Theme styling
    style = theme_config.get("style", {})
    font_name = style.get("font", "NotoSansBengali-Bold.ttf")
    font_size = int(style.get("font_size", 48) * (h / 1080))  # Scale for resolution
    position_y = style.get("position_y", 0.85)  # Default: bottom 85%
    text_color = tuple(int(c) for c in style.get("text_color", [255, 255, 255, 255]))
    stroke_color = tuple(int(c) for c in style.get("stroke_color", [0, 0, 0, 255]))
    stroke_width = style.get("stroke_width", 3)
    has_shadow = style.get("shadow", True)
    highlight_color = tuple(int(c) for c in style.get("highlight_color", [255, 215, 0, 255]))
    bg_enabled = style.get("background", False)
    bg_color = tuple(int(c) for c in style.get("bg_color", [0, 0, 0, 160]))
    bg_padding = style.get("bg_padding", 20)

    # Load font
    font = load_font(fonts_dir, font_name, font_size)

    # Apply animation
    opacity = animation_state.get("opacity", 1.0)
    scale = animation_state.get("scale", 1.0)
    y_offset = animation_state.get("y_offset", 0)

    if scale != 1.0:
        font = load_font(fonts_dir, font_name, int(font_size * scale))

    # Calculate text position (centered horizontally)
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]
    x = (w - text_w) // 2
    y = int(h * position_y) - text_h // 2 + int(y_offset)

    # Background rectangle
    if bg_enabled:
        pad = bg_padding
        draw.rounded_rectangle(
            [x - pad, y - pad, x + text_w + pad, y + text_h + pad],
            radius=12,
            fill=bg_color,
        )

    # Word-by-word highlighting (karaoke mode)
    active_word_index = animation_state.get("active_word_index", -1)

    if active_word_index >= 0 and words:
        # Draw each word with individual colors
        cursor_x = x
        for i, word_info in enumerate(words):
            word = word_info["word"] + " "
            color = highlight_color if i <= active_word_index else text_color

            draw_text_with_style(
                draw, word, (cursor_x, y), font,
                fill_color=color,
                stroke_color=stroke_color,
                stroke_width=stroke_width,
                shadow=has_shadow,
                opacity=opacity,
            )
            word_bbox = draw.textbbox((0, 0), word, font=font)
            cursor_x += word_bbox[2] - word_bbox[0]
    else:
        # Draw full text
        draw_text_with_style(
            draw, text, (x, y), font,
            fill_color=text_color,
            stroke_color=stroke_color,
            stroke_width=stroke_width,
            shadow=has_shadow,
            opacity=opacity,
        )

    # Composite
    pil_image = Image.alpha_composite(pil_image.convert("RGBA"), overlay)
    result = cv2.cvtColor(np.array(pil_image.convert("RGB")), cv2.COLOR_RGB2BGR)

    return result


def render_video_with_captions(
    video_path: str,
    word_groups: list,
    theme_config: dict,
    output_path: str,
    fonts_dir: str,
    progress_callback: Optional[Callable] = None,
):
    """
    Main rendering pipeline: read video → overlay captions → write output.

    Args:
        video_path: Input video path.
        word_groups: List of word group dicts from transcriber.
        theme_config: Theme configuration.
        output_path: Output video path.
        fonts_dir: Path to fonts directory.
        progress_callback: Optional callback(progress_fraction) for UI.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1920)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 1080)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 1)

    # Temp output (no audio)
    temp_output = output_path.replace(".mp4", "_temp.mp4")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(temp_output, fourcc, fps, (width, height))

    animation_type = theme_config.get("animation", {}).get("type", "fade")
    animation_duration = theme_config.get("animation", {}).get("duration", 0.15)

    frame_idx: int = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        current_time = float(frame_idx) / float(fps)

        # Find active word group
        active_group = None
        for group in word_groups:
            if group["start"] <= current_time <= group["end"]:
                active_group = group
                break

        if active_group:
            # Calculate animation state
            anim_state = calculate_animation_state(
                animation_type=animation_type,
                current_time=current_time,
                group_start=active_group["start"],
                group_end=active_group["end"],
                words=active_group["words"],
                animation_duration=animation_duration,
            )

            frame = render_caption_on_frame(
                frame=frame,
                text=active_group["text"],
                words=active_group["words"],
                current_time=current_time,
                theme_config=theme_config,
                fonts_dir=fonts_dir,
                animation_state=anim_state,
            )

        writer.write(frame)
        frame_idx += 1

        if progress_callback and frame_idx % 30 == 0:
            progress_callback(frame_idx / max(total_frames, 1))

    cap.release()
    writer.release()

    # Mux audio back using FFmpeg
    cmd = [
        FFMPEG_EXE,
        "-i", temp_output,
        "-i", video_path,
        "-c:v", "copy",
        "-c:a", "aac",
        "-map", "0:v:0",
        "-map", "1:a:0?",
        "-shortest",
        "-y",
        output_path,
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=300)

    # Cleanup temp
    if os.path.exists(temp_output):
        os.remove(temp_output)

    if progress_callback:
        progress_callback(1.0)
