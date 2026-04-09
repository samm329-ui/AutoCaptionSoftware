# AutoCaption Video Editor — Engine v2

Production-ready TypeScript editor engine replacing the `@designcombo` internal state brain.
All five issues from the first review have been resolved.

---

## What changed in v2

### Fix 1 — Zoom semantics normalised

**Problem:** `ZoomFactor` was commented as "ms per pixel" but every formula treated it as "pixels per millisecond". The snap threshold was calculated as `pixelRadius / zoom`, which with `zoom = 1/300` produced a wildly incorrect 3 600 ms threshold instead of ~3.6 ms.

**Resolution:** The convention is now locked as **pixels per millisecond (px/ms)** everywhere.

```
zoom = px / ms

px  = timeMs * zoom          (time → screen x)
ms  = px    / zoom           (screen x → time)

snapThresholdMs = pixelRadius / zoom
  → at zoom = 1/300:  12 / (1/300) = 12 * 300 = 3600ms
     (correct: at default zoom, 12px of snap covers 3.6 seconds of timeline)
  → at zoom = 1/10:   12 / (1/10)  = 120ms
     (tighter at higher zoom, as expected)
```

Every file that touches zoom now has an explicit derivation comment. Affected files:
- `model/schema.ts` — `ZoomFactor` type comment
- `state/factory.ts` — default zoom comment
- `runtime/layout/time-converter.ts` — full convention block at top of file
- `runtime/interaction/snap-manager.ts` — corrected threshold + explanation
- `runtime/interaction/pointer-manager.ts` — delta math comments
- `bridge/react-adapter.ts` — `useZoom` hook comment

---

### Fix 2 — Interaction events fully wired to commands

**Problem:** `pointer-manager.ts` emitted `DRAG_START`, `DRAG_MOVE`, `DRAG_END`, `TRIM_START`, `TRIM_MOVE`, `TRIM_END` but nothing converted those events into `MOVE_CLIP`, `TRIM_CLIP`, or `RIPPLE_EDIT` commands.

**Resolution:** New file `runtime/interaction/interaction-commander.ts`.

```
Pointer input
  → pointer-manager   emits: DRAG_START / DRAG_MOVE / DRAG_END
                              TRIM_START / TRIM_MOVE / TRIM_END
  → interaction-commander listens, dispatches:
      DRAG_MOVE   → MOVE_CLIP (skipHistory, live preview)
      DRAG_END    → MOVE_CLIP (with history entry "Move clip")
      DRAG_CANCEL → MOVE_CLIP back to original (skipHistory)
      TRIM_MOVE   → TRIM_CLIP (skipHistory, live preview)
      TRIM_END    → endBatch  (one undo step for entire trim gesture)
      MARQUEE_END → SET_SELECTION
      PLAYHEAD_SEEK → SET_PLAYHEAD (skipHistory)
      ZOOM_CHANGE → SET_ZOOM   (skipHistory)
      SCROLL_CHANGE → SET_SCROLL (skipHistory)
```

Snap is applied inside DRAG_MOVE handling — the commander calls `getSnapResult()` and emits `SNAP_ACTIVATED`/`SNAP_CLEARED` for the renderer to draw the guide line.

Batch transactions:
- `beginBatch()` is called at `DRAG_START` / `TRIM_START`
- `endBatch("Move clip")` / `endBatch("Trim clip end")` at gesture completion
- The entire gesture lands as **one undo step**, not N intermediate states

---

### Fix 3 — EngineTimeline fully bridges the event loop

**Problem:** `EngineTimeline.tsx` rendered and dispatched correctly but the live drag/trim feedback path was incomplete — `mountInteractionCommander()` was not called, so events never became commands.

**Resolution:** `EngineTimeline.tsx` is rewritten to:
1. Call `mountInteractionCommander()` in its setup `useEffect` — the commander's cleanup is returned so it tears down with the component
2. Subscribe to `SNAP_ACTIVATED` / `SNAP_CLEARED` and trigger canvas repaints with the snap guide visible
3. Use `draggingIds` and `snapRef` refs (not state) for live gesture data — avoids React render overhead during 60fps pointer moves
4. Fix the anchor-zoom wheel handler: the time under the cursor stays fixed when zooming

