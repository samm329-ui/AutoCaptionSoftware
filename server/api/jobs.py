import os
import uuid
import logging
from threading import Thread
from typing import List

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, WebSocket, WebSocketDisconnect
import aiosqlite
import aiofiles

from ..database import get_db, DB_PATH
from ..models import JobResponse, JobDetailResponse
from ..pipeline_runner import run_pipeline_sync
from ..progress import manager

router = APIRouter(prefix="/jobs", tags=["jobs"])
logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'storage', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=JobResponse)
async def create_job(
    target_lang: str = Form('en'),
    file: UploadFile = File(...)
):
    """Uploads a video and starts a background captioning job."""
    job_id = str(uuid.uuid4())
    filename = file.filename
    
    # Save file to disk
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}_{filename}")
    try:
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # Insert initial job state
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO jobs (id, status, filename, target_lang) VALUES (?, ?, ?, ?)",
            (job_id, "processing", filename, target_lang)
        )
        await db.commit()

    # Start background thread for heavy processing
    t = Thread(target=run_pipeline_sync, args=(job_id, file_path, target_lang))
    t.daemon = True
    t.start()

    return JobResponse(
        id=job_id,
        status="processing",
        progress=0,
        filename=filename,
        target_lang=target_lang
    )

@router.get("/", response_model=List[JobDetailResponse])
async def list_jobs(db: aiosqlite.Connection = Depends(get_db)):
    """List all recent jobs."""
    cursor = await db.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50")
    rows = await cursor.fetchall()
    
    jobs = []
    for r in rows:
        jobs.append(JobDetailResponse(
            id=r['id'],
            status=r['status'],
            progress=r['progress'],
            filename=r['filename'],
            target_lang=r['target_lang'],
            error=r['error'],
            created_at=r['created_at'],
            completed_at=r['completed_at']
        ))
    return jobs

@router.get("/{job_id}", response_model=JobDetailResponse)
async def get_job(job_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Get detailed state of a specific job, including output blocks."""
    cursor = await db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
    r = await cursor.fetchone()
    
    if not r:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return JobDetailResponse(
        id=r['id'],
        status=r['status'],
        progress=r['progress'],
        filename=r['filename'],
        target_lang=r['target_lang'],
        error=r['error'],
        vtt_content=r['vtt_content'],
        srt_content=r['srt_content'],
        created_at=r['created_at'],
        completed_at=r['completed_at']
    )

@router.get("/{job_id}/video")
async def get_video(job_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Stream the uploaded video file for browser playback."""
    from fastapi.responses import FileResponse
    
    cursor = await db.execute("SELECT filename FROM jobs WHERE id = ?", (job_id,))
    r = await cursor.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Job not found")
    
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}_{r['filename']}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(file_path, media_type="video/mp4")

@router.get("/{job_id}/export")
async def export_video(job_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Burn subtitles into the video and stream the result as a download."""
    import subprocess
    from fastapi.responses import FileResponse
    
    cursor = await db.execute("SELECT filename, srt_content FROM jobs WHERE id = ?", (job_id,))
    r = await cursor.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if not r['srt_content']:
        raise HTTPException(status_code=400, detail="Captions not generated yet")
    
    original_video_name = f"{job_id}_{r['filename']}"
    original_video_path = os.path.join(UPLOAD_DIR, original_video_name)
    if not os.path.exists(original_video_path):
        raise HTTPException(status_code=404, detail="Original video file not found")
        
    # Write temp SRT file
    srt_filename = f"{job_id}_temp.srt"
    srt_filepath = os.path.join(UPLOAD_DIR, srt_filename)
    with open(srt_filepath, 'w', encoding='utf-8') as f:
        f.write(r['srt_content'])
        
    output_filename = f"{job_id}_exported.mp4"
    output_filepath = os.path.join(UPLOAD_DIR, output_filename)
    
    # Run ffmpeg to burn subtitles. We set cwd to UPLOAD_DIR to avoid Windows path escaping issues with -vf subtitles=...
    ffmpeg_cmd = [
        "ffmpeg", "-y", 
        "-i", original_video_name,
        "-vf", f"subtitles={srt_filename}:force_style='Fontsize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,MarginV=30'",
        "-c:v", "libx264", 
        "-preset", "ultrafast", 
        "-crf", "28",
        "-c:a", "copy", 
        output_filename
    ]
    
    try:
        subprocess.run(ffmpeg_cmd, cwd=UPLOAD_DIR, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg subtitle burn failed: {e.stderr.decode()}")
        raise HTTPException(status_code=500, detail="Failed to burn subtitles into video.")
    finally:
        # Cleanup temp srt
        if os.path.exists(srt_filepath):
            os.remove(srt_filepath)
            
    return FileResponse(
        output_filepath, 
        media_type="video/mp4",
        filename=f"captioned_{r['filename']}"
    )

@router.websocket("/{job_id}/ws")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint for real-time progress updates of a specific job.
    """
    await manager.connect(websocket, job_id)
    try:
        while True:
            # We expect the client to keep the connection alive but we don't 
            # expect it to send commands.
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket, job_id)
