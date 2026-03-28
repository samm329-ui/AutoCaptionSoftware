"""
CaptionAI Pro - Correct Pipeline Implementation

Pipeline (CORRECT):
  media → normalized audio → multilingual ASR → word timestamps → canonical transcript 
  → smart segmentation → English/Hinglish display tracks → timeline JSON 
  → live preview → ASS/FFmpeg render

ONE SOURCE OF TRUTH: word-level timed transcript
"""

import os
import time
import shutil
import json
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, BackgroundTasks, HTTPException, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from transcription_engine import TranscriptionEngine
from smart_segmentation import SmartSegmenter
from display_processor import HinglishProcessor
from timeline_model import Timeline, Caption, TimelineEditor
from preview_renderer import PreviewRenderer
from ass_renderer import ASSRenderer
from language_router import route_transcript

load_dotenv()

BASE_DIR = Path(__file__).parent
STORAGE_DIR = BASE_DIR / "storage"
VIDEOS_DIR = STORAGE_DIR / "videos"
AUDIO_DIR = STORAGE_DIR / "audio"
RENDERED_DIR = STORAGE_DIR / "rendered"
TIMELINES_DIR = STORAGE_DIR / "timelines"
PREVIEWS_DIR = STORAGE_DIR / "previews"
FONTS_DIR = BASE_DIR / "fonts"

for d in [VIDEOS_DIR, AUDIO_DIR, RENDERED_DIR, TIMELINES_DIR, PREVIEWS_DIR, FONTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)


