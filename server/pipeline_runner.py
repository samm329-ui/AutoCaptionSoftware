import os
import asyncio
import logging
from ai_pipeline.main import run_pipeline
from .database import DB_PATH
import aiosqlite
from .progress import manager

logger = logging.getLogger(__name__)

async def update_job_status(job_id: str, status: str, progress: int = None, 
                            error: str = None, srt: str = None, vtt: str = None):
    async with aiosqlite.connect(DB_PATH) as db:
        
        updates = []
        params = []
        
        updates.append("status = ?")
        params.append(status)
        
        if progress is not None:
            updates.append("progress = ?")
            params.append(progress)
            
        if error is not None:
            updates.append("error = ?")
            params.append(error)
            
        if srt is not None:
            updates.append("srt_content = ?")
            params.append(srt)
            
        if vtt is not None:
            updates.append("vtt_content = ?")
            params.append(vtt)
            
        if status in ['completed', 'failed']:
            updates.append("completed_at = CURRENT_TIMESTAMP")
            
        query = f"UPDATE jobs SET {', '.join(updates)} WHERE id = ?"
        params.append(job_id)
        
        await db.execute(query, tuple(params))
        await db.commit()

def run_pipeline_sync(job_id: str, video_path: str, target_lang: str):
    """
    Synchronous wrapper to run the pipeline.
    This runs in a separate thread but needs to send async websocket messages.
    """
    # Create an event loop for the async connection manager
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    def on_progress(status: str, percent: int, details: str = ""):
        # 1. Update DB synchronously (via a quick async call wrapped in the loop)
        loop.run_until_complete(update_job_status(job_id, status, percent))
        # 2. Broadcast WebSocket progress
        loop.run_until_complete(manager.broadcast_progress(job_id, status, percent, details))

    try:
        on_progress("Pipeline started", 1)
        
        # Run the heavy AI pipeline
        result = run_pipeline(
            video_path=video_path,
            user_target_lang=target_lang,
            progress_callback=on_progress
        )
        
        if result["status"] == "success":
            # Complete
            logger.info(f"Job {job_id} Completed successfully")
            loop.run_until_complete(
                update_job_status(
                    job_id, "completed", 100, 
                    srt=result.get("srt"), vtt=result.get("vtt")
                )
            )
            loop.run_until_complete(
                manager.broadcast_progress(job_id, "completed", 100, "Captioning finished successfully.")
            )
        else:
            # Error returned gracefully
            err_msg = result.get("message", "Unknown pipeline error")
            logger.error(f"Job {job_id} Failed gracefully: {err_msg}")
            loop.run_until_complete(update_job_status(job_id, "failed", error=err_msg))
            loop.run_until_complete(manager.broadcast_progress(job_id, "failed", 0, err_msg))

    except Exception as e:
        logger.exception(f"Job {job_id} Pipeline crashed.")
        loop.run_until_complete(update_job_status(job_id, "failed", error=str(e)))
        loop.run_until_complete(manager.broadcast_progress(job_id, "failed", 0, str(e)))
        
    finally:
        loop.close()
