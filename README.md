# CaptionAI Pro - AI-Powered Video Captioning

> Multilingual video captioning with WhisperX, smart segmentation, and FFmpeg ASS rendering.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
│                                                                              │
│  Upload Page ──▶ Themes Page ──▶ Processing Page ──▶ Result Page            │
│  (/)              (/themes/{id})  (/processing/{id})   (/result/{id})        │
│                                                                              │
│  Polls: GET /job/{id}  •  POST /render  •  GET /download/{id}               │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │ HTTP (localhost:8000)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (FastAPI + Python)                           │
│                                                                              │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐        │
│  │ Transcription    │   │  Display         │   │  ASS Renderer    │        │
│  │ Engine           │   │  Processor       │   │  (FFmpeg)        │        │
│  │ (WhisperX)       │   │  (Hinglish)      │   │                  │        │
│  └──────────────────┘   └──────────────────┘   └──────────────────┘        │
│                                                                              │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐        │
│  │ Smart            │   │  Timeline        │   │  Preview         │        │
│  │ Segmentation     │   │  Model           │   │  Renderer        │        │
│  │                  │   │  (Editable)      │   │  (HTML/JS)       │        │
│  └──────────────────┘   └──────────────────┘   └──────────────────┘        │
│                                                                              │
│  Storage: JSON DB + local filesystem (videos/audio/exports)                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pipeline

```
media → normalized audio → multilingual ASR → word timestamps → canonical transcript 
→ smart segmentation → English/Hinglish display tracks → timeline JSON 
→ live preview → ASS/FFmpeg render
```

**One source of truth:** Word-level timed transcript. Everything else is derived from it.

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| API Server | FastAPI + Uvicorn | REST endpoints, background tasks |
| ASR | WhisperX | Multilingual transcription with auto-detect |
| Alignment | Faster-Whisper | Word-level timestamps |
| Audio | FFmpeg | 16kHz mono WAV extraction |
| Subtitles | ASS format | Styled subtitle export |
| Video Render | FFmpeg | Burn subtitles into video |
| Language | Python 3.10+ | Backend runtime |
| Frontend | Next.js 14 | React SSR framework |
| Styling | Tailwind CSS | Utility-first CSS |

---

## Directory Structure

```
caption-tool-master/
├── README.md
├── frontend/                          # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Upload page
│   │   │   ├── themes/[jobId]/       # Theme selection
│   │   │   ├── processing/[jobId]/   # Render progress
│   │   │   └── result/[renderId]/    # Download page
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   └── DebugPanel.tsx
│   │   └── lib/
│   │       └── api.ts                # API client
│   └── package.json
│
└── ai-server/                         # Python Backend
    ├── main.py                        # FastAPI server (all endpoints)
    ├── transcription_engine.py        # Stage 1-3: Normalize + ASR + Transcript
    ├── smart_segmentation.py          # Stage 4: Pause/speed/width segmentation
    ├── display_processor.py           # Stage 5: Hinglish display text
    ├── timeline_model.py              # Stage 6: Editable caption objects
    ├── preview_renderer.py            # Stage 7: Browser preview JSON
    ├── ass_renderer.py                # Stage 8: FFmpeg ASS export
    ├── transcription_engine.py        # WhisperX integration
    ├── requirements.txt               # Python dependencies
    ├── .env.example                   # Environment template
    ├── themes/                        # Caption theme configs
    │   ├── viral_shorts.json
    │   ├── minimal_clean.json
    │   ├── dramatic.json
    │   └── ...
    ├── fonts/                         # Unicode fonts (Devanagari + Latin)
    ├── storage/
    │   ├── videos/                    # Uploaded videos
    │   ├── audio/                     # Extracted audio
    │   ├── exports/                   # Rendered output + ASS files
    │   └── database.json              # Persistent job/timeline storage
    └── upgrade/                       # Migration reference (not used)
```

---

## Backend Modules

### 1. `transcription_engine.py` - Stage 1-3

Media normalization and multilingual ASR.

**Key Features:**
- Auto-detect language per segment (no `language="hi"` hard lock)
- Word-level timestamps with forced alignment
- Confidence scores per word
- GPU memory cleanup