class LocalStorage:
    def __init__(self):
        self.projects: Dict[str, Dict[str, Any]] = {}
        self.timelines: Dict[str, Dict[str, Any]] = {}
        self.exports: Dict[str, Dict[str, Any]] = {}
    
    def save(self):
        data = {
            "projects": self.projects,
            "timelines": self.timelines,
            "exports": self.exports
        }
        with open(STORAGE_DIR / "database.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def load(self):
        db_path = STORAGE_DIR / "database.json"
        if db_path.exists():
            try:
                with open(db_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.projects = data.get("projects", {})
                    self.timelines = data.get("timelines", {})
                    self.exports = data.get("exports", {})
            except (json.JSONDecodeError, IOError):
                self.projects = {}
                self.timelines = {}
                self.exports = {}


storage = LocalStorage()
storage.load()

transcription_engine: Optional[TranscriptionEngine] = None
segmenter: Optional[SmartSegmenter] = None
display_processor: Optional[HinglishProcessor] = None
preview_renderer: Optional[PreviewRenderer] = None
ass_renderer: Optional[ASSRenderer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global transcription_engine, segmenter, display_processor, preview_renderer, ass_renderer
    
    print("=" * 60)
    print("CaptionAI Pro - CORRECT PIPELINE")
    print("=" * 60)
    
    model_size = os.environ.get("WHISPER_MODEL", "base")
    transcription_engine = TranscriptionEngine(model_size=model_size)
    segmenter = SmartSegmenter()
    display_processor = HinglishProcessor()
    preview_renderer = PreviewRenderer()
    ass_renderer = ASSRenderer(str(FONTS_DIR))
    
    print("All engines initialized!")
    print("Pipeline: media → ASR → timeline → preview → export")
    
    yield
    
    storage.save()
    print("CaptionAI Pro shutting down...")


app = FastAPI(
    title="CaptionAI Pro",
    version="3.0.0",
    description="Correct pipeline: media → ASR → timeline → preview → export",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def update_project_status(project_id: str, status: str, progress: int, step: str):
    if project_id in storage.projects:
        storage.projects[project_id]["status"] = status
        storage.projects[project_id]["progress"] = progress
        storage.projects[project_id]["step"] = step
        storage.projects[project_id]["updated_at"] = time.time()


def run_processing(project_id: str, video_path: str, output_mode: str = "native"):
    """
    CORRECT PIPELINE:
    1. Normalize audio (mono 16kHz WAV)
    2. Multilingual ASR with auto-detect
    3. Build canonical transcript
    4. Smart segmentation
    5. Generate display tracks (English, Hinglish)
    6. Create timeline model
    """
    try:
        if project_id not in storage.projects:
            storage.projects[project_id] = {}
        storage.projects[project_id].update({
            "id": project_id,
            "video_path": video_path,
            "status": "processing",
            "progress": 10,
            "step": "Extracting audio...",
            "created_at": storage.projects[project_id].get("created_at", time.time()),
            "updated_at": time.time()
        })
        storage.save()
        
        print(f"\n[{project_id}] Pipeline Stage 1: Audio Normalization")
        audio_path = transcription_engine.process_media(video_path, str(AUDIO_DIR))
        update_project_status(project_id, "processing", 20, "Transcribing with AI...")
        
        print(f"\n[{project_id}] Pipeline Stage 2: Multilingual ASR")
        transcript = transcription_engine.transcribe(audio_path)
        update_project_status(project_id, "processing", 50, "Processing transcript...")
        
        raw_words = transcript["words"]
        detected_lang = transcript["language"]
        duration = transcript.get("duration", 0)
        
        print(f"  Detected language: {detected_lang}")
        print(f"  Raw words: {len(raw_words)}")
        
        # ── STAGE 3: LANGUAGE-ROUTED NORMALIZATION (mode-aware, not one-size-fits-all) ──
        print(f"\n[{project_id}] Pipeline Stage 3: Language-Routed Normalization")
        print(f"  Output mode: {output_mode}")
        update_project_status(project_id, "processing", 55, "Normalizing language...")
        canonical_words = route_transcript(raw_words, detected_lang=detected_lang, output_mode=output_mode)
        print(f"  Normalized words: {len(canonical_words)}")
        
        storage.projects[project_id]["canonical_transcript"] = {
            "words": canonical_words,
            "language": detected_lang,
            "duration": duration
        }
        
        print(f"\n[{project_id}] Pipeline Stage 4: Smart Segmentation")
        update_project_status(project_id, "processing", 60, "Creating captions...")
        segments = segmenter.segment(
            canonical_words,
            max_line_width=38,
            min_pause_gap=0.45,
            max_reading_speed=18.0
        )
        
        print(f"  Created {len(segments)} segments")
        
        print(f"\n[{project_id}] Pipeline Stage 5: Generate Display Tracks")
        update_project_status(project_id, "processing", 80, "Finalizing...")
        
        for seg in segments:
            # Text is already normalized Hinglish — only format it here
            display_text = display_processor.process_text(seg["text"])
            seg["text_hinglish"] = display_text
            seg["text_english"] = seg["text"]
            seg["emphasis"] = display_processor.detect_emphasis(display_text)
        
        print(f"  Display tracks generated")
        
        print(f"\n[{project_id}] Pipeline Stage 6: Create Timeline Model")
        update_project_status(project_id, "processing", 90, "Creating timeline...")
        
        timeline = Timeline(
            id=project_id,
            source_file=video_path,
            duration=duration,
            language=detected_lang,
            captions=[],
            created_at=time.time(),
            updated_at=time.time()
        )
        
        for i, seg in enumerate(segments):
            cap = Caption(
                id=f"cap_{i:03d}",
                index=i,
                start=seg["start"],
                end=seg["end"],
                text=seg["text_hinglish"],
                words=seg.get("words", []),
                style="default",
                animation="pop_in",
                position={"x": 0.5, "y": 0.82},
                editable=True,
                confidence=seg.get("confidence", 1.0),
                emphasis=seg.get("emphasis", [])
            )
            timeline.captions.append(cap)
        
        storage.timelines[project_id] = timeline.to_dict()
        update_project_status(project_id, "transcribed", 100, "Ready for rendering!")
        storage.projects[project_id]["timeline_id"] = project_id
        storage.projects[project_id]["timeline"] = timeline.to_dict()
        storage.save()
        
        print(f"\n[{project_id}] Pipeline Complete!")
        print(f"  Timeline: {len(timeline.captions)} captions")
        
    except Exception as e:
        import traceback
        print(f"\n[{project_id}] ERROR: {e}")
        print(traceback.format_exc())
        
        if project_id in storage.projects:
            update_project_status(project_id, "error", 0, f"Error: {str(e)}")
            storage.projects[project_id]["error"] = str(e)
        storage.save()


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "3.0.0",
        "pipeline": "media → ASR → timeline → preview → export",
        "features": [
            "Multilingual ASR with auto-detect",
            "Smart segmentation (no fixed 3-word)",
            "Mixed-script Hinglish display",
            "Editable timeline model",
            "Browser preview",
            "ASS/FFmpeg export"
        ]
    }


@app.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    display_mode: str = Form("hinglish"),
    output_mode: str = Form("native")
):
    """
    Upload video for captioning.
    
    output_mode options:
      - "native": Keep original script (Hindi→Devanagari, English→Latin)
      - "hinglish": Romanized Hindi/Hinglish
      - "english": English output
    """
    project_id = str(uuid.uuid4())
    video_path = str(VIDEOS_DIR / f"{project_id}.mp4")
    
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    storage.projects[project_id] = {
        "id": project_id,
        "filename": file.filename,
        "video_path": video_path,
        "display_mode": display_mode,
        "output_mode": output_mode,
        "status": "processing",
        "created_at": time.time()
    }
    storage.save()
    
    background_tasks.add_task(run_processing, project_id, video_path, output_mode)
    
    return {
        "job_id": project_id,
        "project_id": project_id,
        "status": "processing",
        "output_mode": output_mode,
        "message": "Video uploaded. Pipeline started."
    }


@app.get("/project/{project_id}")
async def get_project(project_id: str):
    if project_id not in storage.projects:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = storage.projects[project_id].copy()
    
    if project["status"] == "ready" and project_id in storage.timelines:
        project["timeline"] = storage.timelines[project_id]
    
    return project


@app.get("/timeline/{project_id}")
async def get_timeline(project_id: str):
    if project_id not in storage.timelines:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    timeline = storage.timelines[project_id]
    
    display_mode = storage.projects.get(project_id, {}).get("display_mode", "hinglish")
    
    if display_mode == "english":
        for cap in timeline["captions"]:
            cap["text"] = cap.get("text_english", cap["text"])
    
    return timeline


@app.put("/caption/{project_id}/{caption_id}")
async def update_caption(
    project_id: str,
    caption_id: str,
    text: str = Form(None),
    start: float = Form(None),
    end: float = Form(None),
    style: str = Form(None),
    animation: str = Form(None),
    position_x: float = Form(None),
    position_y: float = Form(None)
):
    if project_id not in storage.timelines:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    timeline = storage.timelines[project_id]
    timeline_obj = Timeline.from_dict(timeline)
    editor = TimelineEditor(timeline_obj)
    
    updates = {}
    if text is not None:
        updates["text"] = text
    if start is not None:
        updates["start"] = start
    if end is not None:
        updates["end"] = end
    if style is not None:
        updates["style"] = style
    if animation is not None:
        updates["animation"] = animation
    if position_x is not None or position_y is not None:
        existing_cap = editor.get_caption(caption_id)
        pos = existing_cap.position.copy() if existing_cap else {"x": 0.5, "y": 0.82}
        if position_x is not None:
            pos["x"] = position_x
        if position_y is not None:
            pos["y"] = position_y
        updates["position"] = pos
    
    editor.update_caption(caption_id, **updates)
    
    storage.timelines[project_id] = timeline_obj.to_dict()
    storage.save()
    
    updated_cap = editor.get_caption(caption_id)
    return {"success": True, "caption": updated_cap.to_dict() if updated_cap else None}


@app.delete("/caption/{project_id}/{caption_id}")
async def delete_caption(project_id: str, caption_id: str):
    if project_id not in storage.timelines:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    timeline = storage.timelines[project_id]
    timeline_obj = Timeline.from_dict(timeline)
    editor = TimelineEditor(timeline_obj)
    
    editor.delete_caption(caption_id)
    
    storage.timelines[project_id] = timeline_obj.to_dict()
    storage.save()
    
    return {"success": True}


@app.post("/caption/{project_id}/{caption_id}/split")
async def split_caption(project_id: str, caption_id: str, split_at: float = Form(...)):
    if project_id not in storage.timelines:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    timeline = storage.timelines[project_id]
    timeline_obj = Timeline.from_dict(timeline)
    editor = TimelineEditor(timeline_obj)
    
    result = editor.split_caption(caption_id, split_at)
    
    if not result:
        raise HTTPException(status_code=400, detail="Cannot split at this position")
    
    storage.timelines[project_id] = timeline_obj.to_dict()
    storage.save()
    
    return {"success": True, "captions": [c.to_dict() for c in result]}


@app.post("/caption/{project_id}/{caption_id}/merge-next")
async def merge_caption(project_id: str, caption_id: str):
    if project_id not in storage.timelines:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    timeline = storage.timelines[project_id]
    timeline_obj = Timeline.from_dict(timeline)
    editor = TimelineEditor(timeline_obj)
    
    result = editor.merge_caption_with_next(caption_id)
    
    if not result:
        raise HTTPException(status_code=400, detail="Cannot merge (no next caption)")
    
    storage.timelines[project_id] = timeline_obj.to_dict()
    storage.save()
    
    return {"success": True, "caption": result.to_dict()}


@app.get("/preview/{project_id}")
async def get_preview(project_id: str):
    if project_id not in storage.timelines:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    if project_id not in storage.projects:
        raise HTTPException(status_code=404, detail="Project not found")
    
    timeline = storage.timelines[project_id]
    video_path = storage.projects[project_id].get("video_path", "")
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=400, detail="Video file not found")
    
    video_url = f"/video/{project_id}"
    
    preview_data = preview_renderer.render_for_browser(timeline, video_url)
    
    return JSONResponse(content=preview_data)


@app.get("/preview-html/{project_id}")
async def get_preview_html(project_id: str):
    if project_id not in storage.timelines:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    if project_id not in storage.projects:
        raise HTTPException(status_code=404, detail="Project not found")
    
    timeline = storage.timelines[project_id]
    video_path = storage.projects[project_id].get("video_path", "")
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=400, detail="Video file not found")
    
    video_url = f"/video/{project_id}"
    html_path = PREVIEWS_DIR / f"{project_id}_preview.html"
    
    preview_renderer.generate_html_preview(timeline, video_url, str(html_path))
    
    return FileResponse(html_path, media_type="text/html")


