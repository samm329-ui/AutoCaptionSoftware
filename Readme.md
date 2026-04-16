# FYAP Pro - Video Captioning & Editing System

## Project Overview

FYAP Pro is a comprehensive video editing and captioning system featuring:
- **AI-Powered Captioning**: 15-stage transcription pipeline with Whisper, LLM refinement, and dual scoring
- **Professional Video Editor**: Browser-based timeline editor with multi-track support, keyframes, and effects

## Project Structure

```
caption-tool-master/
├── backend/           # FastAPI server (REST API + WebSocket)
│   ├── api/           # API routes (jobs, health)
│   ├── main.py        # Entry point, CORS, static file serving
│   ├── database.py    # SQLite database
│   └── pipeline_runner.py  # Background job runner
├── caption_engine/    # AI transcription pipeline
│   ├── audio.py       # Audio extraction & chunking
│   ├── transcriber.py # Whisper transcription
│   ├── lang_detector.py    # Language detection
│   ├── llm_judge.py       # LLM refinement (Groq)
│   ├── dual_scorer.py     # Semantic + keyword scoring
│   ├── hallucination_guard.py  # Hallucination detection
│   ├── aligner.py     # Word-level timestamp alignment
│   └── renderer.py    # SRT/VTT generation
├── web_ui/            # React frontend (CDN-based, no build)
├── video-editor/      # Next.js Video Editor
│   └── src/
│       └── features/editor/  # Timeline, player, effects panels
└── data/             # Database, uploads, cache, logs

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                     │
│                  http://localhost:8000                      │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP / WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                      FastAPI Backend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ REST API     │  │ WebSocket    │  │ Static Files     │   │
│  │ /api/jobs/   │  │ Progress     │  │ /web_ui/*        │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘   │
│         │                 │                                 │
│   ┌──────▼─────────────────▼───────┐                        │
│   │     Pipeline Runner            │                        │
│   │     (Background Thread)        │                        │
│   └──────────────┬─────────────────┘                        │
│                 │ Async Updates                             │
│    ┌────────────▼──────────────────┐                        │
│    │     SQLite Database           │                        │
│    └───────────────────────────────┘                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   Caption Engine                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐   │
│  │ Audio   │→│ Chunk   │→│ Whisper │→│ Lang Detection  │   │
│  │ Extract │ │ & Overlap││ Transcribe│                 │   │
│  └─────────┘ └─────────┘ └─────────┘ └────────┬────────┘   │
│                                                │             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────▼─────────┐   │
│  │ SRT/VTT │←│ Word    │←│ Dual    │←│ LLM Refinement  │   │
│  │ Output  │ │ Align   │ │ Score   │ │ (Groq)         │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 15-Stage Pipeline

| Stage | Component | Purpose |
|-------|-----------|---------|
| 1 | Audio Quality Estimation | Measure SNR, speech rate for adaptive thresholds |
| 2 | Chunking | Split audio with overlap (strict/normal mode) |
| 3 | Transcription | Whisper ASR with retry logic |
| 4 | Language Detection | Detect Hindi/English/Hinglish per chunk |
| 5 | Filler Removal | Strip "um", "uh", "ah" etc. |
| 6 | LLM Refinement | Groq GPT contextual correction |
| 7 | Hallucination Guard | Word count diff + n-gram repeat check |
| 8 | Semantic Scoring | Sentence embeddings similarity |
| 9 | Keyword Scoring | Jaccard index for word retention |
| 10 | Chunk Merging | Order-safe parallel merge |
| 11 | Sentence Splitting | Split into natural sentences |
| 12 | Word Alignment | WhisperX forced alignment |
| 13 | Drift Clamping | Prevent timestamp drift |
| 14 | Alignment Validation | Verify alignment quality |
| 15 | Output Rendering | Generate SRT/VTT formats |

## Benefits

### High Accuracy
- **Dual Scoring**: Semantic similarity (60%) + keyword retention (40%)
- **Hallucination Guard**: Blocks Whisper hallucinations before they propagate
- **Adaptive Thresholds**: Adjusts confidence based on audio quality
- **Language-Specific Models**: English and Hindi alignment models

### Robust Error Handling
- **Retry Logic**: Transcription and alignment with exponential backoff
- **Fallback Strategy**: Falls back to raw transcript if refined version fails checks
- **Multi-Stage Validation**: Each stage validates before passing to next

### Production-Ready Features
- **Real-time Progress**: WebSocket updates during transcription
- **Background Processing**: Non-blocking job queue
- **Persistent Storage**: SQLite for job history
- **Export Options**: Raw captions or burned-in subtitles

### Easy Deployment
- **Single Command Start**: `python -m uvicorn backend.main:app --reload`
- **CDN-Based Frontend**: No build step required
- **Self-Contained**: All components in one repo

## Quick Start

1. Create `.env`:
   ```env
   GROQ_API_KEY=your_key_here
   FFMPEG_PATH=C:\path\to\ffmpeg.exe
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start server:
   ```bash
   python -m uvicorn backend.main:app --reload
   ```

