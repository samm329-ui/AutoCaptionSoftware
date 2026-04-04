# Error Handled - Video Editor Bug Fixes & Solutions

## 1. NaN CSS Style Property Error
**Error**: `NaN is an invalid value for the left css style property` in `playhead.tsx`
**Location**: `src/features/editor/timeline/playhead.tsx:99`
**Cause**: When `fps`, `scale.zoom`, or `currentFrame` were undefined/null, the calculation `timeMsToUnits((currentFrame / fps) * 1000, scale.zoom)` produced NaN
**Fix**: Added safe fallback values:
```typescript
const safeFps = fps || 30;
const safeScaleZoom = scale?.zoom || (1 / 300);
const safeScrollLeft = scrollLeft || 0;
const currentFrame = useCurrentPlayerFrame(playerRef) || 0;
```
And added NaN guard in style: `left: timelineOffsetX + TIMELINE_OFFSET_CANVAS_LEFT + (isNaN(position) ? 0 : position)`

## 2. MediaSession PositionState Error
**Error**: `Failed to execute 'setPositionState' on 'MediaSession': Failed to read the 'position' property from 'MediaPositionState': The provided double value is non-finite`
**Cause**: Similar to above - undefined values causing non-finite numbers
**Fix**: Same safe fallback approach as #1

## 3. API Fetch Errors (Music, Voices, SFX)
**Error**: `Failed to fetch music: "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"`
**Location**: `src/features/editor/menu-item/audios.tsx:72`, `ai-voice.tsx:165`, `sfx.tsx:68`
**Cause**: API endpoints `/api/audio/music`, `/api/audio/sfx` didn't exist, returning HTML error pages instead of JSON
**Fix**: Created stub API routes:
- `src/app/api/audio/music/route.ts`
- `src/app/api/audio/sfx/route.ts`
- Updated `src/app/api/voices/route.ts` to return empty array on failure instead of 500 error

## 4. TypeScript Import Errors
**Error**: `Cannot find module '../utils/time'` and `Cannot find module '../store/use-store'`
**Location**: `src/features/editor/timeline-toolbar.tsx`
**Cause**: Incorrect relative import paths
**Fix**: Changed to `./utils/time` and `./store/use-store`

## 5. Timeline Canvas Width Calculation
**Error**: Timeline canvas not showing tracks properly, tools going off-screen
**Cause**: Canvas width calculation didn't account for new 64px timeline toolbar width
**Fix**: Updated `TIMELINE_TOOLBAR_WIDTH` to 64px in:
- `src/features/editor/hooks/use-timeline-offset.ts`
- `src/features/editor/timeline/timeline.tsx`
- `src/features/editor/editor.tsx`

## 6. Playhead Not Moving Without Tracks
**Error**: Playhead stuck when no tracks exist
**Cause**: `useCurrentPlayerFrame` returned undefined when no media loaded
**Fix**: Added `|| 0` fallback to currentFrame

## 7. Timeline Toolbar Overflow
**Error**: Side toolbar buttons getting cut off due to padding issues
**Cause**: Toolbar width too narrow (48px) for two columns of buttons
**Fix**: Increased to 64px, reduced padding from `py-1 gap-1` to `py-0.5 px-0.5 gap-0.5`

## 8. Media Toolbar Dropdown Issues
**Error**: Dropdown panels not closing, overlapping UI
**Cause**: Missing click-outside handler
**Fix**: Added `onClick` handler on parent container to close dropdowns

## 9. Zoom Level Limitation
**Error**: Maximum zoom index limited to 12, not enough for frame-level precision
**Cause**: Hardcoded limit in zoom handler
**Fix**: Increased to 20, added zoom levels 13-20 in `src/features/editor/constants/scale.ts`

## 10. Frame-by-Frame Navigation
**Error**: No way to navigate between frames precisely
**Fix**: Added frame navigation buttons (◀ ▶) in timeline header with keyboard shortcuts (Arrow Left/Right)

## 11. Media Probing Enhancement (from upgrade)
**Feature**: Added proper media file probing from upgrade package
**Location**: `src/features/editor/utils/media-probe.ts`
**What it does**: 
- `probeVideo(url)` - Extracts duration, width, height from video files
- `probeAudio(url)` - Extracts duration from audio files
- `probeImage(url)` - Extracts dimensions from image files
- `probeMediaFile(file)` - Unified probe for any uploaded file
- `makeColorAsset(name, color, duration)` - Creates synthetic color assets
**Fix**: Integrated into upload store - now files are properly probed before adding to timeline

## 12. Undo/Redo System (from upgrade)
**Feature**: Added undo/redo with structuredClone pattern
**Location**: `src/features/editor/store/use-store.ts`
**What it does**:
- `pushHistory()` - Saves state snapshot before changes (max 120 depth)
- `undo()` - Restores previous state
- `redo()` - Restores forward state
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z or Ctrl+Y (redo)
**Fix**: Integrated into main store with `cloneState()` fallback to JSON parse/stringify for non-cloneable data

## Known Issues (Not Yet Fixed)

1. **API endpoints for music/voices/sfx are stubs** - Need real API keys and endpoint URLs
2. **Media toolbar buttons (Transitions, Volume, Waveform)** - Reserved for future implementation
3. **Side toolbar tools (Slip, Pen, Rectangle, Hand)** - Tool selection works, canvas drag integration pending
4. **Ripple Edit, Track Select** - Tool selection works, actual behavior needs timeline canvas integration
5. **Trim tool drag handles on canvas** - requires hooking @designcombo/timeline drag events
6. **Snap visual indicator line** on canvas (the vertical orange line when snapping)
7. **Keyframe graph editor** (full curve editor like Premiere's Value/Velocity graph)
8. **Multi-camera editing** (create multicam sequence, live cut)
9. **Export to EDL/SRT** (timeline JSON → CMX 3600 format)
10. **Proxy workflow** (generate low-res proxies on ingest)
11. **VFR detection + auto-transcode** (FFmpeg.wasm in web worker)

## Upgrade Integration Notes

From the "upgrade video editor" package (FreeFlow Editor), these features were identified for integration:
- ✅ Media probing utilities (probeVideo, probeAudio, probeImage) - INTEGRATED
- ✅ Undo/redo with structuredClone pattern - INTEGRATED
- ✅ Magnetic snapping logic - Available in upgrade store.ts
- ✅ Color asset generation - Available in media-probe.ts
- ⏳ Source monitor concept - Pending
- ⏳ Clip transform properties (x, y, scale, rotation, opacity) - Partial (exists in current editor)
- ⏳ Timeline clip splitting with proper edge detection - Partial (exists via dispatch)
- ⏳ Demo project creation - Available in upgrade media.ts