@app.get("/video/{project_id}")
async def serve_video(project_id: str):
    if project_id not in storage.projects:
        raise HTTPException(status_code=404, detail="Project not found")
    
    video_path = storage.projects[project_id].get("video_path", "")
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(video_path, media_type="video/mp4")


@app.post("/render")
async def render_video(
    background_tasks: BackgroundTasks,
    job_id: str = Form(...),
    theme: str = Form("default"),
    animation: str = Form("pop_in")
):
    """Legacy render endpoint compatible with frontend."""
    if job_id not in storage.timelines:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    if job_id not in storage.projects:
        raise HTTPException(status_code=404, detail="Project not found")
    
    export_id = str(uuid.uuid4())
    video_path = storage.projects[job_id]["video_path"]
    timeline = storage.timelines[job_id]
    
    storage.exports[export_id] = {
        "id": export_id,
        "project_id": job_id,
        "status": "rendering",
        "style": theme,
        "animation": animation,
        "progress": 0,
        "step": "Starting render...",
        "created_at": time.time()
    }
    storage.save()
    
    def do_render():
        try:
            exports_dir = STORAGE_DIR / "exports"
            exports_dir.mkdir(parents=True, exist_ok=True)
            
            ass_path = exports_dir / f"{export_id}_captions.ass"
            output_path = exports_dir / f"{export_id}_output.mp4"
            
            storage.exports[export_id]["step"] = "Generating subtitles..."
            storage.exports[export_id]["progress"] = 20
            storage.save()
            
            ass_renderer.generate_custom_ass(
                timeline["captions"],
                str(ass_path),
                style=theme
            )
            
            storage.exports[export_id]["step"] = "Rendering video..."
            storage.exports[export_id]["progress"] = 50
            storage.save()
            
            ass_renderer.export_video(video_path, str(ass_path), str(output_path))
            
            storage.exports[export_id]["status"] = "completed"
            storage.exports[export_id]["progress"] = 100
            storage.exports[export_id]["step"] = "Render complete!"
            storage.exports[export_id]["output_path"] = str(output_path)
            storage.save()
            
        except Exception as e:
            storage.exports[export_id]["status"] = "error"
            storage.exports[export_id]["step"] = f"Error: {str(e)}"
            storage.exports[export_id]["error"] = str(e)
            storage.save()
    
    background_tasks.add_task(do_render)
    
    return {
        "render_id": export_id,
        "status": "rendering",
        "message": "Rendering started"
    }


