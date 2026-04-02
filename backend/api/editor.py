"""
Editor API Routes

Provides REST endpoints for timeline-based video editing.
"""

import os
import json
import uuid
import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Query, Response
from fastapi.responses import FileResponse, StreamingResponse
import aiosqlite
import io

from ..database import get_db, DB_PATH

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/editor", tags=["editor"])

# Base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, 'data', 'uploads')
PROJECTS_DIR = os.path.join(BASE_DIR, 'data', 'projects')
os.makedirs(PROJECTS_DIR, exist_ok=True)


# --- Helper Functions ---

def get_project_path(job_id: str) -> str:
    """Get path to project directory"""
    path = os.path.join(PROJECTS_DIR, job_id)
    os.makedirs(path, exist_ok=True)
    return path


def get_timeline_path(job_id: str) -> str:
    """Get path to timeline JSON file"""
    return os.path.join(get_project_path(job_id), 'timeline.json')


async def get_job_or_404(job_id: str, db: aiosqlite.Connection) -> dict:
    """Get job or raise 404"""
    cursor = await db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return dict(row)


async def get_source_video_path(job_id: str, db: aiosqlite.Connection) -> str:
    """Get source video path for a job"""
    job = await get_job_or_404(job_id, db)
    filename = job.get('filename', '')
    if not filename:
        raise HTTPException(status_code=404, detail="No video file associated with job")
    
    video_path = os.path.join(UPLOAD_DIR, f"{job_id}_{filename}")
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return video_path


def load_timeline(job_id: str) -> Optional[dict]:
    """Load timeline from file"""
    path = get_timeline_path(job_id)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


def save_timeline(job_id: str, timeline: dict) -> str:
    """Save timeline to file"""
    path = get_timeline_path(job_id)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(timeline, f, indent=2)
    return path


def create_default_timeline(video_info: dict, srt_content: str = None) -> dict:
    """Create a default timeline from video info and captions"""
    timeline = {
        "version": "1.0",
        "fps": video_info.get('fps', 30.0),
        "width": video_info.get('width', 1920),
        "height": video_info.get('height', 1080),
        "duration": video_info.get('duration', 0.0),
        "playhead": 0.0,
        "in_point": None,
        "out_point": None,
        "zoom": 1.0,
        "active_tool": "selection",
        "markers": [],
        "tracks": {
            "video": [
                {
                    "id": "V1",
                    "label": "Video 1",
                    "type": "video",
                    "visible": True,
                    "locked": False,
                    "clips": [
                        {
                            "id": "clip_v1_1",
                            "source": video_info.get('filename', 'video.mp4'),
                            "timeline_start": 0.0,
                            "source_in": 0.0,
                            "source_out": video_info.get('duration', 0.0),
                            "effects": []
                        }
                    ]
                }
            ],
            "audio": [
                {
                    "id": "A1",
                    "label": "Audio 1",
                    "type": "audio",
                    "visible": True,
                    "locked": False,
                    "muted": False,
                    "solo": False,
                    "audio_type": "stereo",
                    "clips": []
                }
            ],
            "subtitles": [
                {
                    "id": "S1",
                    "label": "Subtitles 1",
                    "type": "subtitle",
                    "visible": True,
                    "locked": False,
                    "clips": parse_srt_to_clips(srt_content) if srt_content else []
                }
            ]
        }
    }
    return timeline


def parse_srt_to_clips(srt_content: str) -> List[dict]:
    """Parse SRT content into subtitle clips"""
    clips = []
    if not srt_content:
        return clips
    
    blocks = srt_content.strip().split('\n\n')
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
        
        # Find timecode line
        time_line = None
        text_lines = []
        for line in lines:
            if '-->' in line:
                time_line = line
            elif time_line:  # Lines after timecode are text
                text_lines.append(line)
        
        if not time_line or not text_lines:
            continue
        
        # Parse timecodes
        start_str, end_str = time_line.split('-->')
        start = parse_timestamp(start_str.strip())
        end = parse_timestamp(end_str.strip())
        
        text = ' '.join(text_lines).strip()
        
        clips.append({
            "id": f"clip_s1_{len(clips) + 1}",
            "source": "generated",
            "timeline_start": start,
            "duration": end - start,
            "text": text,
            "style": {
                "font_family": "Inter",
                "font_size": 28,
                "color": "#ffffff",
                "background_color": "rgba(0,0,0,0.5)",
                "x": 50,
                "y": 85,
                "alignment": "center",
                "animation": "fade-in"
            }
        })
    
    return clips


