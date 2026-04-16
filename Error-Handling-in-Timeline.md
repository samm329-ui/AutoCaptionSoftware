# Error Handling in Timeline - Technical Documentation

## Overview

This document describes all the fixes and improvements made to the video editor timeline system, including how it integrates with the engine architecture.

---

## 1. Timeline Engine Architecture

### 1.1 Core Components

The video editor uses an **engine-first architecture** with the following key components:

```
video-editor/src/features/editor/
├── engine/
│   ├── engine-core.ts      - Core state management and reducer
│   ├── commands.ts        - Command builders for all operations
│   └── selectors.ts      - State selection functions
├── timeline/
│   ├── timeline.tsx      - Main timeline component
│   ├── header.tsx         - Timeline header with controls
│   ├── ruler.tsx          - Time ruler
│   └── track-headers.tsx  - Track labels
├── player/
│   ├── player.tsx         - Video player wrapper
│   └── composition.tsx   - Remotion composition
└── store/
    └── use-store.ts       - Zustand store (legacy)
```

### 1.2 Track Groups

The engine uses **4 track groups** in a specific order:
1. **subtitle** (S1, S2...) - Captions/subtitles
2. **video** (V1, V2...) - Video and image tracks
3. **text** (T1, T2...) - Text overlays
4. **audio** (A1, A2...) - Audio tracks

---

## 2. Issues Fixed

### 2.1 Player-Timeline Sync Issue

**Problem**: When using arrow keys to move the playhead or clicking on the ruler, the video preview did not update.

**Root Cause**: The Remotion Player used its own internal frame tracking, not synced with the engine playhead.

**Solution**: 
1. Created a `seekPlayer` function registration in `commands.ts`
2. Updated `player.tsx` to register the function when player is ready
3. Modified `header.tsx` and `timeline.tsx` to call `seekPlayer` on arrow key presses and ruler clicks

**Files Changed**:
- `player/player.tsx` - Register seekPlayer function
- `timeline/header.tsx` - Call seekPlayer on arrow keys
- `timeline/timeline.tsx` - Call seekPlayer on ruler click
- `engine/commands.ts` - Add command type

### 2.2 Track Group Labels

**Problem**: Track headers showed wrong labels.

**Solution**: Updated `track-headers.tsx` to use group-based labeling (S/T/V/A prefixes).

**Files Changed**:
- `timeline/track-headers.tsx` - Group-based track labels

### 2.3 Clip Filtering in Composition

**Problem**: All clips rendered at once, not filtered by playhead position.

**Solution**: Updated `composition.tsx` to filter clips using `enginePlayheadMs`.

**Files Changed**:
- `player/composition.tsx` - Filter clips by time

### 2.4 Upload Clip Placement

**Problem**: When adding the same video twice, it created blank spaces or placed clips incorrectly.

**Root Causes**:
1. Using `upload.id` as clip ID caused duplicate clips to overwrite
2. Track selection didn't find the track with the furthest clip end
3. No logic to append after last clip in track

**Solution**:
1. Changed to use `nanoid()` for new clip IDs
2. Find track with maximum clip end time (not just first track)
3. Append new clip after last clip's end position

**Files Changed**:
- `store/upload-store.ts` - Fix clip append logic
- `timeline-toolbar.tsx` - Fix text clip placement
- `media-toolbar.tsx` - Fix text and caption clip placement

### 2.5 TypeError in Project Panel

**Problem**: `useUploadStore.getState is not a function` error.

**Solution**: Changed to use `useUploadStoreWithActions` hook.

**Files Changed**:
- `panels/project-panel.tsx` - Use correct hook

---

## 3. Key Code Patterns

### 3.1 Finding Track with Max Clip End

```typescript
// Find track with furthest clip end for appending
let bestTrack = existingTracks[0];
let maxEndMs = 0;

for (const t of existingTracks) {
  const trackClips = Object.values(state.clips).filter(
    c => c && c.trackId === t.id
  );
  if (trackClips.length > 0) {
    const lastEnd = Math.max(...trackClips.map(c => c.display.to));
    if (lastEnd > maxEndMs) {
      maxEndMs = lastEnd;
      bestTrack = t;
    }
  }
}
```

### 3.2 Track Group Selection

```typescript
import { selectTracksByGroup } from "./selectors";

const videoTracks = selectTracksByGroup("video")(state);
const audioTracks = selectTracksByGroup("audio")(state);
```

### 3.3 Engine Playhead Sync

