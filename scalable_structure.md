# Results Page: Full Editing Environment Specification

## Overview

The results page evolves from a static result viewer into a full-featured **interactive sequence editor** where users can:

- Preview video dynamically
- Inspect and modify generated captions
- Work on a proper timeline
- Control media playback frame-by-frame
- Add or remove tracks
- Change subtitle appearance
- Export final video or caption files

---

## Page Layout

```
┌───────────────────────────────────────────────┐
│  1) Dynamic Preview / Sequence Preview        │
├───────────────────────────────────────────────┤
│  2) Timeline / Track Editing Area             │
├───────────────────────────────────────────────┤
│  3) Tools / Controls / Track Operations       │
└───────────────────────────────────────────────┘
```

---

## 1. Dynamic Preview Section

### Purpose
Show current video frame, audio position, subtitle state, caption styling, and effect of edits in real time.

### Dynamic Behavior
When user changes something on the timeline, the preview updates immediately:
- Caption text changes
- Font changes
- Size changes
- Position changes
- Color changes
- Animation changes
- Clip timing changes

### Layout
- **Top zone**: Video playback with caption overlay
- **Bottom zone**: Timecode display and frame info

---

## 2. Timeline System

### Structure
- Time ruler with seconds, milliseconds, and frame numbers
- Playhead indicator synced with preview
- Tracks stacked vertically

### Track Categories
| Track Type | Prefix | Position |
|------------|--------|----------|
| Subtitle Tracks | S1, S2, S3... | Top |
| Video Tracks | V1, V2, V3... | Middle |
| Audio Tracks | A1, A2, A3... | Bottom |

### Requirements
- Frame-accurate timing (FPS-aware)
- Unlimited tracks (infinite/expandable)
- Vertical scrolling for many tracks
- Auto-create tracks when needed

---

## 3. Tools & Controls

### Playback Controls
| Control | Function |
|---------|----------|
| Play/Pause | Start/stop playback |
| Step Forward | Move +1 frame |
| Step Backward | Move -1 frame |
| Mark In | Set start of selection |
| Mark Out | Set end of selection |
| Go To In | Jump to in point |
| Go To Out | Jump to out point |

### Premiere Pro-Style Tools Palette
1. **Selection Tool** - Select and move clips
2. **Track Select Forward** - Select all clips forward from point
3. **Ripple Edit** - Trim and shift adjacent clips
4. **Razor** - Cut clip at playhead
5. **Slip** - Change content without moving clip
6. **Pen** - Draw keyframes
7. **Rectangle** - Draw shapes
8. **Hand** - Pan timeline
9. **Text** - Insert/edit text elements

### Export Features
- Export Video (burned captions)
- Export Frame (single frame capture)
- Export Captions (SRT, VTT formats)
- Export Selection Range (using Mark In/Out)

---

## 4. Right-Click Context Menu

### Trigger
Right-click on track area

### Actions
- **Add Track** → Opens "Add Tracks" modal
- **Delete Track** → Remove track with confirmation
- **Toggle Track Output** → Enable/disable visibility/audio

---

## 5. Add Tracks Modal

### Sections
1. **Video Tracks**: Count + placement position
2. **Audio Tracks**: Count + placement + type (standard/mono/5.1/adaptive)
3. **Audio Submix Tracks**: Count + placement + type

### Audio Types
- Standard
- Mono
- 5.1 Surround
- Adaptive

---

## 6. Caption Editing System

### Editable Properties
- Text content
- Start/end timing
- Font family
- Font size
- Color (full RGB color picker)
- Background color
- X/Y position (percentage)
- Animation presets
- Text alignment

### Animation Presets
- None
- Fade In
- Fade Out
- Slide Up
- Slide Down
- Slide Left
- Slide Right
- Pop
- Bounce

---

## 7. Frame Accuracy Requirements

- All edits on frame boundaries
- FPS-aware calculations
- No drift or misalignment
- Preview/timeline/playhead sync

---

## 8. Entry Flow

1. User uploads video
2. Speech-to-text generates captions
3. Captions time-aligned
4. Results page opens
5. User enters editing workspace

---

## 9. Product Identity

A caption-focused, multi-track, frame-accurate, non-destructive sequence editor with Premiere Pro-style interaction patterns.
