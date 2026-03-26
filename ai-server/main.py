"""
CaptionAI — Python AI Processing Server
FastAPI server for video transcription (WhisperX) and caption rendering (OpenCV + Pillow).
Uses local file storage (no Supabase required).
"""

import os
import time
import shutil
import json
import sys
import uuid
from pathlib import Path
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

BASE_DIR = Path(__file__).parent
BIN_DIR = str(BASE_DIR / "bin")
FFMPEG_BIN = r"C:\Users\jishu\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin"

os.environ["PATH"] = FFMPEG_BIN + os.pathsep + os.environ.get("PATH", "")
os.environ["FFMPEG_BINARY"] = os.path.join(FFMPEG_BIN, "ffmpeg.exe")
os.environ["FFPROBE_BINARY"] = os.path.join(FFMPEG_BIN, "ffprobe.exe")

from fastapi import FastAPI, BackgroundTasks, HTTPException, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, FileResponse
import httpx
from dotenv import load_dotenv

from audio import extract_audio
from transcriber import transcribe_audio, group_words
from renderer import render_video_with_captions

load_dotenv()

BASE_DIR = Path(__file__).parent
STORAGE_DIR = BASE_DIR / "storage"
VIDEOS_DIR = STORAGE_DIR / "videos"
RENDERED_DIR = STORAGE_DIR / "rendered"
TRANSCRIPTS_DIR = STORAGE_DIR / "transcripts"
THEMES_DIR = BASE_DIR / "themes"
FONTS_DIR = BASE_DIR / "fonts"

for d in [VIDEOS_DIR, RENDERED_DIR, TRANSCRIPTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

class LocalStorage:
    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.transcripts: Dict[str, Dict[str, Any]] = {}
        self.renders: Dict[str, Dict[str, Any]] = {}
    
    def save(self):
        data = {"jobs": self.jobs, "transcripts": self.transcripts, "renders": self.renders}
        with open(STORAGE_DIR / "database.json", "w") as f:
            json.dump(data, f)
    
    def load(self):
        db_path = STORAGE_DIR / "database.json"
        if db_path.exists():
            with open(db_path, "r") as f:
                data = json.load(f)
                self.jobs = data.get("jobs", {})
                self.transcripts = data.get("transcripts", {})
                self.renders = data.get("renders", {})

storage = LocalStorage()
storage.load()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("CaptionAI Server starting...")
    yield
    print("CaptionAI Server shutting down...")
    storage.save()

app = FastAPI(title="CaptionAI Processing Server", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "CaptionAI Processing Server", "version": "1.0.0", "storage": "local", "timestamp": time.time()}

def update_job_status(job_id: str, status: str, progress: int, step: str, error: Optional[str] = None):
    if job_id in storage.jobs:
        storage.jobs[job_id].update({"status": status, "progress": progress, "step": step, "error": error})
        storage.save()

def update_render_status(render_id: str, status: str, progress: int, step: str, video_url: Optional[str] = None, error: Optional[str] = None):
    if render_id in storage.renders:
        data = {"status": status, "progress": progress, "step": step, "error": error}
        if video_url is not None:
            data["video_url"] = video_url
        storage.renders[render_id].update(data)
        storage.save()

def _run_processing(job_id: str, video_path: str, language: str):
    try:
        print(f"[{job_id}] Starting processing...")
        update_job_status(job_id, "processing", 10, "Extracting audio...")
        audio_path = extract_audio(video_path)
        print(f"[{job_id}] Audio extracted: {audio_path}")
        update_job_status(job_id, "processing", 30, "Transcribing with WhisperX...")
        result = transcribe_audio(audio_path, language=language)
        print(f"[{job_id}] Transcription done, segments: {len(result.get('segments', []))}")
        update_job_status(job_id, "processing", 70, "Grouping words...")
        word_groups = group_words(result["segments"], words_per_group=3)
        final_lang = result.get("language", language)
        
        storage.transcripts[job_id] = {
            "job_id": job_id,
            "segments": result["segments"],
            "word_groups": word_groups,
            "language": final_lang
        }
        storage.save()
        
        print(f"[{job_id}] Transcription COMPLETE!")
        update_job_status(job_id, "transcribed", 100, "Transcription complete!")
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR in _run_processing: {error_details}")
        update_job_status(job_id, "error", 0, f"Error: {e}", error=str(e))

@app.post("/upload")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...), language: str = Form("auto")):
    job_id = str(uuid.uuid4())
    video_path = str(VIDEOS_DIR / f"{job_id}.mp4")
    
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    storage.jobs[job_id] = {"id": job_id, "status": "processing", "progress": 0, "step": "Initializing..."}
    storage.save()
    
    background_tasks.add_task(_run_processing, job_id, video_path, language)
    return {"job_id": job_id, "status": "processing"}

