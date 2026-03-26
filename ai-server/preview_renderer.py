"""
Stage 7: Preview Server

Browser video player + overlay rendering for real-time preview.
"""

import json
from typing import Dict, Any, List, Optional
from pathlib import Path


class PreviewRenderer:
    """
    Renders timeline captions as HTML/CSS overlay for browser preview.
    Returns JSON that frontend uses to render captions over video.
    """
    
    def __init__(self):
        self.animations = {
            "pop_in": self._pop_in,
            "fade_in": self._fade_in,
            "slide_up": self._slide_up,
            "typewriter": self._typewriter,
            "none": self._no_animation
        }
        
        self.styles = {
            "default": {
                "font_family": "Arial, sans-serif",
                "font_size": "48px",
                "color": "#ffffff",
                "text_shadow": "2px 2px 4px rgba(0,0,0,0.8)",
                "background": "rgba(0,0,0,0.6)",
                "padding": "8px 16px",
                "border_radius": "4px"
            },
            "bold": {
                "font_family": "Arial Black, sans-serif",
                "font_size": "48px",
                "color": "#ffffff",
                "text_shadow": "3px 3px 6px rgba(0,0,0,0.9)",
                "background": "rgba(0,0,0,0.7)",
                "padding": "8px 16px",
                "border_radius": "4px",
                "font_weight": "bold"
            },
            "gold": {
                "font_family": "Arial, sans-serif",
                "font_size": "48px",
                "color": "#FFD700",
                "text_shadow": "2px 2px 4px rgba(0,0,0,0.8)",
                "background": "rgba(0,0,0,0.6)",
                "padding": "8px 16px",
                "border_radius": "4px"
            },
            "fire": {
                "font_family": "Impact, sans-serif",
                "font_size": "52px",
                "color": "#FF4500",
                "text_shadow": "3px 3px 6px rgba(0,0,0,0.9), 0 0 20px rgba(255,69,0,0.5)",
                "background": "rgba(0,0,0,0.7)",
                "padding": "10px 20px",
                "border_radius": "4px",
                "font_weight": "bold"
            }
        }
    
    def render_for_browser(
        self,
        timeline: Dict[str, Any],
        video_url: str
    ) -> Dict[str, Any]:
        """
        Render timeline as browser-ready JSON.
        Frontend uses this to render captions in real-time.
        """
        captions = timeline.get("captions", [])
        duration = timeline.get("duration", 0)
        
        rendered_captions = []
        for cap in captions:
            style_name = cap.get("style", "default")
            anim_name = cap.get("animation", "pop_in")
            
            style = self.styles.get(style_name, self.styles["default"])
            animation = self.animations.get(anim_name, self._no_animation)
            
            pos = cap.get("position", {"x": 0.5, "y": 0.82})
            
            rendered = {
                "id": cap["id"],
                "index": cap["index"],
                "start": cap["start"],
                "end": cap["end"],
                "text": cap["text"],
                "position": pos,
                "style": style,
                "animation": animation(cap["start"], cap["end"]),
                "words": cap.get("words", [])
            }
            
            rendered_captions.append(rendered)
        
        return {
            "video_url": video_url,
            "duration": duration,
            "captions": rendered_captions,
            "rendered_at": self._get_timestamp()
        }
    
    def generate_html_preview(
        self,
        timeline: Dict[str, Any],
        video_url: str,
        output_path: str
    ) -> str:
        """Generate standalone HTML preview file."""
        preview_data = self.render_for_browser(timeline, video_url)
        
        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CaptionAI Pro Preview</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: Arial, sans-serif; }}
        .video-container {{
            position: relative;
            max-width: 1280px;
            width: 100%;
        }}
        video {{ width: 100%; display: block; }}
        .caption-overlay {{
            position: absolute;
            left: 0;
            right: 0;
            bottom: 15%;
            display: flex;
            justify-content: center;
            pointer-events: none;
        }}
        .caption {{
            position: absolute;
            text-align: center;
            opacity: 0;
            transform: scale(0.8);
            transition: opacity 0.15s, transform 0.15s;
            white-space: nowrap;
        }}
        .caption.active {{
            opacity: 1;
            transform: scale(1);
        }}
        .caption-text {{
            display: inline-block;
        }}
        .controls {{
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            z-index: 1000;
        }}
        .controls button {{
            padding: 10px 20px;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            cursor: pointer;
            border-radius: 4px;
        }}
        .controls button:hover {{
            background: rgba(255,255,255,0.3);
        }}
        .timeline {{
            position: fixed;
            bottom: 70px;
            left: 50%;
            transform: translateX(-50%);
            width: 80%;
            max-width: 800px;
        }}
        .timeline-bar {{
            width: 100%;
            height: 8px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
            cursor: pointer;
            position: relative;
        }}
        .timeline-progress {{
            height: 100%;
            background: #FF4500;
            border-radius: 4px;
            width: 0%;
        }}
        .timeline-markers {{
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 100%;
        }}
        .caption-marker {{
            position: absolute;
            top: -4px;
            width: 3px;
            height: 16px;
            background: #FFD700;
            border-radius: 1px;
        }}
    </style>