```typescript
// In player.tsx - Register seek function
useEffect(() => {
  if (playerRef.current) {
    const { setCurrentFrame } = playerRef.current;
    engineStore.dispatch({
      type: "REGISTER_SEEK_PLAYER",
      payload: { seekFn: setCurrentFrame }
    });
  }
}, [playerRef.current]);
```

### 3.4 Clip Append Logic

```typescript
// When adding clip to timeline
const clip: Clip = {
  id: nanoid(), // Always generate new ID
  type: clipType,
  trackId: track.id,
  assetId: upload.id, // Reference to original media
  display: { from: startMs, to: startMs + durationMs },
  // ... other properties
};
```

---

## 4. Current Code Structure

### 4.1 Engine Core (engine-core.ts)

The engine state includes:
- `tracks`: Record<string, Track>
- `clips`: Record<string, Clip>
- `sequences`: Record<string, Sequence>
- `ui`: UI state (playheadTime, zoom, scroll, selection)
- `mediaAssets`: MediaAsset[]
- `uploads`: UploadedFile[]

### 4.2 Track Interface

```typescript
interface Track {
  id: string;
  type: "video" | "audio" | "text" | "caption" | "overlay";
  group: "video" | "audio" | "text" | "subtitle";
  name: string;
  order: number;
  clipIds: string[];
  locked: boolean;
  muted: boolean;
  hidden: boolean;
}
```

### 4.3 Clip Interface

```typescript
interface Clip {
  id: string;
  type: "video" | "audio" | "text" | "caption" | "image";
  trackId: string;
  assetId: string;
  name: string;
  display: { from: number; to: number };
  trim: { from: number; to: number };
  transform: Transform;
  details: ClipDetails;
  appliedEffects: AppliedEffect[];
  effectIds: string[];
  keyframeIds: string[];
  metadata?: ClipMetadata;
}
```

---

## 5. Commands and Selectors

### 5.1 Available Commands

```typescript
// Track commands
addTrack(track)
removeTrack(trackId)
moveClip(clipId, newStart, newTrackId)
addClip(clip, trackId)

// UI commands
setPlayheadTime(time)
setZoom(zoom)
setSelection(clipIds)
```

### 5.2 Available Selectors

```typescript
// Track selectors
selectOrderedTracks(state)
selectTracksByGroup(group)(state)
selectTrackMatrix(state)

// Clip selectors
selectAllClips(state)
selectActiveClip(state)
selectTrackClips(trackId)(state)

// Time selectors
selectDuration(state)
selectPlayheadTime(state)
selectZoom(state)
```

---

## 6. Timeline Constants

```typescript
const TIMELINE_GUTTER = 120;  // Left margin for track headers
const TRACK_HEIGHT = 60;     // Default track height
const RULER_HEIGHT = 30;    // Ruler height
```

---

## 7. Testing Checklist

When testing timeline functionality:

1. ✅ Upload video - should create V1 track at position 0
2. ✅ Upload same video again - should append after first clip
3. ✅ Upload different video - should append after last clip
4. ✅ Add text - should create T1 track and append after existing text
5. ✅ Add caption - should create S1 track and append after existing captions
6. ✅ Arrow keys - should move playhead and update preview
7. ✅ Click ruler - should seek to position and update preview
8. ✅ Track labels - should show S/T/V/A based on group

---

## 8. File Change Summary

| File | Changes |
|------|---------|
| `store/upload-store.ts` | Fixed clip append logic, use nanoid() |
| `timeline-toolbar.tsx` | Fixed text clip placement |
| `media-toolbar.tsx` | Fixed text/caption placement |
| `player/player.tsx` | Register seekPlayer function |
| `player/composition.tsx` | Filter clips by playhead |
| `timeline/header.tsx` | Call seekPlayer on arrow keys |
| `timeline/timeline.tsx` | Call seekPlayer on ruler click |
| `timeline/track-headers.tsx` | Group-based labels |
| `panels/project-panel.tsx` | Use correct hook |
| `engine/commands.ts` | Lane commands, seekPlayer |
| `engine/selectors.ts` | Group selectors |
| `engine/engine-core.ts` | Track interface with group |

---

## 9. Lessons Learned

1. **Always use unique IDs**: Never reuse upload.id as clip.id - use nanoid()

2. **Find track with max end time**: When appending, find the track with the furthest clip end, not just any track

3. **Separate player state from engine state**: The preview player and engine playhead are separate - need explicit sync

4. **Group-based track filtering**: Use group field for track filtering, not type

5. **Console logging for debugging**: Add detailed logs when tracking issues

---

*Document Generated: April 2026*
*Video Editor Version: Engine-First Architecture*