4. Open: `http://localhost:8000`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs/` | Upload video, start captioning |
| GET | `/api/jobs/` | List recent jobs |
| GET | `/api/jobs/{id}` | Job details with captions |
| GET | `/api/jobs/{id}/video` | Stream original video |
| GET | `/api/jobs/{id}/export` | Download video with burned captions |
| WS | `/api/jobs/{id}/ws` | Real-time progress updates |

---

## Video Editor

Professional browser-based video editor with timeline, effects, and multi-track support.

### Features 

- **Timeline Editing**: Multi-track timeline with drag-and-drop
- **Keyframe Animation**: Linear, bezier, ease interpolation
- **Trim Tools**: Ripple, rolling, slip, slide, rate stretch
- **Magnetic Snapping**: Auto-snap to playhead, clips, markers
- **Undo/Redo**: Full history with 120 depth
- **Effect Controls Panel**: Premiere Pro-style property editor
- **Project Panel**: Media bin for assets
- **Timeline Markers**: Color-coded markers for navigation
- **Media Probing**: Auto-detect video/audio/image duration and dimensions
- **Engine-First Architecture**: State management with pure reducers and selectors

### Tech Stack

- Next.js 14
- React + TypeScript
- Tailwind CSS
- Remotion (video rendering)
- Zustand (legacy) / Custom Engine (current)
- @designcombo/timeline (canvas timeline)

### Engine-First Architecture

The video editor uses a custom engine-first architecture with pure reducers and selectors:

```
engine/
├── engine-core.ts    # Core state management with reducer
├── commands.ts      # Command builders
└── selectors.ts    # State selection functions
```

**Key Concepts**:
- **Track Groups**: 4 groups in order (subtitle → video → text → audio)
- **Pure Reducers**: All state changes via explicit commands
- **Group Selectors**: Filter tracks/clips by group
- **Lane Commands**: Insert track above/below, clone to new lane

### Timeline Constants

```typescript
const TIMELINE_GUTTER = 120;  // Left margin for track headers
const TRACK_HEIGHT = 60;     // Default track height
const RULER_HEIGHT = 30;    // Ruler height
```

### Getting Started

```bash
cd video-editor
pnpm install
pnpm dev
```

Open: `http://localhost:3000/edit`

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| Left Arrow | Previous Frame |
| Right Arrow | Next Frame |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Delete | Delete Selected |

### Engine Commands

```typescript
// Track commands
addTrack(track)
addClip(clip, trackId)
moveClip(clipId, newStart, newTrackId)

// Lane commands
INSERT_TRACK_ABOVE, INSERT_TRACK_BELOW, CLONE_CLIP_TO_NEW_LANE

// Selection
setSelection(clipIds[])
setPlayheadTime(timeMs)

// Zoom
setZoom(zoomLevel)
```

### API Configuration

All external API endpoints are centralized in `constants/api.ts`:

```typescript
const API_CONFIG = {
  RENDER: {
    BASE_URL: "https://api.designcombo.dev/v1",
    AUTH_PREFIX: "Bearer",
    ENV_KEY: process.env.COMBO_SK
  }
};

const API_ENDPOINTS = {
  RENDER: {
    CREATE_PROJECT: () => `${BASE_URL}/projects`,
    CREATE_EXPORT: (id) => `${BASE_URL}/projects/${id}/export`
  }
};
```
