# Session Notes: Snap & Timeline Fixes

## Date: April 25, 2026

---

## Issues Fixed

### 1. Server Not Running
- Multiple node processes were running (PIDs 8940, 47916, 35124) on ports 3000, 3001, 3002
- Killed all processes and cleared .next cache to restart cleanly

### 2. Turbopack Error
- Fixed by running without turbopack initially
- Error was related to cache corruption

---

## Snap in Timeline Button

### Requirements
1. **Snap TO each other** - When dragging clip A near clip B, clip A should jump to align with clip B's edges
2. **More sensitive** - Increased threshold from 50ms to 100ms for better response
3. **No overlap** - Clips should snap to touch, not overlap
4. **Works on BOTH edges** - Left and right edges of clips

### Magnet Icon Rotation
- Original Magnet icon was tilted
- User wanted downward-looking magnet
- Process of finding right rotation:
  - Started with -90 degrees
  - Adjusted by 10 degrees incremental
  - Final: **-45 degrees** - PERFECT

**Rotation adjustments:**
- `-90` → `-60` → `-75` → `-70` → `-65` → `-75` → `-85` → `-65` → `-55` → `-52` → `-50` → `-48` → `-45`

### Snap Implementation
Current snap logic in `handleMouseMove`:

```javascript
if (snapEnabled) {
  const clipDuration = clip.display.to - clip.display.from;
  const myStart = newStart;
  const myEnd = newStart + clipDuration;
  
  let snapped = false;
  
  for (const otherId in state.clips) {
    const other = state.clips[otherId];
    if (!other) continue;
    if (other.id === dragClipId) continue;
    if (other.trackId !== clip.trackId) continue;
    
    const oStart = other.display.from;
    const oEnd = other.display.to;
    
    if (Math.abs(myStart - oStart) < 100) { newStart = oStart; snapped = true; }
    if (Math.abs(myStart - oEnd) < 100) { newStart = oEnd; snapped = true; }
    if (Math.abs(myEnd - oStart) < 100) { newStart = oStart - clipDuration; snapped = true; }
    if (Math.abs(myEnd - oEnd) < 100) { newStart = oEnd - clipDuration; snapped = true; }
  }
}
```

### Behavior Issues Reported
- "It's flowing inside" - overlapping not blocked
- "No resistance" - snaps too easily
- "Not accurate" - snaps early, not at exact edge
- "Escapable" - doesn't block properly

### Solutions Tried
1. Increased threshold from 50ms to 100ms
2. Changed to exact edge matching
3. Removed multiple checks, simplified logic
4. Made snap always run (removed button check temporarily)
5. Added console logs for debugging

---

## Track Detection System

### dragTrackFromMousePosition Fix
- Original code calculated position relative to wrong element
- Fixed to use inner container's position + scroll position for accurate track detection

### Features Added
- `hoveredTrackId` - Track currently being hovered
- `hoveredTrackGroup` - Group (video, audio, text)
- `isDragOverTimeline` - Is dragging over timeline
- `dropError` - Error message for invalid drops

### Track Type Validation
```javascript
const FILE_TYPE_TO_TRACK_GROUP: Record<string, string> = {
  video: "video",
  image: "video",
  audio: "audio",
  text: "text",
  caption: "subtitle",
  adjustment: "video",
  colormatte: "video",
};
```

---

## UI Changes

### Magnet Icon
- Changed from ArrowDown to Magnet (with rotation)
- Final rotation: `-45 degrees` - pointing downwards
- Looks professional

### Track Hover Highlight
- Removed ring/border from highlight (unprofessional look)
- Kept background color only
- Preserved track border separators (V1, V2, A1, A2, etc.)

---

## Files Modified
1. `video-editor/src/features/editor/timeline/timeline.tsx`
   - Track detection fix
   - Magnet icon rotation
   - Track hover state
   - Snap logic

2. `video-editor/src/store/upload-store.ts`
   - Added targetTrackId support in addFileToTimeline

3. `video-editor/next.config.ts`
   - Temporarily added turbopack: false (reverted)

---

## Commits Made
1. Add track hover detection and magnet snap for timeline clips
2. Add target track support in addFileToTimeline
3. Remove borders from track hover highlight (REVERTED)
4. Restore track borders but remove only hover ring border

---

## Cleanup
- Deleted `nul` file from root directory

---

## Outstanding Issues
- Snap still not working perfectly as expected
- User reports "not stopping" and "overlapping"
- Need more testing and tuning

---

## Next Steps
- Test snap functionality thoroughly
- Consider adding visual snap indicator line
- Improve snap resistance/strength
- Add push-through-to-override feature