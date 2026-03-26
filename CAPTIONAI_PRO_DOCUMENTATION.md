# CaptionAI Pro - Technical Documentation v3.0.0

## CORRECT PIPELINE

```
media → normalized audio → multilingual ASR → word timestamps → canonical transcript 
→ smart segmentation → English/Hinglish display tracks → timeline JSON 
→ live preview → ASS/FFmpeg render
```

**ONE SOURCE OF TRUTH:** Word-level timed transcript. Everything else is derived from it.

---

## WHAT WAS WRONG (v2.0)

| Problem | Fixed In v3.0 |
|---------|---------------|
| `language="hi"` hard lock | Auto-detect per segment |
| Urdu conversion path | Removed - Hindi only |
| Devanagari → ITRANS → Hinglish chain | Direct character mapping |
| Fixed 3-word grouping | Smart segmentation (pauses, speed, width) |
| Pillow/OpenCV renderer | FFmpeg + ASS subtitles |
| No preview system | Browser video + overlay |
| No timeline model | Editable caption objects |

---

## Pipeline Stages

### Stage 1: Media Normalization
- Extract audio from video with FFmpeg
- Convert to mono 16kHz WAV
- Keep original duration and timebase

### Stage 2: Speech Recognition (Multilingual ASR)
- Auto-detect language (NOT forced Hindi)
- Word-level timestamps
- Confidence scores
- Supports: English, Hindi, mixed

### Stage 3: Canonical Transcript
Single source of truth:
```json
{
  "words": [
    {"text":"hello","start":0.52,"end":0.83,"lang":"en"},
    {"text":"bhai","start":0.84,"end":1.10,"lang":"hi"}
  ]
}
```

### Stage 4: Smart Caption Segmentation
Split by:
- Pause gap (300ms+ natural boundaries)
- Reading speed (chars/second)
- Max line width (42 chars)
- Punctuation/clause boundaries

NOT by fixed word count.

### Stage 5: Language Transforms (Display Only)
Hinglish is DISPLAY TEXT, not translated language.

```
"मैं ठीक हूँ" → main theek hoon
"Call me tomorrow" → call me tomorrow
"मैं call करूँगा" → main call karunga
```

- Mixed-script awareness
- No Arabic → Devanagari → ITRANS chain
- No Urdu conversion path

### Stage 6: Timeline Model
Editable caption objects:
```json
{
  "id": "cap_12",
  "start": 3.20,
  "end": 4.85,
  "text": "bhai sun ek baat",
  "words": [...],
  "style": "default",
  "animation": "pop_in",
  "position": {"x": 0.5, "y": 0.82}
}
```

### Stage 7: Preview
Browser video player + overlay rendering:
- Play, pause, scrub
- Drag caption
- Edit text
- Change style/animation

### Stage 8: Export
All three formats:
- `project.json` - For editing
- `captions.ass` - Styled subtitles
- `output.mp4` - Final burned video

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Frontend)                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FASTAPI SERVER (v3.0)                      │
│                        Port: 8000                                │
└─────────────────────────────────────────────────────────────────┘
         │                  │                  │                  │
         ▼                  ▼                  ▼                  ▼
    ┌──────────┐      ┌────────────┐      ┌──────────┐      ┌──────────┐
    │ Upload   │      │ Timeline   │      │ Preview  │      │ Export   │
    │ Pipeline │      │ Edit       │      │ Browser  │      │ ASS/MP4  │
    └──────────┘      └────────────┘      └──────────┘      └──────────┘
```

---

## Core Modules

### transcription_engine.py
- Stage 1: Media normalization (FFmpeg audio extract)
- Stage 2: Multilingual ASR (WhisperX auto-detect)
- Stage 3: Build canonical transcript

### smart_segmentation.py
- Stage 4: Smart caption segmentation
- Factors: pause gap, reading speed, line width, punctuation
- No fixed word count

### display_processor.py
- Stage 5: Language transforms
- Mixed-script aware Hinglish conversion
- Direct character mapping (no multi-step chain)

### timeline_model.py
- Stage 6: Timeline model with editable captions
- TimelineEditor class for modifications
- Split, merge, reorder operations

### preview_renderer.py
- Stage 7: Browser preview generation
- HTML/CSS overlay rendering
- Real-time caption sync

### ass_renderer.py
- Stage 8: ASS subtitle export
- FFmpeg video rendering with burned subtitles

---

## API Endpoints

### Upload & Process
```
POST /upload
  → Start pipeline processing

GET /project/{project_id}
  → Get project status and timeline

GET /timeline/{project_id}
  → Get timeline JSON
```

### Edit Timeline
```
PUT /caption/{project_id}/{caption_id}
  → Update caption (text, timing, style, position)

DELETE /caption/{project_id}/{caption_id}
  → Delete caption

POST /caption/{project_id}/{caption_id}/split?split_at=2.5
  → Split caption at time

POST /caption/{project_id}/{caption_id}/merge-next
  → Merge with next caption
```

### Preview
```
GET /preview/{project_id}
  → Get preview JSON for frontend rendering

GET /preview-html/{project_id}
  → Get standalone HTML preview

GET /video/{project_id}
  → Stream video file
```

### Export
```
GET /export/project/{project_id}
  → Download project.json

GET /export/ass/{project_id}
  → Download captions.ass

POST /export/video/{project_id}
  → Start FFmpeg render

GET /export/status/{export_id}
  → Check render status

GET /export/download/{export_id}
  → Download rendered video
```

### Info
```
GET /health
  → Service health check

GET /styles
  → List available styles and animations
```

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| API Server | FastAPI | REST endpoints |
| ASR | WhisperX | Multilingual transcription |
| Audio | FFmpeg | Normalization |
| Subtitles | ASS format | Styled subtitles |
| Video | FFmpeg | Burn subtitles |
| Preview | HTML/JS | Browser rendering |

---

## Removed From v2.0

- ❌ `language="hi"` hard lock
- ❌ Urdu conversion path
- ❌ Devanagari → ITRANS → Hinglish chain
- ❌ Fixed 3-word caption grouping
- ❌ Pillow/OpenCV frame-by-frame rendering
- ❌ No preview system
- ❌ No editable timeline

---

## Getting Started

```bash
cd ai-server
pip install -r requirements.txt
python main.py
```

Upload a video:
```bash
curl -F "file=@video.mp4" http://localhost:8000/upload
```

Get timeline:
```bash
curl http://localhost:8000/timeline/{project_id}
```

Get preview HTML:
```bash
curl http://localhost:8000/preview-html/{project_id}
```

Export to video:
```bash
curl -X POST "http://localhost:8000/export/video/{project_id}?style=gold"
```

---

*Document Version: 3.0.0*  
*Last Updated: March 2026*