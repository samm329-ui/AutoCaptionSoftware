# FYAP Pro - AI-Powered Video Captioning & Full Video Editing System

## The Complete Story

### How It All Started

This project began as **Auto Caption Software** - a simple tool to automatically generate subtitles from audio/video files. We needed captions for videos but the existing solutions weren't good enough. We wanted 100% accuracy.

After building a sophisticated 15-stage transcription pipeline using Whisper, LLM refinement, and dual scoring systems, we achieved **99% accuracy**. But that remaining 1% haunted us - those edge cases where Whisper misrecognized technical terms, background noise caused errors, multiple speakers confused the system, or accent variations threw everything off.

### The Problem That Created Everything

Because of that 1% edge case issue, we thought:

> "We need a video editor to fix these captions manually."

So we started building a browser-based video editor. But once you have an editor, why just fix captions? Why not add graphics, overlays, combine media, create complete videos?

### The Evolution

1. **Caption Engine (Stage 1)** - Auto caption software with 99% accuracy
   - Whisper transcription with retry logic
   - LLM refinement (Groq)
   - Dual scoring (semantic + keyword)
   - 15-stage pipeline

2. **Video Editor (Stage 2)** - Browser-based timeline editor
   - Engine-first architecture
   - Multi-track support (Video, Audio, Text, Subtitle)
   - Real-time preview with Remotion
   - Track type validation
   - Premiere Pro-style context menus

3. **Full Automation (Stage 3 - Future)** - One-click video creation
   - AI generates entire video from audio/script
   - Captions + graphics + effects + animations
   - No editor, no designer, no agency, no skills
   - Just upload and done

---

## The Ultimate Vision

> **"Create a video in 13 seconds"**

Then:

> **"Create a video in 30 seconds"**

Finally:

> **"One click. Upload audio. Done. All sound effects, animations, captions, graphics - everything automatic. No editor needed. No designer needed. No agency needed. No skills needed. Just one click."**

This is where we're heading. The video editor we're building today is the foundation for that future.

---

## Project Overview

**FYAP Pro** is a comprehensive system featuring:

1. **AI-Powered Captioning Engine** - 15-stage transcription pipeline with Whisper, LLM refinement, and dual scoring (99% accuracy)
2. **Professional Video Editor** - Browser-based timeline editor with multi-track support, keyframes, effects, and transitions
3. **Future: AI Video Generation** - Automated video creation from audio/script using machine learning

---

## Project Structure

