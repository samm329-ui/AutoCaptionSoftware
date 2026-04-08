# Error Handling & Fixes Log

## 2026-04-07 — Effects, Transitions, Drag & Drop, Timeline Fixes

### 1. React Hooks Order Violation in EffectControlsPanel
**Error:** `React has detected a change in the order of Hooks called by EffectControlsPanel`
**Breaking:** Panel crashed entirely — no properties shown, no effects editable.
**Root Cause:** `useCallback` hooks were placed AFTER an early `return` when `!clip`. React requires all hooks to be called unconditionally before any conditional returns.
**Fix:** Moved all `useCallback` hooks (`getCurrentTimeMs`, `dispatchEdit`, `removeEffect`) BEFORE the early return. The `removeEffect` now reads from `useStore.getState()` instead of relying on the stale `clip` closure.
**File:** `video-editor/src/features/editor/panels/effect-controls-panel.tsx`

---

### 2. JSON.parse Crash on Drag — "text/plain" is not valid JSON
**Error:** `Unexpected token 'e', "text/plain" is not valid JSON` and `Unexpected token 'a', "applicatio"... is not valid JSON`
**Breaking:** Entire app crashed when dragging effects, transitions, or any media. Timeline became completely unusable.
**Root Cause:** **BUG IN @designcombo/timeline library.** In `node_modules/@designcombo/timeline/dist/index.es.js` line 10401, the `Gh` function (dragenter handler) does:
```js
const t = dataTransfer.types[0];  // "text/plain" (MIME type string)
const e = JSON.parse(t);           // CRASH: JSON.parse("text/plain")
```
It parses the MIME type STRING instead of the actual drag data. Should be `JSON.parse(dataTransfer.getData(t))`.
**Fix:** Patched `node_modules/@designcombo/timeline/dist/index.es.js` line 10401:
- Before: `const e = JSON.parse(t), s = e.type;`
- After: `const e = JSON.parse(i.e.dataTransfer.getData(t)), s = e.type;`
**Note:** This patch will be lost on `npm install`. A postinstall script or patch-package should be used for persistence.

---

### 3. Effects Not Applying (Replace Instead of Append)
**Error:** Effects silently replaced all existing effects instead of adding to them.
**Breaking:** Only one effect could ever exist on a clip. Adding a second effect wiped the first.
**Root Cause:** `handleApplyEffect` in `effects-tab.tsx` dispatched `{ appliedEffects: [{ kind, params }] }` — a single-item array that replaced the entire `appliedEffects` array.
**Fix:** Now reads existing effects from `useStore.getState().trackItemsMap[clipId].details.appliedEffects` and appends the new effect to the array before dispatching.
**File:** `video-editor/src/features/editor/panels/effects-tab.tsx`

---

### 4. Timeline Disappearing on Zoom/Scroll
**Error:** Timeline canvas went completely blank when zooming or scrolling.
**Breaking:** Timeline became invisible — no clips, no playhead, no tracks visible.
**Root Cause:** The auto-scroll `useEffect` had `[currentFrame]` as its only dependency, causing it to re-run on every frame change. Combined with `getBoundingClientRect()` returning `DOMRect` (never null), the check was useless and triggered re-render loops.
**Fix:** Added `lastScrollFrameRef` to prevent redundant scrolls. Added proper dependency array `[currentFrame, fps, scale.zoom, scrollLeft]`. Added `canvasRect.width === 0` check.
**File:** `video-editor/src/features/editor/timeline/timeline.tsx`

---

### 5. EDIT_OBJECT Handler Not Merging appliedEffects Properly
**Error:** When effects were applied via the panel, the timeline didn't reflect changes.
**Breaking:** State was out of sync between the effect controls panel and the timeline/preview.
**Root Cause:** The `removeEffect` in `effect-controls-panel.tsx` read from a stale `clip` closure, sending outdated `appliedEffects` arrays.
**Fix:** `removeEffect` now reads from `useStore.getState().trackItemsMap[clipId]` to get the current effects array before removing one.
**File:** `video-editor/src/features/editor/panels/effect-controls-panel.tsx`

---

### 6. Ghost Elements in Timeline/Source/Project on Fresh Load
**Error:** Video clip and 9 caption items appeared in timeline even on a fresh project.
**Breaking:** Every new project started with pre-loaded content that couldn't be removed.
**Root Cause:** `mock.ts` contained a full design with a video clip and 9 caption items. `editor.tsx` dispatched `DESIGN_LOAD` with this mock on every mount.
**Fix:** Cleared `mock.ts` to an empty design `{ tracks: [], trackItemIds: [], trackItemsMap: {} }`.
**File:** `video-editor/src/features/editor/mock.ts`

---

### 7. Design Load Double-Dispatch (React Strict Mode)
**Error:** Timeline state could be corrupted by `DESIGN_LOAD` being dispatched twice.
**Breaking:** Intermittent timeline corruption — duplicate items, missing clips.
**Root Cause:** React 18 Strict Mode runs `useEffect` twice in development. `DESIGN_LOAD` was dispatched on every effect run.
**Fix:** Added `useRef(false)` guard (`designLoaded`) to ensure `DESIGN_LOAD` only fires once.
**File:** `video-editor/src/features/editor/editor.tsx`

---

### 8. Drag Payload Missing Required Fields for Timeline
**Error:** Dragging assets from Project Panel to Timeline failed silently.
**Breaking:** No items could be added to timeline via drag-and-drop from project panel.
**Root Cause:** `buildDragPayload` set `type: "track-item"` but `@designcombo/timeline` expects `type` to be one of `["transition", "image", "video", "audio", "caption", "text"]`. Also missing `details` and `display` fields.
**Fix:** Changed `type` to the actual media type. Added `details` object with `src`, `width`, `height`. Added `display: { from: 0, to: duration }`.
**File:** `video-editor/src/features/editor/panels/project-panel.tsx`

---

### 9. TypeScript Type Errors in interactions.tsx
**Error:** 8 TypeScript errors — `HTMLElement | SVGElement` not assignable to `HTMLElement`.
**Breaking:** Build would fail in strict mode.
**Root Cause:** Extracted handler functions used destructured inline types that didn't match the Moveable library's event types.
**Fix:** Changed all handlers to accept `e: any` and cast `e.target as HTMLElement` internally.
**File:** `video-editor/src/features/editor/scene/interactions.tsx`

---

## Summary of Breaking Changes

| Issue | Severity | User Impact |
|-------|----------|-------------|
| @designcombo/timeline JSON.parse bug | Critical | App crash on ANY drag operation |
| Hooks order violation | Critical | Panel completely broken |
| Effects replace instead of append | High | Only 1 effect per clip |
| Timeline disappearing | Critical | Timeline invisible on zoom/scroll |
| Drag payload wrong type | High | Drag-to-timeline broken |
| Ghost elements on load | Medium | Confusing UX |
| Design double-dispatch | Medium | Intermittent corruption |

## Known Issues Not Yet Fixed

- **Adjustment layers**: Created as transparent PNG but may not render correctly in preview
- **Transition drag to timeline**: Requires two clips adjacent to each other; single-clip projects can't receive transitions
- **Effects preview in Remotion player**: CSS filters are applied to container div but may not render for all effect types (some require WebGL/canvas processing)

## Patch Warning

The fix for issue #2 patches `node_modules/@designcombo/timeline/dist/index.es.js`. This patch will be LOST on `npm install`. To persist:
1. Use `patch-package`: `npx patch-package @designcombo/timeline`
2. Or add a `postinstall` script that applies the patch
3. Or report the bug upstream to @designcombo/timeline