@app.get("/render/{render_id}")
async def get_render_status(render_id: str):
    if render_id not in storage.exports:
        raise HTTPException(status_code=404, detail="Render not found")
    return storage.exports[render_id]


@app.get("/download/{render_id}")
async def download_render(render_id: str):
    if render_id not in storage.exports:
        raise HTTPException(status_code=404, detail="Render not found")
    
    export = storage.exports[render_id]
    
    if export["status"] != "completed":
        raise HTTPException(status_code=400, detail="Render not ready")
    
    output_path = export.get("output_path", "")
    
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Output file not found")
    
    return FileResponse(output_path, media_type="video/mp4", filename=f"captioned_{render_id}.mp4")


@app.get("/export/project/{project_id}")
async def export_project_json(project_id: str):
    if project_id not in storage.timelines:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    timeline = storage.timelines[project_id]
    export_path = STORAGE_DIR / "exports" / f"{project_id}_project.json"
    export_path.parent.mkdir(exist_ok=True)
    
    project_data = {
        "version": "3.0.0",
        "exported_at": time.time(),
        "project_id": project_id,
        "timeline": timeline
    }
    
    with open(export_path, "w", encoding="utf-8") as f:
        json.dump(project_data, f, indent=2, ensure_ascii=False)
    
    return FileResponse(export_path, media_type="application/json", filename=f"{project_id}_project.json")


