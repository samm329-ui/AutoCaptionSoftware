from pydantic import BaseModel
from typing import Optional

class JobResponse(BaseModel):
    id: str
    status: str
    progress: int
    filename: str
    target_lang: str

class JobDetailResponse(JobResponse):
    error: Optional[str] = None
    vtt_content: Optional[str] = None
    srt_content: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None