**Output:**
```json
{
  "words": [
    {"text":"hello","start":0.52,"end":0.83,"lang":"en"},
    {"text":"bhai","start":0.84,"end":1.10,"lang":"hi"}
  ],
  "language": "mixed",
  "duration": 31.72
}
```

### 2. `smart_segmentation.py` - Stage 4

Smart caption grouping based on multiple factors.

**Split By:**
- Pause gap (300ms+ natural boundaries)
- Reading speed (chars/second)
- Max line width (42 chars)
- Punctuation/clause boundaries

**NOT by fixed word count.**

### 3. `display_processor.py` - Stage 5

Hinglish is **display text**, not translated language.

**Rules:**
- `"मैं ठीक हूँ"` → `main theek hoon`
- `"Call me tomorrow"` → `call me tomorrow`
- `"मैं call करूँगा"` → `main call karunga`

**No multi-step transliteration chain** (no Arabic → Devanagari → ITRANS).

### 4. `timeline_model.py` - Stage 6

Editable caption objects with position and style.

```python
@dataclass
class Caption:
    id: str
    index: int
    start: float
    end: float
    text: str
    words: List[Dict]
    style: str = "default"
    animation: str = "pop_in"
    position: Dict = {"x": 0.5, "y": 0.82}
    editable: bool = True
    confidence: float = 1.0
    emphasis: List[Dict] = []
```

**Operations:** split, merge, delete, reorder, apply style to all.

### 5. `preview_renderer.py` - Stage 7

Generates browser-ready JSON for real-time caption preview.

**Styles:** default, bold, gold, fire  
**Animations:** pop_in, fade_in, slide_up, typewriter, none

### 6. `ass_renderer.py` - Stage 8

FFmpeg + ASS subtitles for final video export.

**Features:**
- Generates styled ASS subtitle files
- Escapes Windows paths (`D:` → `D\:`)
- Uses `subtitles` filter for robust path handling

---

## API Endpoints

### Upload & Process
| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /upload` | Upload video, start pipeline |
| `GET /project/{id}` | Get project status |
| `GET /timeline/{id}` | Get timeline JSON |

### Edit Timeline
| Endpoint | Method | Description |
|----------|--------|-------------|
| `PUT /caption/{project_id}/{caption_id}` | Update caption |
| `DELETE /caption/{project_id}/{caption_id}` | Delete caption |
| `POST /caption/{id}/{caption_id}/split` | Split at time |
| `POST /caption/{id}/{caption_id}/merge-next` | Merge with next |

### Preview
| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /preview/{id}` | Preview JSON for frontend |
| `GET /preview-html/{id}` | Standalone HTML preview |
| `GET /video/{id}` | Stream video file |

### Export
| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /render` | Start FFmpeg render |
| `GET /render/{id}` | Get render status |
| `GET /download/{id}` | Download rendered video |
| `GET /export/project/{id}` | Download project.json |
| `GET /export/ass/{id}` | Download captions.ass |

### Legacy (Frontend Compatible)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /job/{id}` | Job status (checks projects + timelines + exports) |
| `GET /themes` | List themes |
| `GET /health` | Health check |

---

## Setup

### Backend
```powershell
cd ai-server
pip install -r requirements.txt
python main.py
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

### Dependencies (Backend)
- `fastapi`, `uvicorn` - API server
- `whisperx` (git) - Multilingual ASR
- `torch` - GPU acceleration
- `opencv-python-headless` - Video processing (old renderer)
- `Pillow` - Image processing (old renderer)
- `indic-transliteration` - Devanagari transliteration

---

## What Was Fixed

| Issue | Fix |
|-------|-----|
| `language="hi"` hard lock | Auto-detect per segment |
| Urdu conversion path | Removed - Hindi only |
| Devanagari→ITRANS chain | Direct character mapping |
| Fixed 3-word grouping | Smart segmentation |
| Pillow/OpenCV renderer | FFmpeg + ASS subtitles |
| No preview | Browser HTML preview |
| No editable timeline | Caption objects with position/style |
| Windows path issues | Escape `D:` colon, use `subtitles` filter |

---

## Themes

| Theme | Animation | Description |
|-------|-----------|-------------|
| `viral_shorts` | karaoke | Gold highlights, dark bg |
| `minimal_clean` | fade | Clean, minimal |
| `dramatic` | pop | Bold, colorful |
| `fire` | pop | Orange fire effect |

---

## License

MIT License
