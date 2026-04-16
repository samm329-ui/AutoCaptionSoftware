# FYAP Pro - AI-Powered Video Captioning & Editing System

## Project Vision & Goal

### The Beginning

This project started as **Auto Caption Software** - an AI-powered captioning tool designed to automatically generate subtitles from audio/video files using Whisper, LLM refinement, and dual scoring systems.

### The Problem

While the captioning system achieved 99% accuracy, there was always that remaining 1% of edge cases where captions needed manual correction:
- Misrecognized technical terms
- Background noise causing errors
- Multiple speakers confusion
- Accent variations

### The Solution - Video Editor

To handle that 1% manual corrections, I felt the need for an integrated video editor. Instead of just captioning, why not create a complete video editing solution that could:
- Fix caption errors manually
- Add graphics and overlays
- Combine multiple media

### The Ultimate Vision - Full Automation

But we didn't stop there. The real vision evolved into:

> **"What if we could give an audio file or script and let AI generate the entire video automatically - with captions, graphics, effects, and everything - without any manual editing?"**

This led to the current **Engine-First Architecture** for the video editor, designed to eventually integrate with AI/ML for fully automated video generation.

---

## Project Overview

**FYAP Pro** is a comprehensive video editing and captioning system featuring:

1. **AI-Powered Captioning**: 15-stage transcription pipeline with Whisper, LLM refinement, and dual scoring (99% accuracy)
2. **Professional Video Editor**: Browser-based timeline editor with multi-track support, keyframes, and effects
3. **Future: AI Video Generation**: Automated video creation from audio/script using machine learning

---

## Project Structure

```
caption-tool-master/
├── backend/                    # FastAPI server (REST API + WebSocket)
│   ├── api/                    # API routes (jobs, health)
│   ├── main.py                 # Entry point, CORS, static file serving
│   ├── database.py            # SQLite database
│   └── pipeline_runner.py     # Background job runner
│
├── caption_engine/            # AI transcription pipeline
│   ├── audio.py               # Audio extraction & chunking
│   ├── transcriber.py         # Whisper transcription
│   ├── lang_detector.py       # Language detection
│   ├── llm_judge.py           # LLM refinement (Groq)
│   ├── dual_scorer.py         # Semantic + keyword scoring
│   ├── hallucination_guard.py # Hallucination detection
│   ├── aligner.py             # Word-level timestamp alignment
│   └── renderer.py            # SRT/VTT generation
│
├── web_ui/                    # React frontend (CDN-based, no build)
│
├── video-editor/              # Next.js Video Editor
│   ├── package.json
│   ├── next.config.ts
│   └── src/
│       ├── app/               # Next.js app router
│       │   ├── api/           # API routes (render, transcribe)
│       │   ├── edit/          # Editor page
│       │   └── layout.tsx
│       │
│       ├── components/       # Shared React components
│       │   ├── shared/       # Drag data, uploads, etc.
│       │   └── ui/           # UI primitives (button, input)
│       │
│       ├── store/            # Local state management
│       │   ├── project-store.ts
│       │   └── upload-store.ts
│       │
│       ├── features/          # Feature modules
│       │   └���─ editor/       # Video editor features
│       │       ├── engine/   # ENGINE-FIRST ARCHITECTURE
│       │       │   ├── engine-core.ts     # Core reducer & state
│       │       │   ├── commands.ts       # Command builders
│       │       │   └── selectors.ts     # State selectors
│       │       │
│       │       ├── player/   # Video player
│       │       │   ├── player.tsx        # Remotion player
│       │       │   └── composition.tsx    # Video composition
│       │       │
│       │       ├── timeline/  # Timeline components
│       │       │   ├── timeline.tsx
│       │       │   ├── header.tsx
│       │       │   ├── ruler.tsx
│       │       │   └── track-headers.tsx
│       │       │
│       │       ├── panels/    # Editor panels
│       │       │   ├── project-panel.tsx
│       │       │   ├── effects-panel.tsx
│       │       │   └── timeline-markers.tsx
│       │       │
│       │       ├── menu-item/  # Menu items
│       │       │   ├── videos.tsx
│       │       │   ├── audios.tsx
│       │       │   ├── texts.tsx
│       │       │   └── captions.tsx
│       │       │
│       │       ├── control-item/ # Property panels
│       │       │   ├── clip-compat.ts
│       │       │   └── common/
│       │       │
│       │       ├── data/       # Effects & transitions
│       │       │   ├── video-effects.ts
│       │       │   └── video-transitions.ts
│       │       │
│       │       ├── hooks/    # Custom React hooks
│       │       │   └── use-player-engine-sync.ts
│       │       │
│       │       ├── store/    # Zustand store (legacy)
│       │       │   └── use-store.ts
│       │       │
│       │       ├── utils/   # Utilities
│       │       │   ├── media-probe.ts
│       │       │   └── captions.ts
│       │       │
│       │       └── constants/
│       │           └── scale.ts
│       │
│       └── constants/       # Global constants
│           └── api.ts       # API configuration
│
├── data/                     # Database, uploads, cache, logs
│
├── Readme.md                 # This file
│
└── requirements.txt          # Python dependencies
```