def parse_timestamp(ts: str) -> float:
    """Parse SRT/VTT timestamp to seconds"""
    ts = ts.replace(',', '.')
    parts = ts.split(':')
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    return 0.0


# --- API Endpoints ---

@router.get("/projects")
async def list_projects(db: aiosqlite.Connection = Depends(get_db)):
    """List all projects with timeline data"""
    cursor = await db.execute(
        "SELECT id, filename, target_lang, status, created_at FROM jobs ORDER BY created_at DESC LIMIT 50"
    )
    rows = await cursor.fetchall()
    
    projects = []
    for row in rows:
        row_dict = dict(row)
        has_timeline = os.path.exists(get_timeline_path(row_dict['id']))
        projects.append({
            **row_dict,
            "has_timeline": has_timeline
        })
    
    return projects


@router.get("/projects/{job_id}")
async def get_project(job_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Get project details with timeline"""
    job = await get_job_or_404(job_id, db)
    
    timeline = load_timeline(job_id)
    
    return {
        "job": {
            "id": job['id'],
            "filename": job['filename'],
            "target_lang": job['target_lang'],
            "status": job['status'],
            "created_at": job['created_at']
        },
        "timeline": timeline
    }


@router.post("/projects/{job_id}/timeline")
async def create_project_timeline(job_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Initialize timeline for a job"""
    job = await get_job_or_404(job_id, db)
    
    # Check if timeline already exists
    existing = load_timeline(job_id)
    if existing:
        return {"message": "Timeline already exists", "timeline": existing}
    
    # Get video metadata
    video_meta = {}
    if job.get('video_meta_json'):
        try:
            video_meta = json.loads(job['video_meta_json'])
        except:
            pass
    
    video_meta['filename'] = job.get('filename', 'video.mp4')
    
    # Create default timeline
    timeline = create_default_timeline(video_meta, job.get('srt_content'))
    
    # Save timeline
    save_timeline(job_id, timeline)
    
    return {"message": "Timeline created", "timeline": timeline}


@router.get("/projects/{job_id}/timeline")
async def get_timeline(job_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Get timeline data"""
    await get_job_or_404(job_id, db)
    
    timeline = load_timeline(job_id)
    if not timeline:
        # Auto-create if doesn't exist
        job = await get_job_or_404(job_id, db)
        video_meta = {}
        if job.get('video_meta_json'):
            try:
                video_meta = json.loads(job['video_meta_json'])
            except:
                pass
        video_meta['filename'] = job.get('filename', 'video.mp4')
        timeline = create_default_timeline(video_meta, job.get('srt_content'))
        save_timeline(job_id, timeline)
    
    return timeline


@router.put("/projects/{job_id}/timeline")
async def update_timeline(job_id: str, timeline: dict, db: aiosqlite.Connection = Depends(get_db)):
    """Update timeline data"""
    await get_job_or_404(job_id, db)
    
    # Validate timeline structure
    if not isinstance(timeline, dict):
        raise HTTPException(status_code=400, detail="Invalid timeline format")
    
    # Save timeline
    save_timeline(job_id, timeline)
    
    # Also update job record
    await db.execute(
        "UPDATE jobs SET timeline_json = ? WHERE id = ?",
        (json.dumps(timeline), job_id)
    )
    await db.commit()
    
    return {"message": "Timeline saved", "timeline": timeline}


@router.get("/projects/{job_id}/preview")
async def get_preview_frame(
    job_id: str,
    time: float = Query(default=0.0, description="Time in seconds"),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Get preview frame at specific time"""
    await get_job_or_404(job_id, db)
    
    try:
        from ..editor.renderer import PreviewRenderer
        from ..editor.timeline import Timeline
        
        timeline_data = load_timeline(job_id)
        if not timeline_data:
            raise HTTPException(status_code=404, detail="No timeline found")
        
        # Create timeline from data
        timeline = Timeline.from_dict(timeline_data)
        
        # Get source directory
        source_dir = UPLOAD_DIR
        
        # Render frame
        renderer = PreviewRenderer()
        frame = renderer.render_frame(timeline, time, source_dir)
        
        if frame is None:
            raise HTTPException(status_code=404, detail="Could not render frame")
        
        # Convert to image
        from PIL import Image
        import io
        
        img = Image.fromarray(frame)
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=90)
        buffer.seek(0)
        
        return Response(content=buffer.getvalue(), media_type="image/jpeg")
        
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Preview engine not available: {e}")


@router.get("/projects/{job_id}/thumbnails")
async def get_thumbnails(
    job_id: str,
    count: int = Query(default=10, ge=1, le=50),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Get video thumbnails"""
    await get_job_or_404(job_id, db)
    
    try:
        from ..editor.engine import get_engine
        
        video_path = await get_source_video_path(job_id, db)
        engine = get_engine()
        
        thumbnails = engine.generate_thumbnails(video_path, count=count)
        
        # Return as JSON with base64 encoded images
        import base64
        return [
            {
                "time": t['time'],
                "image": base64.b64encode(t['image']).decode('utf-8')
            }
            for t in thumbnails
        ]
        
    except ImportError:
        raise HTTPException(status_code=500, detail="Video engine not available")


@router.post("/projects/{job_id}/render")
async def render_video(
    job_id: str,
    options: dict = None,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Start video render/export job"""
    await get_job_or_404(job_id, db)
    
    options = options or {}
    
    try:
        from ..editor.renderer import VideoExporter
        from ..editor.timeline import Timeline
        
        timeline_data = load_timeline(job_id)
        if not timeline_data:
            raise HTTPException(status_code=404, detail="No timeline found")
        
        timeline = Timeline.from_dict(timeline_data)
        
        exporter = VideoExporter(os.path.join(PROJECTS_DIR, job_id, 'exports'))
        
        output_name = f"{job_id}_exported.mp4"
        
        # Run export (this is synchronous - in production, use background task)
        output_path = exporter.export_video(
            timeline=timeline,
            source_dir=UPLOAD_DIR,
            output_name=output_name,
            include_subtitles=options.get('include_subtitles', True),
            start_time=options.get('start_time'),
            end_time=options.get('end_time'),
            quality=options.get('quality', 'high')
        )
        
        return {"message": "Export complete", "path": output_path}
        
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Export engine not available: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{job_id}/export/download")
async def download_export(job_id: str):
    """Download exported video"""
    export_path = os.path.join(PROJECTS_DIR, job_id, 'exports', f"{job_id}_exported.mp4")
    
    if not os.path.exists(export_path):
        raise HTTPException(status_code=404, detail="Export not found")
    
    return FileResponse(export_path, media_type="video/mp4", filename=f"exported_{job_id}.mp4")


@router.get("/projects/{job_id}/captions/{format}")
async def export_captions(
    job_id: str,
    format: str,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Export captions in SRT or VTT format"""
    if format not in ['srt', 'vtt']:
        raise HTTPException(status_code=400, detail="Format must be 'srt' or 'vtt'")
    
    await get_job_or_404(job_id, db)
    
    timeline_data = load_timeline(job_id)
    if not timeline_data:
        # Fallback to job's SRT content
        job = await get_job_or_404(job_id, db)
        if format == 'srt':
            return Response(
                content=job.get('srt_content', ''),
                media_type="text/plain",
                headers={"Content-Disposition": f"attachment; filename={job_id}.srt"}
            )
        else:
            return Response(
                content=job.get('vtt_content', ''),
                media_type="text/vtt",
                headers={"Content-Disposition": f"attachment; filename={job_id}.vtt"}
            )
    
    try:
        from ..editor.renderer import VideoExporter
        from ..editor.timeline import Timeline
        
        timeline = Timeline.from_dict(timeline_data)
        exporter = VideoExporter('')
        content = exporter.export_captions(timeline, format=format)
        
        media_type = "text/vtt" if format == "vtt" else "text/plain"
        
        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={job_id}.{format}"}
        )
        
    except ImportError:
        raise HTTPException(status_code=500, detail="Export engine not available")
