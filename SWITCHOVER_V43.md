# FYAP Pro Setup

Use this bundle as a full replacement for the old pipeline.

## Why this version
- The old pipeline is rule-based Romanization + correction, which breaks Hindi and mixed-language videos.
- This version uses chunk-based ASR, LLM cleanup, alignment validation, and target-language routing.

## Replace
Delete or stop using:
- `ai-server/`
- old `text_normalizer.py`
- old `language_router.py`
- old `correction_engine.py`
- any old `/upload` or `/job` backend logic

## Keep from the new bundle
- `server/`
- `ai_pipeline/`
- `frontend/`
- `requirements.txt`

## Run
1. Unzip the bundle to a new project folder.
2. Create `.env`:
   ```env
   GROQ_API_KEY=your_key_here
   FFMPEG_PATH=C:\\path\\to\\ffmpeg.exe
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start backend:
   ```bash
   python -m server.main
-----
python -m uvicorn server.main:app --reload --host 0.0.0.0 --port 8000
-----
   ```
5. Open:
   `http://localhost:8000`

## Important
This backend is not compatible with the old `/upload` API. Use the bundled frontend with `/api/jobs`.