---

## System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                     │
│                  http://localhost:8000 / 3000                │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP / WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                      FastAPI Backend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ REST API     │  │ WebSocket    │  │ Static Files     │   │
│  │ /api/jobs/   │  │ Progress     │  │ /web_ui/*        │   │
│  └──────┬───────┘  └──────┬───────┘  ��──────────────────┘   │
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
│  │ Extract│ │ & Overlap│ │ Transcribe│                 │   │
│  └─────────┘ └─────────┘ └─────────┘ └────────┬────────┘   │
│                                                │             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────▼─────────┐   │
│  │ SRT/VTT │←│ Word    │←│ Dual    │←│ LLM Refinement  │   │
│  │ Output  │ │ Align   │ │ Score   │ │ (Groq)          │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Video Editor Architecture (Engine-First)

```
┌─────────────────────────────────────────────────────────────┐
│                     Video Editor (React + Next.js)           │
│              http://localhost:3000/edit                     │
└─────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │   Timeline  │   │   Player    │   │   Panels    │
    │  (Canvas)   │   │ (Remotion)  │   │  (UI)       │
    └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              ▼
              ┌────────────────────────────────┐
              │      ENGINE (engine-core.ts)   │
              │   ┌─────────────────────────┐ │
              │   │ Pure Reducer Function    │ │
              │   │ - tracks, clips        │ │
              │   │ - ui (playhead, zoom) │ │
              │   └─────────────────────────┘ │
              │   ┌─────────────────────────┐ │
              │   │ Commands (builders)     │ │
              │   │ - addTrack, addClip     │ │
              │   │ - moveClip, deleteClip │ │
              │   └─────────────────────────┘ │
              │   ┌─────────────────────────┐ │
              │   │ Selectors (queries)      │ │
              │   │ - selectTracksByGroup  │ │
              │   │ - selectTrackClips     │ │
              │   └─────────────────────────┘ │
              └────────────────────────────────┘
```

---

## 15-Stage Caption Pipeline

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

---

## Engine-First Architecture

### Core Concepts

The video editor uses a **custom engine-first architecture** with pure reducers and selectors:

```
engine/
├── engine-core.ts    # Core state management with reducer
├── commands.ts       # Command builders
└── selectors.ts     # State selection functions
```

**Key Principles**:
- **Pure Reducers**: All state changes via explicit commands (no scattered setState)
- **Track Groups**: 4 groups in order (subtitle → video → text → audio)
- **Group Selectors**: Filter tracks/clips by group, not type
- **Lane Commands**: Insert track above/below, clone to new lane

### Track Groups

```
┌──────────────────────────────────────────┐
│         Track Groups (Priority Order)      │
├──────────────────────────────────────────┤
│ 1. SUBTITLE (S1, S2...)  - Captions        │
│ 2. VIDEO   (V1, V2...)  - Video/Images    │
│ 3. TEXT    (T1, T2...)  - Text overlays   │
│ 4. AUDIO   (A1, A2...)  - Audio tracks    │
└──────────────────────────────────────────┘
```

### Timeline Constants

```typescript
const TIMELINE_GUTTER = 120;  // Left margin for track headers
const TRACK_HEIGHT = 60;      // Default track height
const RULER_HEIGHT = 30;    // Ruler height
```

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

---

## API Configuration

All external API endpoints are centralized in `constants/api.ts`:

```typescript
const API_CONFIG = {
  RENDER: {
    BASE_URL: "https://api.designcombo.dev/v1",
    AUTH_PREFIX: "Bearer",
    ENV_KEY: process.env.COMBO_SK
  },
  TRANSCRIBE: {
    BASE_URL: "...",
    // ...
  }
};

const API_ENDPOINTS = {
  RENDER: {
    CREATE_PROJECT: () => `${BASE_URL}/projects`,
    CREATE_EXPORT: (id) => `${BASE_URL}/projects/${id}/export`
  }
};
```

---

## Current Status

### What's Working

1. **Caption Engine**
   - ✅ 15-stage transcription pipeline
   - ✅ Whisper + LLM refinement
   - ✅ Dual scoring (semantic + keyword)
   - ✅ Hallucination guard
   - ✅ SRT/VTT output

2. **Video Editor**
   - ✅ Engine-first architecture with pure reducers
   - ✅ Track groups (subtitle, video, text, audio)
   - ✅ Timeline with playhead sync
   - ✅ Video player with Remotion
   - ✅ Clip append logic (sequential)
   - ✅ Track headers with labels (S/T/V/A)
   - ✅ Media upload and probing

### In Progress

1. **Timeline**
   - ⚙️ Clip drag and drop
   - ⚙️ Trim tools (ripple, rolling, slip)
   - ⚙️ Keyframe animation

2. **Export**
   - ⚙️ Render to video via DesignCombo API
   - ⚙️ Progress tracking

### Future Goals

1. **AI Video Generation**
   - 🔄 Automated video creation from audio/script
   - 🔄 Smart caption corrections
   - 🔄 AI-generated graphics
   - 🔄 Machine learning integration

2. **Enhanced Editor**
   - 🔄 More effects and transitions
   - 🔄 Template system
   - 🔄 Collaboration features

---

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

---

## Quick Start

### Backend (Caption Engine)

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

### Video Editor

```bash
cd video-editor
pnpm install
pnpm dev
```

Open: `http://localhost:3000/edit`

---

## API Endpoints

### Backend API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs/` | Upload video, start captioning |
| GET | `/api/jobs/` | List recent jobs |
| GET | `/api/jobs/{id}` | Job details with captions |
| GET | `/api/jobs/{id}/video` | Stream original video |
| GET | `/api/jobs/{id}/export` | Download video with burned captions |
| WS | `/api/jobs/{id}/ws` | Real-time progress updates |

### Video Editor API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/render` | Create and export video |
| POST | `/api/transcribe` | Transcribe audio file |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| Left Arrow | Previous Frame |
| Right Arrow | Next Frame |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Delete | Delete Selected |

---

## File Explanations

### Key Engine Files

| File | Purpose |
|------|---------|
| `engine-core.ts` | Redux-like reducer with all state logic |
| `commands.ts` | Command builder functions for all operations |
| `selectors.ts` | State query functions (get tracks, clips, etc.) |
| `player.tsx` | Remotion player wrapper with seek sync |
| `composition.tsx` | Video composition with clip filtering |
| `upload-store.ts` | File upload and clip append logic |

### Key UI Files

| File | Purpose |
|------|---------|
| `timeline.tsx` | Main timeline canvas |
| `header.tsx` | Timeline header with controls |
| `ruler.tsx` | Time ruler with click-to-seek |
| `track-headers.tsx` | Group-based track labels |
| `project-panel.tsx` | Media bin and file management |

---

*Document Generated: April 2026*
*Version: 1.0.0*
*Auto Caption Software - Evolved into FYAP Pro*