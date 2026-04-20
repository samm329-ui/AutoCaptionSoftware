# Timeline & Toolbar Development - Complete Log

## Date: April 17, 2026

This document contains all the fixes and changes made to the video editor timeline and toolbar since morning.

---

## Summary of Work Done

### 1. Editing Toolbar (Vertical Toolbar)

**Created new toolbar with 8 editing tools:**
- Selection Tool (V)
- Track Select Forward Tool (A)
- Ripple Edit Tool (B)
- Razor Tool (C)
- Pen Tool (P)
- Rectangle Tool (R)
- Hand Tool (H)
- Text Tool (T)

**File:** `video-editor/src/features/editor/editing-toolbar.tsx`

**Issue Fixed:** Infinite loop error ("Maximum call stack size exceeded")
- Cause: `setTool` function was calling itself recursively
- Fix: Renamed import to `setToolCommand` to avoid conflict

```typescript
// Before
import { deleteClips, splitClip, setTool } from "./engine/commands";
engineDispatch(setTool(tool));

// After  
import { deleteClips, splitClip, setTool as setToolCommand } from "./engine/commands";
engineDispatch(setToolCommand(tool));
```

---

### 2. Engine - Clip Split Fix

**Issue:** When cutting/splitting a clip, a duplicate copy remained underneath

**File:** `video-editor/src/features/editor/engine/engine-core.ts`

**Fix:** Remove original clip when creating two new clips

```typescript
// Create a new clips object without the original clip
const { [clipId]: deleted, ...remainingClips } = state.clips;

return {
  ...state,
  clips: {
    ...remainingClips,  // Previously was ...state.clips which kept original
    [firstClip.id]: firstClip,
    [secondClip.id]: secondClip,
  },
  // ... rest of the code
};
```

---

### 3. Timeline - Vertical Scroll Sync

**Issue:** 
- Track names scrolled separately from media/clips in tracks
- Vertical scrollbar only moved track names, not the media in tracks
- Touchpad scrolling worked differently than scrollbar scrolling

**Solution Implemented:**
1. Added unique IDs to both track headers and timeline content
2. Both divs have their own vertical scrollbar (`overflow-y-auto`)
3. On scroll events, both sync with each other

**File:** `video-editor/src/features/editor/timeline/timeline.tsx`

**Code:**
```tsx
{/* Track headers with vertical scroll */}
<div 
  className="shrink-0 bg-sidebar border-r border-border overflow-y-auto"
  style={{ width: 120 }}
  id="track-headers"
  onScroll={(e) => {
    const scrollTop = e.currentTarget.scrollTop;
    const timelineContent = document.getElementById('timeline-content');
    if (timelineContent) {
      timelineContent.scrollTop = scrollTop;
    }
  }}
>
  <TrackHeaders tracks={tracks} />
</div>

{/* Timeline content with vertical scroll */}
<div 
  className="flex-1 overflow-auto relative bg-card"
  id="timeline-content"
  onScroll={(e) => {
    const scrollTop = e.currentTarget.scrollTop;
    const trackHeaders = document.getElementById('track-headers');
    if (trackHeaders) {
      trackHeaders.scrollTop = scrollTop;
    }
    if (onScroll) onScroll(e);
  }}
>
  {/* Clips and track lanes */}
</div>
```

**Additional Fix:** Added min-height based on track count for proper scrolling
```tsx
minHeight: `${Math.max(tracks.length * TRACK_HEIGHT, 300)}px`
```

---

### 4. Header - Timeline Controls Reorganization

**Changes:**
- Moved all timeline controls to left side
- Added zoom functions (handleZoomOut, handleZoomIn, handleZoomFit)
- Compact buttons and controls
- Removed duplicate vertical scrollbar from separate component

**File:** `video-editor/src/features/editor/timeline/header.tsx`

---

### 5. Timeline - Playhead Position Fix

**Issue:** Playhead position calculation needed scroll offset

**File:** `video-editor/src/features/editor/timeline/playhead.tsx`

**Changes temporarily made but reverted:**
- Original position calculation restored after issues

---

## Files Changed

| File | Changes |
|------|---------|
| `editing-toolbar.tsx` | Created toolbar, fixed infinite loop |
| `engine-core.ts` | Fixed clip split to remove original |
| `timeline.tsx` | Added vertical scroll sync |
| `header.tsx` | Reorganized controls, added zoom functions |
| `playhead.tsx` | Position calculation |

---

## Commits Pushed

1. **`f625873`** - editor: fix infinite loop in editing toolbar
2. **`1f17813`** - engine: fix clip split to remove original clip  
3. **`c0df6b5`** - timeline: add vertical scroll sync between track headers and content

---

## Current Status

### Working Features
- ✅ Vertical editing toolbar with 8 tools
- ✅ Tool selection via keyboard shortcuts (V, A, B, C, P, R, H, T)
- ✅ Clip selection and movement
- ✅ Ripple edit tool with trim handles
- ✅ Razor tool for splitting clips
- ✅ Text tool for adding text layers
- ✅ Hand tool for panning
- ✅ Vertical scroll sync between track headers and content
- ✅ Clip splitting removes original (no duplicates)
- ✅ Zoom controls in timeline header

### Known Issues (Some fixes attempted but reverted)
- Horizontal scroll - Still not fully working as expected
- Time scale alignment - Attempted fixes but reverted

---

## Tool Descriptions

### 1. Selection Tool (V)
Default tool for selecting and moving clips on timeline

### 2. Track Select Forward (A)
Selects all clips forward from clicked point on a track

### 3. Ripple Edit Tool (B)
Trims clip edges and automatically shifts following clips to close gaps

### 4. Razor Tool (C)
Splits clips at clicked position into two separate parts

### 5. Pen Tool (P)
For keyframes, automation curves, masks

### 6. Rectangle Tool (R)
Draws rectangular shape layers

### 7. Hand Tool (H)
Pans/navigates the viewport without editing

### 8. Text Tool (T)
Creates editable text layers on timeline

---

## Timeline Layout

```
┌─────────────────────────────────────────────────────┐
│ Header (Controls: Clear, Delete, Split, Play, Zoom) │
├─────────────┬───────────────────────────────────────┤
│ Track       │ Timeline Content                      │
│ Headers     │ (Clips, Playhead, Markers)            │
│ (V1, V2,    │                                       │
│  A1, A2,    │ - Vertical scroll synced              │
│  etc.)      │ - Horizontal scroll                  │
│             │                                       │
│ - Scroll    │ - Scroll                              │
│   synced    │   synced                              │
└─────────────┴───────────────────────────────────────┘
│ Audio Meter                                         │
└─────────────────────────────────────────────────────┘
```

---

*Generated: April 17, 2026*
*Video Editor Project - Caption Tool Master*