```
caption-tool-master/
├── backend/                    # FastAPI backend server
│   ├── api/                    # API routes
│   │   ├── jobs.py            # Job management (upload, status, export)
│   │   └── health.py          # Health check endpoint
│   ├── main.py               # FastAPI app entry point
│   ├── database.py           # SQLite database operations
│   ├── models.py             # Pydantic request/response models
│   ├── pipeline_runner.py    # Background job runner (threaded)
│   └── progress.py          # WebSocket connection manager
│
├── caption_engine/            # AI Transcription Pipeline
│   ├── main.py              # 15-stage pipeline orchestrator
│   ├── audio.py             # Audio extraction & chunking
│   ├── quality_estimator.py  # Audio quality measurement
│   ├── transcriber.py       # Whisper transcription with retry
│   ├── lang_detector.py     # Language detection (en/hi/hinglish)
│   ├── preprocessor.py     # Filler word removal
│   ├── llm_judge.py       # LLM contextual refinement (Groq)
│   ├── lm_check.py        # Lightweight language model check
│   ├── dual_scorer.py     # Semantic + keyword scoring
│   ├── hallucination_guard.py  # Hallucination detection
│   ├── chunk_merger.py    # Order-safe parallel merge
│   ├── sentence_splitter.py  # Natural sentence splitting
│   ├── aligner.py         # Word-level timestamp alignment
│   ├── alignment_models.py  # WhisperX models config
│   ├── alignment_validator.py  # Alignment quality validation
│   ├── drift_clamp.py    # Timestamp drift prevention
│   ├── confidence.py     # Confidence threshold determination
│   ├── renderer.py       # SRT/VTT format generation
│   ├── config.py        # Configuration constants
│   ├── cache.py        # Caching utilities
│   ├── retry.py        # Retry logic with backoff
│   ├── logger.py       # Pipeline logging
│   └── normalizer.py  # Text normalization
│
├── web_ui/                    # React frontend (CDN-based, no build)
│   ├── app.jsx              # Main app component
│   ├── api.js              # API client
│   └── components/         # UI components
│       ├── Dashboard.jsx
│       ├── UploadCard.jsx
│       ├── ResultCard.jsx
│       ├── ProgressCard.jsx
│       ├── LoadingScreen.jsx
│       └── HistoryList.jsx
│
├── video-editor/              # Next.js Video Editor
│   ├── src/
│   │   ├── app/            # Next.js app router
│   │   │   ├── api/        # API routes
│   │   │   │   ├── render/     # Video rendering
│   │   │   │   ├── transcribe/  # Transcription
│   │   │   │   ├── uploads/    # File uploads
│   │   │   │   ├── pexels/     # Stock media
│   │   │   │   ├── audio/      # Music & SFX
│   │   │   │   └── voices/     # AI voices
│   │   │   └── edit/       # Editor page
│   │   │
│   │   ├── components/     # Shared React components
│   │   │   ├── ui/        # Radix UI primitives (40+ components)
│   │   │   ├── color-picker/  # Color picker with gradient support
│   │   │   ├── shared/    # Icons, logos, drag utilities
│   │   │   └── uploads/   # Upload component
│   │   │
│   │   ├── features/
│   │   │   └── editor/   # Video Editor Feature Module
│   │   │       ├── engine/    # Engine-first state management
│   │   │       │   ├── engine-core.ts     # Core reducer
│   │   │       │   ├── commands.ts       # Command builders
│   │   │       │   ├── selectors.ts      # State selectors
│   │   │       │   ├── keyframe-engine.ts # Keyframe logic
│   │   │       │   ├── trim-engine.ts    # Trim operations
│   │   │       │   ├── snap-engine.ts    # Snap-to-grid
│   │   │       │   ├── time-scale.ts     # Zoom/pan
│   │   │       │   └── subsystems/       # Sub-engines
│   │   │       │
│   │   │       ├── player/   # Video Player (Remotion)
│   │   │       │   ├── player.tsx        # Main player
│   │   │       │   ├── composition.tsx   # Video composition
│   │   │       │   ├── sequence-item.tsx  # Sequence rendering
│   │   │       │   ├── items/           # Media renderers
│   │   │       │   │   ├── video.tsx
│   │   │       │   │   ├── audio.tsx
│   │   │       │   │   ├── image.tsx
│   │   │       │   │   ├── text.tsx
│   │   │       │   │   ├── caption.tsx
│   │   │       │   │   ├── shape.tsx
│   │   │       │   │   └── audio-bars/   # Audio visualizations
│   │   │       │   ├── animated/        # Text animations
│   │   │       │   │   ├── presets.ts
│   │   │       │   │   └── text-animated-types/
│   │   │       │   │       ├── animations-in/    # 14 in animations
│   │   │       │   │       ├── animations-loop/   # 13 loop animations
│   │   │       │   │       └── animations-out/   # 11 out animations
│   │   │       │   └── transitions/      # Video transitions
│   │   │       │       ├── circle.tsx
│   │   │       │       ├── rectangle.tsx
│   │   │       │       ├── slide.tsx
│   │   │       │       ├── sliding-doors.tsx
│   │   │       │       └── star.tsx
│   │   │       │
│   │   │       ├── timeline/  # Timeline Components
│   │   │       │   ├── timeline.tsx     # Main timeline
│   │   │       │   ├── header.tsx        # Controls
│   │   │       │   ├── track-headers.tsx # Track labels
│   │   │       │   ├── playhead.tsx     # Playhead
│   │   │       │   ├── ruler.tsx        # Time ruler
│   │   │       │   ├── context-menu.tsx  # Track context menu
│   │   │       │   ├── add-tracks-modal.tsx
│   │   │       │   ├── delete-track-modal.tsx
│   │   │       │   ├── clip-context-menu.tsx # Premiere-style menu
│   │   │       │   ├── decibel-meter.tsx
│   │   │       │   ├── vertical-scrollbar.tsx
│   │   │       │   ├── items/          # Clip renderers
│   │   │       │   └── controls/       # Drawing controls
│   │   │       │
│   │   │       ├── control-item/  # Property Controls
│   │   │       │   ├── basic-video.tsx
│   │   │       │   ├── basic-audio.tsx
│   │   │       │   ├── basic-text.tsx
│   │   │       │   ├── basic-image.tsx
│   │   │       │   ├── basic-caption.tsx
│   │   │       │   ├── common/       # Shared controls
│   │   │       │   │   ├── opacity.tsx
│   │   │       │   │   ├── volume.tsx
│   │   │       │   │   ├── speed.tsx
│   │   │       │   │   ├── transform.tsx
│   │   │       │   │   ├── blur.tsx
│   │   │       │   │   ├── brightness.tsx
│   │   │       │   │   ├── shadow.tsx
│   │   │       │   │   ├── outline.tsx
│   │   │       │   │   ├── text.tsx
│   │   │       │   │   └── preset-picker.tsx
│   │   │       │   ├── floating-controls/
│   │   │       │   └── keyframes/
│   │   │       │
│   │   │       ├── menu-item/  # Media Menu Items
│   │   │       │   ├── videos.tsx
│   │   │       │   ├── images.tsx
│   │   │       │   ├── audios.tsx
│   │   │       │   ├── texts.tsx
│   │   │       │   ├── captions.tsx
│   │   │       │   ├── transitions.tsx
│   │   │       │   ├── elements.tsx    # Adjustment layer, Color matte
│   │   │       │   ├── sfx.tsx
│   │   │       │   ├── voice-over.tsx
│   │   │       │   └── ai-voice.tsx
│   │   │       │
│   │   │       ├── panels/   # Editor Panels
│   │   │       │   ├── project-panel.tsx
│   │   │       │   ├── source-control-panel.tsx
│   │   │       │   ├── effect-controls-panel.tsx
│   │   │       │   └── effects-tab.tsx
│   │   │       │
│   │   │       ├── hooks/   # Custom React Hooks (15+)
│   │   │       ├── store/   # Zustand Stores
│   │   │       ├── utils/   # Utilities (20+)
│   │   │       ├── interfaces/  # TypeScript interfaces
│   │   │       ├── types/      # Type definitions
│   │   │       ├── constants/ # Constants
│   │   │       ├── data/     # Mock data
│   │   │       └── crop-modal/
│   │   │
│   │   └── constants/      # Global constants
│   │
│   └── README.md          # Video Editor documentation
│
├── data/                     # Runtime data
│   ├── database.sqlite     # SQLite database
│   ├── uploads/            # Uploaded files
│   └── logs/              # Pipeline logs
│
├── Readme.md                # This file
├── SESSION_NOTES.md         # Development session notes
├── SESSION_SUMMARY.md      # Session summary
└── requirements.txt         # Python dependencies
```

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                     │
│         ┌─────────────────┐     ┌─────────────────┐        │
│         │  Web UI         │     │  Video Editor   │        │
│         │  (localhost:8000)│     │  (localhost:3000)│     │
│         └────────┬────────┘     └────────┬────────┘        │
└──────────────────┼──────────────────────┼──────────────────┘
                   │                    │
