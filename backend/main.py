import os
import sys
from dotenv import load_dotenv

# 1. Load context and Inject FFmpeg into PATH immediately
# This MUST happen before any AI pipeline modules are imported
load_dotenv()
ffmpeg_exe = os.getenv("FFMPEG_PATH")
if ffmpeg_exe and os.path.exists(ffmpeg_exe):
    ffmpeg_bin = os.path.dirname(ffmpeg_exe)
    if ffmpeg_bin not in os.environ["PATH"]:
        os.environ["PATH"] = ffmpeg_bin + os.pathsep + os.environ["PATH"]
        sys.stdout.write(f"INFO: Global FFmpeg injection successful: {ffmpeg_bin}\n")

# 2. Add project root to path so `caption_engine` can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

# These imports will trigger caption_engine logic
from .database import init_db
from .api import health, jobs

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database
    await init_db()
    
    # Check for crucial API Keys
    if not os.getenv("GROQ_API_KEY") or "your_groq_api_key" in os.getenv("GROQ_API_KEY"):
        print("WARNING: GROQ_API_KEY is not set or is still a placeholder. Transcription will fail.")
        
    yield
    
    # Shutdown
    print("Shutting down the backend...")


app = FastAPI(
    title="FYAP Pro Backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for Frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For Web UI flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add API routers
app.include_router(health.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")

# Serve the Web UI using StaticFiles
WEB_UI_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'web_ui')
os.makedirs(WEB_UI_DIR, exist_ok=True)
app.mount("/", StaticFiles(directory=WEB_UI_DIR, html=True), name="web_ui")