@app.get("/export/ass/{project_id}")
async def export_ass(project_id: str):
    if project_id not in storage.timelines:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    timeline = storage.timelines[project_id]
    ass_path = STORAGE_DIR / "exports" / f"{project_id}_captions.ass"
    ass_path.parent.mkdir(exist_ok=True)
    
    ass_renderer.generate_custom_ass(
        timeline["captions"],
        str(ass_path),
        style="default"
    )
    
    return FileResponse(ass_path, media_type="text/plain", filename=f"{project_id}_captions.ass")


@app.post("/export/video/{project_id}")
async def export_video(
    background_tasks: BackgroundTasks,
    project_id: str,
    style: str = Form("default")
):
    if project_id not in storage.timelines:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    if project_id not in storage.projects:
        raise HTTPException(status_code=404, detail="Project not found")
    
    export_id = str(uuid.uuid4())
    video_path = storage.projects[project_id]["video_path"]
    timeline = storage.timelines[project_id]
    
    storage.exports[export_id] = {
        "id": export_id,
        "project_id": project_id,
        "status": "rendering",
        "style": style,
        "created_at": time.time()
    }
    storage.save()
    
    def do_export():
        try:
            ass_path = STORAGE_DIR / "exports" / f"{export_id}_captions.ass"
            output_path = STORAGE_DIR / "exports" / f"{export_id}_output.mp4"
            
            ass_renderer.generate_custom_ass(
                timeline["captions"],
                str(ass_path),
                style=style
            )
            
            ass_renderer.export_video(video_path, str(ass_path), str(output_path))
            
            storage.exports[export_id]["status"] = "completed"
            storage.exports[export_id]["output_path"] = str(output_path)
            storage.save()
            
        except Exception as e:
            storage.exports[export_id]["status"] = "error"
            storage.exports[export_id]["error"] = str(e)
            storage.save()
    
    background_tasks.add_task(do_export)
    
    return {
        "export_id": export_id,
        "status": "rendering",
        "message": "Export started"
    }


@app.get("/export/status/{export_id}")
async def get_export_status(export_id: str):
    if export_id not in storage.exports:
        raise HTTPException(status_code=404, detail="Export not found")
    
    return storage.exports[export_id]


@app.get("/export/download/{export_id}")
async def download_export(export_id: str):
    if export_id not in storage.exports:
        raise HTTPException(status_code=404, detail="Export not found")
    
    export = storage.exports[export_id]
    
    if export["status"] != "completed":
        raise HTTPException(status_code=400, detail="Export not ready")
    
    output_path = export.get("output_path", "")
    
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Output file not found")
    
    return FileResponse(output_path, media_type="video/mp4", filename=f"captioned_{export_id}.mp4")


@app.get("/themes")
async def list_themes():
    return {
        "themes": [
            {"id": "default", "name": "Default", "description": "White text with shadow", "animation": "pop_in"},
            {"id": "bold", "name": "Bold", "description": "Bold white text", "animation": "pop_in"},
            {"id": "gold", "name": "Gold", "description": "Gold colored text", "animation": "fade_in"},
            {"id": "fire", "name": "Fire", "description": "Orange fire effect", "animation": "pop_in"}
        ]
    }


@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    if job_id in storage.projects:
        return storage.projects[job_id].copy()
    if job_id in storage.timelines:
        return storage.timelines[job_id].copy()
    if job_id in storage.exports:
        export = storage.exports[job_id].copy()
        if export["status"] == "completed":
            export["video_url"] = f"/download/{job_id}"
        return export
    raise HTTPException(status_code=404, detail="Job not found")


@app.get("/styles")
async def list_styles():
    return {
        "styles": [
            {"id": "default", "name": "Default", "description": "White text with shadow"},
            {"id": "bold", "name": "Bold", "description": "Bold white text"},
            {"id": "gold", "name": "Gold", "description": "Gold colored text"},
            {"id": "fire", "name": "Fire", "description": "Orange fire effect"}
        ],
        "animations": [
            {"id": "pop_in", "name": "Pop In"},
            {"id": "fade_in", "name": "Fade In"},
            {"id": "slide_up", "name": "Slide Up"},
            {"id": "typewriter", "name": "Typewriter"},
            {"id": "none", "name": "None"}
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