┌──────────────────▼────────────────────▼──────────────────┐
│                      FastAPI Backend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ REST API     │  │ WebSocket    │  │ Static Files    │ │
│  │ /api/jobs/  │  │ Progress    │  │ /web_ui/*      │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────────┘ │
│         │                 │                               │
│   ┌─────▼─────────────────▼─────┐                      │
│   │     Pipeline Runner         │                      │
│   │     (Background Thread)     │                      │
│   └──────────────┬──────────────┘                      │
│                  │                                     │
│   ┌──────────────▼──────────────┐                      │
│   │     Caption Engine         │                      │
│   │  15-Stage Pipeline      │                      │
│   └──────────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### Caption Engine Pipeline (15 Stages)

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

### Video Editor Architecture (Engine-First)

```
┌─────────────────────────────────────────────────────────────┐
│                     Video Editor (React + Next.js)           │
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

## Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs/` | Upload video, start captioning |
| GET | `/api/jobs/` | List recent jobs |
| GET | `/api/jobs/{id}` | Job details with captions |
| GET | `/api/jobs/{id}/video` | Stream original video |
| GET | `/api/jobs/{id}/export` | Download video with burned captions |
| WS | `/api/jobs/{id}/ws` | Real-time progress updates |
| GET | `/api/health/` | Health check |

---

## Video Editor Features

### Timeline
- Multi-track support (Video, Audio, Text, Subtitle)
- Drag-and-drop clip placement
- Snap-to-grid with visual feedback
- Track type validation
- Context menus (Track header, Clip)
- Playhead with seek functionality
- Zoom and pan controls

### Track Management
- Add/Delete tracks with smart naming
- Lock/Unlock tracks
- Mute/Unmute audio
- Show/Hide tracks
- Track type validation (video→video tracks, audio→audio tracks, etc.)

### Clip Operations
- Cut, Copy, Paste, Clear
- Ripple Delete
- Speed/Duration adjustment
- Scale to Frame / Fit to Frame
- Label colors (13 options)
- Enable/Disable clips

### Media Support
- Video: MP4, WebM, MOV
- Audio: MP3, WAV, AAC
- Images: PNG, JPG, WebP, GIF
- Adjustment Layer: Transparent overlays
- Color Matte: Solid color backgrounds
- Text overlays with animations
- Captions with word-level timing

### Text Animations
- **In**: 14 animation presets
- **Loop**: 13 animation presets
- **Out**: 11 animation presets

### Transitions
- Circle, Rectangle, Slide, Sliding Doors, Star

### Effects
- Opacity, Brightness, Blur
- Shadow, Outline
- Flip, Transform

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

## Future Roadmap

### Phase 1: Video Editor Completion
- [x] Track type validation
- [x] Track context menu
- [x] Add/Delete track modals
- [x] Clip context menu
- [x] Adjustment Layer & Color Matte
- [ ] Keyframe animation
- [ ] More transitions
- [ ] Export rendering

### Phase 2: AI Integration
- [ ] Auto-generate captions from audio
- [ ] AI-powered caption correction
- [ ] Smart clip suggestions
- [ ] Auto-layout generation

### Phase 3: One-Click Video Creation
- [ ] Upload audio/script
- [ ] AI generates entire video
- [ ] All effects, animations, captions automatic
- [ ] No manual editing needed

---

## License

Private - All rights reserved

---

*Document Generated: April 2026*
*Version: 1.0.0*
*Auto Caption Software → Video Editor → AI Video Generation*