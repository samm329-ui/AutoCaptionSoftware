# CaptionAI - AI-Powered Video Captioning Tool

> Automatically generate and bake-in stunning captions for your videos using WhisperX and FFmpeg.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Directory Structure](#directory-structure)
4. [Frontend (Next.js)](#frontend-nextjs)
5. [Backend (Python/FastAPI)](#backend-pythonfastapi)
6. [Processing Pipeline](#processing-pipeline)
7. [API Endpoints](#api-endpoints)
8. [Themes System](#themes-system)
9. [Data Models](#data-models)
10. [Setup Instructions](#setup-instructions)
11. [Hardware Optimization](#hardware-optimization)
12. [Troubleshooting](#troubleshooting)

---

## Overview

CaptionAI is a full-stack web application that:

1. **Uploads** a video file
2. **Transcribes** speech to text with word-level timestamps using WhisperX
3. **Renders** stylized captions directly onto video frames
4. **Delivers** the final captioned video for download

**Supported Languages**: English, Hindi, Bengali (with automatic transliteration)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Upload  │───▶│  Themes  │───▶│Processing│───▶│  Result  │  │
│  │  Page    │    │  Page    │    │  Page    │    │  Page    │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTP (localhost:8000)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI + Python)                   │
│                                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ Transcriber │  │  Renderer   │  │LocalStorage │               │
│  │  (WhisperX) │  │  (OpenCV)   │  │  (JSON DB)  │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend UI** | Next.js 14 (App Router) | React framework with SSR |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS |
| **Animations** | Framer Motion 12 | Page transitions |
| **File Upload** | react-dropzone 15 | Drag & drop interface |
| **HTTP Client** | Axios + fetch | API communication |
| **Backend API** | FastAPI + Uvicorn | Python REST server |
| **Transcription** | WhisperX (OpenAI) | Speech-to-text AI |
| **Video Processing** | OpenCV | Frame-by-frame manipulation |
| **Image Processing** | Pillow | Text rendering with fonts |
| **Audio Extraction** | FFmpeg | Convert video to audio |
| **GPU Computing** | PyTorch | ML model inference |
| **Local Storage** | JSON files | Job/render tracking |

---

## Directory Structure

```
caption-tool-master/
│
├── README.md                      # This file
│
├── frontend/                      # Next.js Frontend Application
│   ├── package.json              # Dependencies
│   ├── .env.local                # Environment variables
│   ├── next.config.mjs           # Next.js configuration
│   ├── tailwind.config.ts        # Custom Tailwind theme
│   └── src/
│       ├── app/                  # Next.js App Router pages
│       │   ├── layout.tsx        # Root layout
│       │   ├── page.tsx         # Upload page (/)
│       │   ├── globals.css      # Design system styles
│       │   ├── processing/
│       │   │   └── [jobId]/page.tsx   # Processing progress
│       │   ├── themes/
│       │   │   └── [jobId]/page.tsx   # Theme selection
│       │   └── result/
│       │       └── [renderId]/page.tsx # Result & download
│       ├── components/
│       │   ├── Navbar.tsx        # Navigation header
│       │   └── DebugPanel.tsx   # Debug overlay
│       └── lib/
│           ├── api.ts           # API client functions
│           ├── supabase.ts      # Supabase client
│           └── types.ts         # TypeScript interfaces
│
└── ai-server/                    # Python Backend (AI Processing)
    ├── main.py                  # FastAPI server entry point
    ├── transcriber.py           # WhisperX transcription
    ├── renderer.py              # OpenCV caption rendering
    ├── audio.py                 # FFmpeg audio extraction
    ├── animator.py              # Caption animation math
    ├── requirements.txt         # Python dependencies
    ├── .env                     # Environment variables
    ├── themes/                  # Caption theme configs
    │   ├── kalakar_fire.json
    │   ├── minimal_clean.json
    │   ├── karaoke_neon.json
    │   └── cinematic_gold.json
    ├── storage/                 # Local file storage
    │   ├── database.json        # Job tracking (JSON DB)
    │   ├── videos/              # Uploaded video files
    │   ├── audio/               # Extracted audio files
    │   └── rendered/            # Final captioned videos
    ├── fonts/                   # Caption font files
    └── bin/                      # FFmpeg binaries (Windows)
        ├── ffmpeg.exe
        └── ffprobe.exe
```

---

## Frontend (Next.js)

### Pages

#### 1. Upload Page (`/`) - `src/app/page.tsx`

**Purpose**: Video upload interface

**Features**:
- Drag & drop video upload (react-dropzone)
- Supports: MP4, MOV, AVI, MKV, WEBM (max 500MB)
- Language selection: Auto Detect, Hindi, English, Bengali
- Upload progress indicator
- Error handling with retry

**Flow**:
1. User drops video file
2. User selects audio language
3. User clicks "Upload & Transcribe"
4. `uploadVideo()` sends file to backend
5. Redirects to `/themes/{jobId}` on success

---

#### 2. Theme Selection Page (`/themes/[jobId]`) - `src/app/themes/[jobId]/page.tsx`

**Purpose**: Choose caption visual style

**Features**:
- Polls job status every 2 seconds
- Shows transcription progress
- 4 theme cards with gradient previews
- "Try Another Theme" option

**Flow**:
1. Displays "Processing..." banner until transcription complete
2. Shows 4 theme cards
3. User clicks a theme
4. POST to `/render` with job_id and theme
5. Redirects to `/processing/{renderId}`

---

#### 3. Processing Page (`/processing/[jobId]`) - `src/app/processing/[jobId]/page.tsx`

**Purpose**: Real-time rendering progress

**Features**:
- Polls render status every 1.5 seconds
- 5-step pipeline visualization
- Animated progress bar with percentage
- Error display with retry button

**Pipeline Steps**:
1. ✅ Upload Complete
2. 🔄 Extracting Audio
3. 🔄 AI Transcription
4. 🔄 Rendering Captions
5. ⏳ Finalizing Video

**Flow**:
1. Polls GET `/render/{renderId}` 
2. Updates progress based on status
3. Auto-redirects to `/result/{renderId}` when complete

---

#### 4. Result Page (`/result/[renderId]`) - `src/app/result/[renderId]/page.tsx`

**Purpose**: Display and download final video

**Features**:
- HTML5 video player
- Download button (links to `/download/{renderId}`)
- Video metadata (resolution, FPS, format)
- Caption preview list with timestamps
- Quick share buttons
- "Try Another Theme" CTA

---

### Components

#### Navbar (`src/components/Navbar.tsx`)
- Fixed glass-morphism header
- Logo with gradient icon
- Navigation links
- AI server status indicator (pulsing green dot)

#### DebugPanel (`src/components/DebugPanel.tsx`)
- Fixed bottom-right floating panel
- Shows AI server health & latency
- Activity log with timestamps
- Color-coded entries (info, success, error)

---

### API Client (`src/lib/api.ts`)

```typescript
// Upload video and start transcription
uploadVideo(file: File, language: string): Promise<{ job_id: string }>

// Get transcription job status
getJobStatus(jobId: string): Promise<Job>

// Get render job status
getRenderStatus(renderId: string): Promise<RenderData>

// Start caption rendering with theme
renderVideo(jobId: string, theme: string): Promise<{ render_id: string }>

// Get download URL for rendered video
getDownloadUrl(renderId: string): string

// List available themes
getThemes(): Promise<Theme[]>

// Check AI server health
checkHealth(): Promise<HealthData | null>
```

---

## Backend (Python/FastAPI)

### Main Server (`main.py`)

**Entry Point**: `python main.py` (runs on `http://localhost:8000`)

**Key Features**:
- FastAPI with Uvicorn
- Local JSON-based storage (no external DB needed)
- Background task processing (non-blocking)
- CORS enabled for frontend
- Lifespan events for startup/shutdown

---

### API Endpoints

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/health` | GET | Health check | - | `{status, service, version, timestamp}` |
| `/upload` | POST | Upload video | `file` + `language` (multipart) | `{job_id, status}` |
| `/process` | POST | Download & process | `job_id`, `video_url`, `language` | `{job_id, status}` |
| `/job/{job_id}` | GET | Get job status | - | `Job` with transcript |
| `/render` | POST | Start rendering | `job_id`, `theme` | `{render_id, status}` |
| `/render/{render_id}` | GET | Get render status | - | `RenderData` |
| `/download/{render_id}` | GET | Download video | - | FileResponse (MP4) |
| `/themes` | GET | List themes | - | `{themes: [...]}` |

---

### Audio Extraction (`audio.py`)

**Purpose**: Convert video to 16kHz mono WAV for WhisperX

**Process**:
```python
ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ar 16000 -ac 1 output.wav
```

**FFmpeg Path Resolution** (in order):
1. Check `ai-server/bin/ffmpeg.exe`
2. Check WinGet Gyan FFmpeg installation
3. Fallback to system PATH

---

### Transcription (`transcriber.py`)

**Purpose**: Convert speech to text with word-level timestamps

**Technology**: WhisperX with forced alignment

**Configuration**:
```python
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"  # Auto-detect GPU
MODEL_SIZE = "base"  # Optimized for 8GB RAM
BATCH_SIZE = 16 if GPU else 4
```

**Process**:
1. Load WhisperX model
2. Transcribe audio with batching
3. Forced alignment for word-level timestamps
4. Urdu-to-Devanagari conversion (for Hindi)
5. Group words into display chunks (3 words each)

**Urdu-to-Devanagari Conversion**:
Dictionary-based transliteration for Hindi content:
- 'کیا' → 'क्या'
- 'آپ' → 'आप'

---

### Rendering (`renderer.py`)

**Purpose**: Burn captions into video frames

**Technology**: OpenCV + Pillow (frame-by-frame)

**Process**:
```
For each frame:
  1. Find active word_group based on timestamp
  2. Calculate animation state (opacity, scale, etc.)
  3. Render caption overlay using Pillow
  4. Composite with OpenCV
  5. Write to temp video
After all frames:
  6. Mux original audio back using FFmpeg
```

---

### Animation System (`animator.py`)

**Animation Types**:

| Type | Description |
|------|-------------|
| `pop_scale` | Scale 0.5→1.0 with bounce (Bengali style) |
| `fade` | Simple opacity fade in/out |
| `slide_up` | 20px vertical slide + fade (Cinematic) |
| `word_by_word` | Karaoke highlighting per word |

**Calculation**:
```python
calculate_animation_state(
    animation_type: str,
    current_time: float,
    group_start: float,
    group_end: float,
    words: list,
    animation_duration: float = 0.15
) -> {opacity, scale, y_offset, active_word_index}
```

---

## Processing Pipeline

### Complete Workflow

```
1. UPLOAD
   User drops video
         │
         ▼
   POST /upload (multipart/form-data)
         │
         ▼
   Save to storage/videos/{job_id}.mp4
   Create job in database.json
         │
         ▼
2. TRANSCRIPTION (Background Task)
         │
         ▼
   extract_audio() → 16kHz WAV
         │
         ▼
   transcribe_audio() → WhisperX → Raw segments
         │
         ▼
   align_words() → Word-level timestamps
         │
         ▼
   group_words() → 3-word groups
         │
         ▼
   Save to database.json (status: "transcribed")
         │
         ▼
3. THEME SELECTION
         │
         ▼
   User selects theme
         │
         ▼
   POST /render (job_id, theme)
         │
         ▼
4. RENDERING (Background Task)
         │
         ▼
   Load theme JSON
         │
         ▼
   render_video_with_captions()
   (OpenCV frame-by-frame)
         │
         ▼
   Mux audio back (FFmpeg)
         │
         ▼
   Save to storage/rendered/{render_id}_captioned.mp4
   Update database.json (status: "completed")
         │
         ▼
5. DOWNLOAD
         │
         ▼
   GET /download/{render_id} → Browser download
```

### Progress Mapping

| Status | Progress | Step |
|--------|----------|------|
| `processing` | 10% | Extracting audio |
| `processing` | 30% | Transcribing with WhisperX |
| `processing` | 70% | Grouping words |
| `transcribed` | 100% | Transcription complete |
| `rendering` | 10% | Loading theme |
| `rendering` | 20% | Rendering captions |
| `rendering` | 95% | Saving |
| `completed` | 100% | Rendering complete! |

---

## Themes System

### Available Themes

#### 1. Kalakar Fire 🔥
```json
{
  "style": {
    "font": "NotoSansBengali-Black.ttf",
    "font_size": 56,
    "position_y": 0.82,
    "text_color": [255, 255, 255],
    "stroke_color": [0, 0, 0],
    "stroke_width": 4,
    "highlight_color": [255, 100, 50]
  },
  "animation": {"type": "pop_scale", "duration": 0.12}
}
```

#### 2. Minimal Clean ✨
```json
{
  "style": {
    "font_size": 42,
    "text_color": [255, 255, 255],
    "background": true,
    "bg_color": [0, 0, 0, 140]
  },
  "animation": {"type": "fade", "duration": 0.1}
}
```

#### 3. Karaoke Neon 🎤
```json
{
  "style": {
    "font_size": 50,
    "text_color": [255, 255, 255],
    "highlight_color": [0, 227, 253],
    "shadow": true
  },
  "animation": {"type": "word_by_word", "duration": 0.05}
}
```

#### 4. Cinematic Gold 🎬
```json
{
  "style": {
    "font_size": 46,
    "text_color": [255, 215, 0],
    "highlight_color": [255, 240, 180]
  },
  "animation": {"type": "slide_up", "duration": 0.15}
}
```

---

## Data Models

### Job (TypeScript)
```typescript
interface Job {
  id: string;
  status: "queued" | "processing" | "transcribed" | "rendering" | "completed" | "error";
  progress: number;
  step: string;
  filename: string;
  language?: string;
  transcript?: Transcript;
  error?: string;
}
```

### Transcript
```typescript
interface Transcript {
  segments: Segment[];
  word_groups: WordGroup[];
  language: string;
}

interface Segment {
  start: number;    // Start time in seconds
  end: number;      // End time in seconds
  text: string;     // Text content
  words?: Word[];   // Optional word-level details
}

interface WordGroup {
  text: string;     // Grouped text (e.g., "Hello world")
  words: Word[];    // Individual words with timestamps
  start: number;    // Group start time
  end: number;      // Group end time
}
```

### Database Structure (`storage/database.json`)
```json
{
  "jobs": {
    "<uuid>": { id, status, progress, step, filename, language, error }
  },
  "transcripts": {
    "<uuid>": { job_id, segments, word_groups, language }
  },
  "renders": {
    "<uuid>": { id, job_id, theme, status, progress, video_url }
  }
}
```

---

## Setup Instructions

### 1. Environment Configuration

**Backend (`ai-server/.env`)**:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
```

**Frontend (`frontend/.env.local`)**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_AI_SERVER_URL=http://localhost:8000
```

### 2. Backend Installation

```powershell
cd ai-server
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 3. Frontend Installation

```powershell
cd frontend
npm install
npm run dev
```

### 4. FFmpeg Setup (Windows)

FFmpeg binaries should be in `ai-server/bin/`:
- `ffmpeg.exe`
- `ffprobe.exe`

If missing, download from: https://www.gyan.dev/ffmpeg/builds/

---

## Hardware Optimization

This project is optimized for **8GB RAM** systems:

| Setting | Value | Reason |
|---------|-------|--------|
| Whisper Model | `base` | ~140MB vs 3GB for `large` |
| Batch Size | 4 (CPU) / 16 (GPU) | Memory efficiency |
| Font Caching | Per-frame load | Lower memory footprint |

**Tips**:
- Plug in your laptop for maximum performance
- Close other applications during processing
- For <4GB RAM, use `tiny` model in `transcriber.py`

---

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `WinError 2` | FFmpeg not found | Ensure `bin/ffmpeg.exe` exists |
| `Out of Memory` | RAM too low | Change model to `tiny` in `transcriber.py` |
| `404 Job Not Found` | Mismatched Supabase projects | Use same project in frontend & backend |
| Slow transcription | Using CPU | Install CUDA-enabled PyTorch for GPU |
| Font not found | Missing font files | Add `.ttf` files to `fonts/` directory |

---

## File Responsibilities

| File | Responsibility |
|------|----------------|
| `main.py` | FastAPI server, routes, background tasks |
| `transcriber.py` | WhisperX AI transcription |
| `renderer.py` | OpenCV video caption rendering |
| `audio.py` | FFmpeg audio extraction |
| `animator.py` | Caption animation math |
| `page.tsx` (home) | Upload interface |
| `page.tsx` (themes) | Theme selection |
| `page.tsx` (processing) | Progress tracking |
| `page.tsx` (result) | Video preview/download |
| `api.ts` | Frontend API client |
| `tailwind.config.ts` | Design system (Neon Darkroom theme) |
| `globals.css` | Component styles & animations |

---

## License

MIT License. Created with ❤️ for AI Creators.