@app.post("/process")
async def process_video(background_tasks: BackgroundTasks, job_id: str = Form(...), video_url: str = Form(...), language: str = Form("auto")):
    video_path = str(VIDEOS_DIR / f"{job_id}.mp4")
    try:
        with httpx.stream("GET", video_url) as r:
            r.raise_for_status()
            with open(video_path, "wb") as f:
                for chunk in r.iter_bytes():
                    f.write(chunk)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download video: {e}")
    
    storage.jobs[job_id] = {"id": job_id, "status": "processing", "progress": 0, "step": "Initializing..."}
    storage.save()
    background_tasks.add_task(_run_processing, job_id, video_path, language)
    return {"job_id": job_id, "status": "processing"}

@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    if job_id in storage.jobs:
        job = storage.jobs[job_id].copy()
        if job.get("status") in ["transcribed", "rendering", "completed"]:
            if job_id in storage.transcripts:
                job["transcript"] = storage.transcripts[job_id]
        return job
    if job_id in storage.renders:
        r = storage.renders[job_id].copy()
        return {"id": r["id"], "status": r["status"], "progress": r["progress"], "step": r.get("step", "Rendering..."), "video_url": r.get("video_url"), "error": r.get("error")}
    raise HTTPException(status_code=404, detail="Job or Render not found")

def _run_rendering(render_id: str, job_id: str, theme_name: str, video_path: str, word_groups: list):
    try:
        print(f"[{render_id}] Starting rendering...")
        update_render_status(render_id, "rendering", 10, "Loading theme...")
        theme_path = THEMES_DIR / f"{theme_name}.json"
        if not theme_path.exists():
            raise FileNotFoundError(f"Theme '{theme_name}' not found")
        with open(theme_path, "r", encoding="utf-8") as f:
            theme_config = json.load(f)
        print(f"[{render_id}] Theme loaded, starting render...")
        update_render_status(render_id, "rendering", 20, "Rendering captions frame by frame...")
        output_filename = f"{render_id}_captioned.mp4"
        output_path = str(RENDERED_DIR / output_filename)
        render_video_with_captions(video_path=video_path, word_groups=word_groups, theme_config=theme_config, output_path=output_path, fonts_dir=str(FONTS_DIR), progress_callback=lambda p: update_render_status(render_id, "rendering", 20 + int(p * 0.7), "Rendering..."))
        print(f"[{render_id}] Render complete!")
        update_render_status(render_id, "rendering", 95, "Saving...")
        video_url = f"/download/{render_id}"
        update_render_status(render_id, "completed", 100, "Rendering complete!", video_url=video_url)
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR in _run_rendering: {error_details}")
        update_render_status(render_id, "error", 0, f"Error: {e}", error=str(e))

@app.post("/render")
async def render_video(background_tasks: BackgroundTasks, job_id: str = Form(...), theme: str = Form("kalakar_fire")):
    if job_id not in storage.jobs or storage.jobs[job_id].get("status") != "transcribed":
        raise HTTPException(status_code=400, detail="Job not ready for rendering")
    if job_id not in storage.transcripts:
        raise HTTPException(status_code=400, detail="Transcript data missing")
    word_groups = storage.transcripts[job_id]["word_groups"]
    video_path = str(VIDEOS_DIR / f"{job_id}.mp4")
    if not os.path.exists(video_path):
        raise HTTPException(status_code=400, detail="Original video not found")
    render_id = str(uuid.uuid4())
    storage.renders[render_id] = {"id": render_id, "job_id": job_id, "theme": theme, "status": "rendering", "progress": 0, "step": "Queued for rendering..."}
    storage.save()
    background_tasks.add_task(_run_rendering, render_id, job_id, theme, video_path, word_groups)
    return {"render_id": render_id, "status": "rendering"}

@app.get("/render/{render_id}")
async def get_render_status(render_id: str):
    if render_id not in storage.renders:
        raise HTTPException(status_code=404, detail="Render not found")
    render_data = storage.renders[render_id].copy()
    job_id = render_data.get("job_id")
    if job_id and job_id in storage.transcripts:
        render_data["transcript"] = storage.transcripts[job_id]
    return render_data

@app.get("/download/{render_id}")
async def download_rendered_video(render_id: str):
    if render_id not in storage.renders:
        raise HTTPException(status_code=404, detail="Render not found")
    output_filename = f"{render_id}_captioned.mp4"
    output_path = RENDERED_DIR / output_filename
    if not output_path.exists():
        raise HTTPException(status_code=400, detail="Video not available yet")
    return FileResponse(output_path, media_type="video/mp4", filename=output_filename)

@app.get("/themes")
async def list_themes():
    themes = []
    for f in THEMES_DIR.glob("*.json"):
        with open(f, "r", encoding="utf-8") as fp:
            config = json.load(fp)
            themes.append({"id": f.stem, "name": config.get("name", f.stem), "description": config.get("description", ""), "preview_image": config.get("preview_image", None)})
    return {"themes": themes}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)