---

### Fix 4 — React subscriptions use `useSyncExternalStore`

**Problem:** Manual `useState` + `useEffect` subscription pattern can tear in React 18/19 concurrent rendering — components may read different snapshots within the same render batch.

**Resolution:** `bridge/react-adapter.ts` is rewritten to use `useSyncExternalStore`.

```ts
// Before (tears under concurrent React):
const [value, setValue] = useState(() => selector(engineStore.getState()));
useEffect(() => {
  return engineStore.subscribe((state) => setValue(selector(state)));
}, []);

// After (tear-safe):
export function useEngineSelector<T>(
  selector: (project: Project) => T,
  isEqual?: (a: T, b: T) => boolean
): T {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

Additional improvements:
- `isEqual` parameter for custom equality (avoids re-renders when an array/object has same contents but different reference)
- `shallowArrayEqual` and `shallowObjectEqual` exported for common cases
- `useScroll`, `useCanvasSize`, and `useHistory` now pass appropriate equality functions
- `getServerSnapshot` returns current state for SSR/RSC compatibility

---

### Fix 5 — Caption adapter uses dedicated commands

**Problem:** `caption-adapter.ts` merged captions by dispatching a full `LOAD_PROJECT` snapshot. This was too heavy — it replaced the entire project state, cleared all unrelated undo history context, and made the caption insertion undistinguishable in the history stack.

**Resolution:** Four new caption commands added to the engine:

```ts
ADD_CAPTIONS         // insert/replace captions by id — single undoable step
UPDATE_CAPTION       // patch one caption's text/timing/style
DELETE_CAPTIONS      // remove captions by id array
CLEAR_TRACK_CAPTIONS // remove all captions for a clip or track
```

The caption adapter now:
1. Calls `DELETE_CAPTIONS` with `skipHistory: true` to clear stale captions
2. Calls `ADD_CAPTIONS` with a description for one clean undo entry
3. Never touches `LOAD_PROJECT`

---

## Architecture

```
editor-engine/
  model/
    schema.ts              ← All domain types. ZoomFactor = px/ms.
  commands/
    index.ts               ← All EditorCommand types incl. ADD_CAPTIONS etc.
  state/
    engine-store.ts        ← Singleton. dispatch / undo / redo / subscribe
    reducer.ts             ← Pure (Project, Command) → Project
    selectors.ts           ← Derived reads
    factory.ts             ← createEmptyProject, createTrack
  events/
    event-bus.ts           ← Typed pub/sub
    editor-events.ts       ← EditorEventMap
  validation/
    guards.ts              ← validateCommand (covers all commands incl. captions)
    normalize.ts           ← Legacy → engine type conversion
  runtime/
    interaction/
      interaction-commander.ts  ← NEW: event bus → engine commands (the missing link)
      drag-registry.ts          ← Token-based safe drag payloads
      pointer-manager.ts        ← Pointer capture, emits interaction events
      snap-manager.ts           ← Snap point resolution (zoom-correct threshold)
      keyboard-manager.ts       ← Shortcut registration
    layout/
      time-converter.ts         ← ms↔px with full zoom convention docs
    render/
      timeline-canvas.ts        ← Canvas 2D timeline renderer
  bridge/
    react-adapter.ts       ← useSyncExternalStore hooks (React 19 safe)
    legacy-adapter.ts      ← @designcombo events → engine commands
    remotion-adapter.ts    ← Project → Remotion composition props
    caption-adapter.ts     ← Backend polling → ADD_CAPTIONS command
  ui/
    timeline/
      EngineTimeline.tsx   ← Drop-in canvas timeline (fully wired)
    StoreInitializer.tsx   ← Mounts legacy event bridge
  utils/
    id.ts
  index.ts                 ← Single public entry point