</head>
<body>
    <div class="video-container">
        <video id="video" src="{video_url}" crossorigin="anonymous"></video>
        <div class="caption-overlay">
            <div class="caption" id="caption">
                <span class="caption-text" id="caption-text"></span>
            </div>
        </div>
    </div>
    
    <div class="timeline">
        <div class="timeline-bar" id="timeline-bar">
            <div class="timeline-progress" id="progress"></div>
            <div class="timeline-markers" id="markers"></div>
        </div>
    </div>
    
    <div class="controls">
        <button onclick="skip(-5)">-5s</button>
        <button id="play-btn" onclick="togglePlay()">Play</button>
        <button onclick="skip(5)">+5s</button>
    </div>
    
    <script>
    const data = {json.dumps(preview_data)};
    const video = document.getElementById('video');
    const caption = document.getElementById('caption');
    const captionText = document.getElementById('caption-text');
    const progress = document.getElementById('progress');
    const markers = document.getElementById('markers');
    const timelineBar = document.getElementById('timeline-bar');
    const playBtn = document.getElementById('play-btn');
    
    let currentCaption = null;
    
    function togglePlay() {{
        if (video.paused) {{
            video.play();
            playBtn.textContent = 'Pause';
        }} else {{
            video.pause();
            playBtn.textContent = 'Play';
        }}
    }}
    
    function skip(seconds) {{
        video.currentTime += seconds;
    }}
    
    function updateCaption(time) {{
        const active = data.captions.find(c => time >= c.start && time <= c.end);
        
        if (active) {{
            if (currentCaption !== active.id) {{
                currentCaption = active.id;
                captionText.textContent = active.text;
                applyStyle(caption, active.style);
                caption.classList.add('active');
            }}
        }} else {{
            if (currentCaption !== null) {{
                currentCaption = null;
                caption.classList.remove('active');
            }}
        }}
    }}
    
    function applyStyle(el, style) {{
        el.style.fontFamily = style.font_family;
        el.style.fontSize = style.font_size;
        el.style.color = style.color;
        el.style.textShadow = style.text_shadow;
        el.style.background = style.background;
        el.style.padding = style.padding;
        el.style.borderRadius = style.border_radius;
        if (style.font_weight) {{
            el.style.fontWeight = style.font_weight;
        }}
    }}
    
    function updateTimeline() {{
        const pct = (video.currentTime / video.duration) * 100;
        progress.style.width = pct + '%';
    }}
    
    function buildMarkers() {{
        data.captions.forEach(c => {{
            const pct = (c.start / data.duration) * 100;
            const marker = document.createElement('div');
            marker.className = 'caption-marker';
            marker.style.left = pct + '%';
            marker.title = c.text;
            markers.appendChild(marker);
        }});
    }}
    
    video.addEventListener('timeupdate', () => {{
        updateCaption(video.currentTime);
        updateTimeline();
    }});
    
    timelineBar.addEventListener('click', (e) => {{
        const rect = timelineBar.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        video.currentTime = pct * video.duration;
    }});
    
    buildMarkers();
    </script>
</body>
</html>"""
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)
        
        return output_path
    
    def _pop_in(self, start: float, end: float) -> Dict[str, Any]:
        return {
            "type": "pop_in",
            "duration": 0.15,
            "easing": "cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        }
    
    def _fade_in(self, start: float, end: float) -> Dict[str, Any]:
        return {
            "type": "fade_in",
            "duration": 0.2,
            "easing": "ease-out"
        }
    
    def _slide_up(self, start: float, end: float) -> Dict[str, Any]:
        return {
            "type": "slide_up",
            "duration": 0.2,
            "distance": "30px",
            "easing": "ease-out"
        }
    
    def _typewriter(self, start: float, end: float) -> Dict[str, Any]:
        duration = end - start
        return {
            "type": "typewriter",
            "speed": duration / 20
        }
    
    def _no_animation(self, start: float, end: float) -> Dict[str, Any]:
        return {
            "type": "none",
            "duration": 0
        }
    
    def _get_timestamp(self) -> float:
        import time
        return time.time()
