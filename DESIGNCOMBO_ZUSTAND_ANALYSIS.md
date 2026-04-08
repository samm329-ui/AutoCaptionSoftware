# DesignCombo + Zustand Architecture Analysis

## Overview

This document explains how the DesignCombo engine, Zustand state management, and your custom React code interact to create the video editor.

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              NODE_MODULES                                        │
│                         (@designcombo/* packages)                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    @designcombo/state                                     │ │
│  │                    (StateManager - ENGINE)                                │ │
│  │                                                                            │ │
│  │  - Has its OWN internal state (NOT Zustand)                              │ │
│  │  - Handles: ADD_VIDEO, EDIT_OBJECT, DESIGN_LOAD, HISTORY_UNDO, etc.       │ │
│  │  - Uses Immer + Lodash internally                                         │ │
│  │  - Uses RxJS for event emitting                                          │ │
│  │  - Exports: StateManager class, action constants                         │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                    ▲                                             │
│                                    │ dispatch()                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    @designcombo/events                                    │ │
│  │                    (Event System)                                         │ │
│  │                                                                            │ │
│  │  - Exports: dispatch(), subject, filter                                   │ │
│  │  - Acts as message bus between StateManager and React                    │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                    ▲                                             │
│                                    │ emits events                                │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    @designcombo/timeline                                  │ │
│  │                    (Timeline calculations)                                │ │
│  │                                                                            │ │
│  │  - Exports: generateId(), timeMsToUnits(), unitsToTimeMs()               │ │
│  │  - Used for ruler, zoom, scrolling                                        │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
          ▲                                    │                              ▲
          │ import                             │                              │ import
          │                                    ▼                              │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            YOUR CODE                                            │
│                       (src/features/editor/)                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                         editor.tsx                                         │ │
│  │                                                                            │ │
│  │  // Creates ONE StateManager instance                                      │ │
│  │  const stateManager = new StateManager({                                  │ │
│  │    size: { width: 1080, height: 1920 },                                  │ │
│  │  });                                                                      │ │
│  │                                                                            │ │
│  │  // Loads design on mount                                                  │ │
│  │  useEffect(() => {                                                        │ │
│  │    dispatch(DESIGN_LOAD, { payload: design, options: { stateManager } });│ │
│  │  }, []);                                                                  │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                      useStore (Zustand)                                    │ │
│  │                    (src/features/editor/store/)                            │ │
│  │                                                                            │ │
│  │  - Holds: trackItemsMap, tracks, activeIds, timeline, playerRef            │ │
│  │  - ALSO has: timeline (instance), playerRef, sceneMoveableRef           │ │
│  │  - Actions: setState(), pushHistory(), undo(), redo()                    │ │
│  │  - Merges deeply: preserve nested details/display/trim fields            │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                    ▲                                             │
│                                    │ subscribes to                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                  use-timeline-events.ts                                    │ │
│  │                                                                            │ │
│  │  useEffect(() => {                                                         │ │
│  │    // LISTENS to StateManager events                                       │ │
│  │    subject.pipe(filter(...)).subscribe((obj) => {                         │ │
│  │      if (obj.key === EDIT_OBJECT) {                                        │ │
│  │        // Updates Zustand when StateManager changes                       │ │
│  │        useStore.getState().setState({ trackItemsMap: merged });            │ │
│  │      }                                                                     │ │
│  │    });                                                                     │ │
│  │  }, []);                                                                   │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
          ▲                                                         │
          │ reads from                                              │ reads from
          │                                                         │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      YOUR UI COMPONENTS                                         │
│                   (src/features/editor/)                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────────┐ │
│  │ project-panel.tsx│    │effect-controls   │    │    timeline.tsx          │ │
│  │                  │    │    -panel.tsx    │    │                          │ │
│  │                  │    │                  │    │                          │ │
│  │ Draggable files  │    │ Shows clip       │    │ Renders clips           │ │
│  │ to timeline      │    │ properties       │    │ on timeline             │ │
│  └────────┬─────────┘    └────────┬─────────┘    └───────────┬──────────────┘ │
│           │                       │                          │                  │
│           │ dispatch(ADD_VIDEO)  │ useStore.getState()      │ useStore.getState()
│           │ (to StateManager)     │ (reads Zustand)          │ (reads Zustand)  │
│           │                       │                          │                  │
│           ▼                       ▼                          ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     droppable.tsx (Scene/Canvas)                           │ │
│  │                                                                            │ │
│  │  - onDrop: reads drag data, dispatches ADD_VIDEO                         │ │
│  │  - Scene: renders clips based on Zustand trackItemsMap                  │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Priority

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         PRIORITY CHAIN                                          │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  HIGHEST (AUTHORITATIVE)                                                        │
│  ════════════════════════                                                       │
│  @designcombo/state (StateManager)                                             │
│  - Actual source of truth                                                       │
│  - Controls canvas rendering                                                    │
│  - If StateManager has old data → EVERYTHING shows old data                    │
│                                                                                 │
│         │                                                                       │
│         ▼ dispatch()                                                            │
│                                                                                 │
│  MIDDLE (SYNC LAYER)                                                            │
│  ════════════════════════                                                       │
│  useStore (Zustand)                                                             │
│  - Must stay in sync with StateManager                                          │
│  - Receives updates via use-timeline-events.ts                                  │
│  - Triggers React re-renders                                                     │
│  - If Zustand doesn't update → UI shows stale data                              │
│                                                                                 │
│         │                                                                       │
│         ▼ reads from                                                            │
│                                                                                 │
│  LOWEST (UI RENDERING)                                                          │
│  ════════════════════════                                                       │
│  React Components                                                               │
│  - effect-controls-panel.tsx                                                    │
│  - timeline.tsx                                                                 │
│  - scene/canvas                                                                 │
│  - Just display what Zustand says                                               │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## The "Two-Brain" Problem

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                          THE CONFLICT                                         │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   BRAIN 1: @designcombo/state (StateManager)                                  │
│   ─────────────────────────────────────────────                                 │
│   - Created in editor.tsx                                                       │
│   - Holds: this.state = { trackItems: {}, tracks: [] }                        │
│   - Controls: canvas rendering, playback                                       │
│   - When you drag clip → StateManager moves it                                 │
│                                                                                 │
│                                                                                 │
│   BRAIN 2: useStore (Zustand)                                                   │
│   ─────────────────────────────────────────────                                 │
│   - Created in store/use-store.ts                                              │
│   - Holds: trackItemsMap (mirror of StateManager)                              │
│   - Used by: Effect Controls panel                                             │
│   - When clip moves → panel reads from Zustand                                  │
│                                                                                 │
│                                                                                 │
│   THE PROBLEM:                                                                  │
│   ───────────────                                                               │
│   When clip is dragged on canvas:                                               │
│     1. StateManager updates its internal state                                  │
│     2. Canvas re-renders (shows new position)                                   │
│     3. BUT Zustand hasn't been notified yet                                     │
│     4. Effect Controls panel reads OLD position from Zustand                   │
│     5. User sees mismatch: canvas shows new, panel shows old                    │
│                                                                                 │
│   THE FIX (use-timeline-events.ts):                                             │
│   ─────────────────────────────────────                                         │
│   - Subscribe to EDIT_OBJECT events                                             │
│   - When StateManager changes → update Zustand immediately                     │
│   - But there's still a timing gap → causes errors                              │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Package Dependencies

### From package.json:

```json
{
  "@designcombo/animations": "^5.5.8",
  "@designcombo/events": "^1.0.2",
  "@designcombo/frames": "^0.0.3",
  "@designcombo/state": "^5.5.8",
  "@designcombo/timeline": "^5.5.8",
  "@designcombo/transitions": "^5.5.8"
}
```

### @designcombo/state Dependencies (internal):

```json
{
  "dependencies": {
    "immer": "^10.1.1",
    "lodash.clonedeep": "^4.5.0",
    "lodash.isequal": "^4.5.0",
    "lodash.pick": "^4.4.0",
    "microdiff": "^1.4.0",
    "rxjs": "^7.8.1",
    "nanoid": "^5.0.7"
  },
  "peerDependencies": {
    "@designcombo/events": "^1.0.2",
    "@designcombo/types": "5.5.8"
  }
}
```

---

## Key Connection Points

### 1. StateManager Creation (editor.tsx)

```typescript
// Creates ONE StateManager instance
const stateManager = new StateManager({
  size: { width: 1080, height: 1920 },
});

// Loads design on mount
useEffect(() => {
  dispatch(DESIGN_LOAD, { payload: design, options: { stateManager } });
}, []);
```

### 2. Zustand Store (use-store.ts)

```typescript
const useStore = create<ITimelineStore>((set, get) => ({
  // Core data (mirrors StateManager)
  tracks: [],
  trackItemIds: [],
  trackItemsMap: {},
  
  // Actions
  setState: async (patch) => {
    // Deep merge for trackItemsMap
    const resolvedPatch = typeof patch === "function" ? patch(get()) : patch;
    if ("trackItemsMap" in resolvedPatch) {
      next.trackItemsMap = mergeTrackItemsMap(state.trackItemsMap, patch.trackItemsMap);
    }
  },
  
  // Undo/Redo
  pushHistory: () => { /* ... */ },
  undo: () => { /* ... */ },
  redo: () => { /* ... */ },
}));
```

### 3. Event Subscription (use-timeline-events.ts)

```typescript
useEffect(() => {
  // Subscribe to EDIT_OBJECT events from StateManager
  const editSub = subject
    .pipe(filter(({ key }) => key === EDIT_OBJECT))
    .subscribe((obj) => {
      const payload = obj.value?.payload;
      // Merge changes into Zustand
      const merged = { ...current };
      for (const [id, patch] of Object.entries(payload)) {
        merged[id] = { ...existing, ...patch };
      }
      useStore.getState().setState({ trackItemsMap: merged });
    });
  
  return () => editSub.unsubscribe();
}, []);
```

### 4. Dispatching Actions (project-panel.tsx, droppable.tsx)

```typescript
// When dropping file to timeline
const handleDrop = (data) => {
  const payload = {
    id: generateId(),
    type: "video",
    src: file.objectUrl,
    // ... more fields
  };
  
  // Dispatch TO StateManager
  dispatch(ADD_VIDEO, { payload });
  
  // StateManager then:
  // 1. Adds to its internal state
  // 2. Emits event
  // 3. Zustand subscription picks it up
};
```

---

## The JSON.parse Error Flow

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                    DRAG & DROP - WHERE IT BREAKS                             │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. project-panel.tsx (AssetListItem)                                          │
│     ┌──────────────────────────────────────────────────────────────────────────┐ │
│     │ const handleDragStart = (e) => {                                      │ │
│     │   const jsonStr = buildDragPayload(file);  // JSON.stringify(...)     │ │
│     │   setDragData(JSON.parse(jsonStr));        // Module-level ref        │ │
│     │   e.dataTransfer.setData("text/plain", jsonStr);                     │ │
│     │ };                                                                    │ │
│     └──────────────────────────────────────────────────────────────────────────┘ │
│                              │                                                 │
│                              ▼                                                 │
│  2. Browser: Drag from Panel → Drop on Timeline                                │
│                              │                                                 │
│                              ▼                                                 │
│  3. droppable.tsx (onDrop)                                                    │
│     ┌──────────────────────────────────────────────────────────────────────────┐ │
│     │ const parseDragData = (e) => {                                         │ │
│     │   const refData = getDragData();  // Module-level ref (might be empty!) │ │
│     │   if (refData) return refData;                                         │ │
│     │                                                                        │ │
│     │   const transferData = e.dataTransfer.getData("text/plain");          │ │
│     │   // ⚠️ PROBLEM: Sometimes returns EMPTY STRING                         │ │
│     │   // - Browser security                                               │ │
│     │   // - Timing issue                                                   │ │
│     │   // - Cross-origin restriction                                       │ │
│     │                                                                        │ │
│     │   const parsed = JSON.parse(transferData);  // CRASH!                  │ │
│     │   // "Unexpected end of JSON input"                                   │ │
│     │ };                                                                    │ │
│     └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ROOT CAUSE: The module-level getDragData() ref or dataTransfer is empty       │
│  when onDrop fires because of timing/async issues between drag start/drop.   │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/features/editor/
├── store/
│   ├── use-store.ts          # Zustand store (sync layer)
│   └── use-layout-store.ts   # UI layout state
├── hooks/
│   └── use-timeline-events.ts  # Subscribes to StateManager events
├── scene/
│   ├── droppable.tsx         # Handles drop events
│   └── interactions.tsx     # Handles drag/resize
├── panels/
│   ├── project-panel.tsx     # Media browser + draggable items
│   ├── effect-controls-panel.tsx  # Clip properties
│   └── source-control-panel.tsx   # Source preview
├── timeline/
│   ├── timeline.tsx         # Timeline canvas
│   └── track-headers.tsx    # Track visibility
└── editor.tsx                # Main editor + StateManager creation
```

---

## Summary

| Layer | What It Controls | Priority |
|-------|-----------------|----------|
| `@designcombo/state` | Core data, canvas rendering | HIGHEST |
| `useStore (Zustand)` | React UI state, sync mirror | SYNC |
| `React Components` | Visual rendering only | LOWEST |

**The Issues:**
- Timing gaps between StateManager updates and Zustand sync
- Empty dataTransfer during drag/drop operations
- Two-brain architecture causing stale data

**Potential Solutions:**
1. Add defensive checks everywhere data is accessed
2. Ensure data is always available before parsing
3. Contact DesignCombo for fixes to their engine
4. Consider replacing with custom engine (large effort)