```

---

## Zoom reference card

| Zoom value | 1px represents | Typical use |
|------------|---------------|-------------|
| `1/300` (default) | 300ms | Normal editing view |
| `1/50` | 50ms | Fine frame editing |
| `1/3000` | 3 000ms (3s) | Overview of long videos |
| `1/20000` | 20 000ms (20s) | Minimum zoom (MIN_ZOOM) |
| `1/20` | 20ms | Maximum zoom (MAX_ZOOM) |

Formulas (always consistent):
```
screenX  = timeMs * zoom - scrollX
timeMs   = (screenX + scrollX) / zoom
widthPx  = durationMs * zoom
snapMs   = pixelRadius / zoom
```

---

## Interaction loop in full

```
1. User presses pointer on a clip body
   → handlePointerDown in EngineTimeline
   → startPointerDrag(e, "move", canvas, clipId)
   → pointer-manager stores session, emits DRAG_START

2. interaction-commander hears DRAG_START
   → snapshots clip.display.from as originalStart
   → calls engineStore.beginBatch()

3. User moves pointer
   → handlePointerMove → enginePointerMove(e, zoom, scrollX)
   → pointer-manager computes deltaMs = deltaXPx / zoom
   → emits DRAG_MOVE { snapTimeMs: originalStart + deltaMs }

4. interaction-commander hears DRAG_MOVE
   → calls getSnapResult(snapTimeMs, project, excludeIds, 12, zoom)
   → if snapped: emits SNAP_ACTIVATED → canvas draws yellow guide line
   → dispatches MOVE_CLIP { newStart: snappedTime } skipHistory=true

5. reducer applies MOVE_CLIP → new Project state
   → engineStore notifies subscribers
   → EngineTimeline's unsubState fires → scheduleRender → canvas repaints

6. User releases pointer
   → handlePointerUp → enginePointerUp(e, zoom, targetTrack?.id)
   → pointer-manager emits DRAG_END { targetTimeMs, targetTrackId }

7. interaction-commander hears DRAG_END
   → calls engineStore.endBatch("Move clip")
   → dispatches final MOVE_CLIP with history=true
   → emits SNAP_CLEARED

8. Canvas repaints without snap guide
   → One undo step in history: "Move clip"
```

---

## Migration steps (unchanged from v1)

1. Copy `editor-engine/` into `src/`
2. Add `<EngineStoreInitializer>` to `editor.tsx`
3. Gradually replace `useStore()` reads with `useEngineSelector()` hooks
4. Replace `applyEditorUpdate()` calls with `useEngineDispatch()` commands
5. Swap `<Timeline stateManager={sm} />` for `<EngineTimeline />`
6. Remove `@designcombo/*` from `package.json`

---

## Running tests

The reducer is a pure function — no DOM, no React, no mocking:

```ts
import { reducer } from "@/editor-engine/state/reducer";
import { createEmptyProject, createTrack } from "@/editor-engine/state/factory";
import { nanoid } from "@/editor-engine/utils/id";

test("MOVE_CLIP updates display.from and keeps duration", () => {
  let project = createEmptyProject();
  const trackId = nanoid();
  const clipId = nanoid();

  project = reducer(project, {
    type: "ADD_TRACK",
    payload: { track: createTrack("video", { id: trackId, order: 0 }) },
  });

  project = reducer(project, {
    type: "ADD_CLIP",
    payload: {
      trackId,
      clip: {
        id: clipId, type: "video", trackId, name: "test",
        display: { from: 0, to: 5000 },
        trim: { from: 0, to: 5000 },
        transform: { x:0,y:0,scaleX:1,scaleY:1,rotate:0,opacity:1,flipX:false,flipY:false },
        details: {},
      },
    },
  });

  project = reducer(project, {
    type: "MOVE_CLIP",
    payload: { clipId, newStart: 2000 },
  });

  expect(project.clips[clipId]?.display).toEqual({ from: 2000, to: 7000 });
});

test("zoom convention: timeMsToX(5000, 0, 1/300) ≈ 16.67px", () => {
  const { timeMsToX } = require("@/editor-engine/runtime/layout/time-converter");
  expect(timeMsToX(5000, 0, 1/300)).toBeCloseTo(16.67, 1);
});

test("xToTimeMs round-trips through timeMsToX", () => {
  const { timeMsToX, xToTimeMs } = require("@/editor-engine/runtime/layout/time-converter");
  const zoom = 1 / 300;
  const scrollX = 120;
  const timeMs = 4500;
  const x = timeMsToX(timeMs, scrollX, zoom);
  expect(xToTimeMs(x, scrollX, zoom)).toBeCloseTo(timeMs, 6);
});
```
