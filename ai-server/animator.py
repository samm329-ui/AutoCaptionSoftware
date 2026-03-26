"""
Animation system for caption appearances.
PRD animations: pop_scale, fade, slide_up, word_by_word (karaoke).
"""

import math


def calculate_animation_state(
    animation_type: str,
    current_time: float,
    group_start: float,
    group_end: float,
    words: list,
    animation_duration: float = 0.15,
) -> dict:
    """
    Calculate the animation state for the current frame.

    Args:
        animation_type: One of 'pop_scale', 'fade', 'slide_up', 'word_by_word'.
        current_time: Current video time in seconds.
        group_start: Start time of the word group.
        group_end: End time of the word group.
        words: List of word dicts with start/end times.
        animation_duration: Duration of appear/disappear animation in seconds.

    Returns:
        dict with: opacity, scale, y_offset, active_word_index
    """
    elapsed = current_time - group_start
    remaining = group_end - current_time
    progress = min(elapsed / animation_duration, 1.0) if animation_duration > 0 else 1.0
    exit_progress = min(remaining / animation_duration, 1.0) if animation_duration > 0 else 1.0

    state = {
        "opacity": 1.0,
        "scale": 1.0,
        "y_offset": 0,
        "active_word_index": -1,
    }

    if animation_type == "pop_scale":
        # Scale from 0.5 → 1.0 with overshoot
        if progress < 1.0:
            # Ease-out back
            t = progress
            overshoot = 1.2
            state["scale"] = 0.5 + 0.5 * _ease_out_back(t, overshoot)
            state["opacity"] = min(t * 2, 1.0)
        elif exit_progress < 1.0:
            state["scale"] = 1.0 - 0.3 * (1.0 - exit_progress)
            state["opacity"] = exit_progress

    elif animation_type == "fade":
        # Simple opacity fade in/out
        if progress < 1.0:
            state["opacity"] = _ease_out_quad(progress)
        elif exit_progress < 1.0:
            state["opacity"] = exit_progress

    elif animation_type == "slide_up":
        # Slide up 20px while fading in
        slide_distance = 20
        if progress < 1.0:
            state["y_offset"] = slide_distance * (1.0 - _ease_out_quad(progress))
            state["opacity"] = _ease_out_quad(progress)
        elif exit_progress < 1.0:
            state["y_offset"] = -slide_distance * (1.0 - exit_progress)
            state["opacity"] = exit_progress

    elif animation_type == "word_by_word":
        # Karaoke: highlight each word as it's spoken
        state["opacity"] = 1.0 if progress >= 0.3 else progress / 0.3
        state["active_word_index"] = -1

        for i, word in enumerate(words):
            if current_time >= word.get("start", 0):
                state["active_word_index"] = i

    return state


def _ease_out_quad(t: float) -> float:
    """Quadratic ease-out: decelerating to zero velocity."""
    return 1 - (1 - t) * (1 - t)


def _ease_out_back(t: float, overshoot: float = 1.70158) -> float:
    """Ease-out with overshoot/bounce."""
    t = t - 1
    return t * t * ((overshoot + 1) * t + overshoot) + 1


def _ease_in_out_cubic(t: float) -> float:
    """Cubic ease-in-out."""
    if t < 0.5:
        return 4 * t * t * t
    else:
        return 1 - pow(-2 * t + 2, 3) / 2


def get_animation_config(animation_name: str) -> dict:
    """Get default animation parameters by name."""
    configs = {
        "pop_scale": {
            "type": "pop_scale",
            "duration": 0.15,
            "description": "Scale from 0.5→1.0 with overshoot bounce",
        },
        "fade": {
            "type": "fade",
            "duration": 0.1,
            "description": "Smooth opacity fade in/out",
        },
        "slide_up": {
            "type": "slide_up",
            "duration": 0.15,
            "description": "Slide up 20px while fading in",
        },
        "word_by_word": {
            "type": "word_by_word",
            "duration": 0.05,
            "description": "Karaoke-style word highlighting",
        },
    }
    return configs.get(animation_name, configs["fade"])
