# Code Architecture: Which Files Create the Editor's Brain

## Overview

Your video editor has **260 files** in `src/features/editor/`. Only a handful create the actual "brain" - the rest are UI components that use this brain.

---

## The Core Brain (12 Files)

These 12 files control everything:

```
src/features/editor/
├── editor.tsx                    ← CREATES StateManager (the main engine)
├── store/
│   ├── use-store.ts              ← ZUSTAND (React sync layer)
│   └── use-layout-store.ts       ← UI layout state
├── hooks/
│   └── use-timeline-events.ts    ← SYNC between StateManager ↔ Zustand
├── scene/
│   ├── scene.tsx                 ← Canvas rendering (Fabric.js via StateManager)
│   ├── droppable.tsx             ← Handles drag & drop
│   └── interactions.tsx         ← Drag, resize, rotate clips
└── player/
    ├── player.tsx                ← Remotion player for preview
    └── composition.tsx            ← Renders clips for preview
```

### What Each Core File Does

#### 1. `editor.tsx` (Line 44) - THE MAIN ENGINE
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
- **What it does:** Creates the DesignCombo StateManager
- **Why it matters:** ALL data flows through this instance
- **Imported by:** 139 files use `dispatch()` to talk to it

---

#### 2. `store/use-store.ts` - ZUSTAND STORE
```typescript
const useStore = create<ITimelineStore>((set, get) => ({
  // Core data (mirrors StateManager)
  trackItemsMap: {},
  tracks: [],
  activeIds: [],
  
  // Actions
  setState: async (patch) => { /* deep merge */ },
  pushHistory: () => { /* save for undo */ },
  undo: () => { /* restore previous */ },
  redo: () => { /* restore forward */ },
}));
```
- **What it does:** React state layer (Zustand)
- **Why it matters:** UI reads from here, NOT directly from StateManager
- **Problem:** Can get out of sync with StateManager

---

#### 3. `hooks/use-timeline-events.ts` - THE SYNC BRIDGE
```typescript
useEffect(() => {
  // LISTENS to StateManager events
  subject.pipe(filter(...)).subscribe((obj) => {
    if (obj.key === EDIT_OBJECT) {
      // Updates Zustand when StateManager changes
      useStore.getState().setState({ trackItemsMap: merged });
    }
  });
}, []);
```
- **What it does:** Syncs StateManager → Zustand
- **Why it matters:** Keeps React UI in sync with engine
- **Problem:** Has timing gaps → causes stale data errors

---

#### 4. `scene/scene.tsx` - CANVAS RENDERING
```typescript
// Uses StateManager to render clips
const Scene = ({ stateManager }: { stateManager: StateManager }) => {
  // Renders Fabric.js canvas via StateManager
  return <div id="designcombo-canvas" />;
};
```
- **What it does:** Renders the preview canvas
- **Why it matters:** Shows clips to user

---

#### 5. `scene/interactions.tsx` - DRAG/RESIZE
```typescript
// Handles clip drag, resize, rotate
const handleDragEnd = () => {
  dispatch(EDIT_OBJECT, { payload });
};
const handleResize = (e) => {
  // Moves DOM + syncs Zustand live
  setState({ trackItemsMap: { [id]: { details: { ... } } } });
};
```
- **What it does:** Handles all clip manipulations
- **Why it matters:** User interaction with clips

---

#### 6. `scene/droppable.tsx` - DRAG & DROP
```typescript
const parseDragData = (e) => {
  const refData = getDragData();  // Module-level ref
  if (!refData) {
    const transferData = e.dataTransfer?.getData("text/plain");
    return JSON.parse(transferData);  // ← CRASHES HERE
  }
  return refData;
};
```
- **What it does:** Handles dropping files from panel to timeline
- **Why it matters:** Adding media to editor

---

#### 7. `player/player.tsx` - PREVIEW PLAYBACK
```typescript
// Remotion player for preview
<Player
  ref={playerRef}
  duration={duration}
  fps={fps}
  onPlay={() => dispatch(PLAYER_PLAY)}
  onPause={() => dispatch(PLAYER_PAUSE)}
/>
```
- **What it does:** Plays the timeline preview
- **Why it matters:** Preview playback

---

## The UI Layer (248 Files - Just Display)

These files ONLY read/write to the brain, they don't control logic:

```
src/features/editor/
├── panels/                        ← Show data, dispatch actions
│   ├── project-panel.tsx         ← Media browser
│   ├── effect-controls-panel.tsx ← Clip properties
│   └── source-control-panel.tsx  ← Source preview
├── menu-item/                     ← Add new items
│   ├── videos.tsx
│   ├── images.tsx
│   ├── audios.tsx
│   └── texts.tsx
├── control-item/                   ← Edit selected item
│   ├── common/
│   │   ├── text.tsx
│   │   ├── transform.tsx
│   │   ├── opacity.tsx
│   │   └── ...
│   └── floating-controls/
├── timeline/                       ← Timeline display
│   ├── timeline.tsx
│   ├── ruler.tsx
│   ├── playhead.tsx
│   └── items/
├── data/                          ← Static data (effects, transitions)
├── constants/                     ← Constants
├── utils/                         ← Helpers
└── engine/                        ← Additional engines
```

---

## The Data Flow (How They Connect)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         YOUR CODE (260 files)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  editor.tsx                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  const stateManager = new StateManager({...})  ← CREATES BRAIN     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                      │
│                                    ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  @designcombo/state (StateManager)                                │ │
│  │  - Internal state: { trackItems: {}, tracks: [] }                  │ │
│  │  - Canvas rendering (Fabric.js)                                     │ │
│  │  - Playback control                                                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    ▲                                      │
│         dispatch()             │     │        subject.subscribe()        │
│         (139 calls)            │     │        (sync back)               │
│                                    │                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  useStore (Zustand) - use-store.ts                                │ │
│  │  - trackItemsMap: {}  ←  MIRROR of StateManager                   │ │
│  │  - setState()          ←  Updates from StateManager               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    ▲                                      │
│                                    │                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  UI Components (panels, timeline, menu-items, etc.)               │ │
│  │  - Read from: useStore.getState()                                 │ │
│  │  - Write to: dispatch(ACTION, { payload })                        │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The Problem Areas

### Problem 1: Two-Brain Sync Gap
```
StateManager changes → (gap) → Zustand updates → UI re-renders
                        ↑
                   HERE IS THE PROBLEM
```
- **Location:** `use-timeline-events.ts`
- **Symptom:** Effect Controls panel shows old data during drag

### Problem 2: Empty Drag Data
```
project-panel.tsx: setDragData() → (timing) → droppable.tsx: getData() = empty
```
- **Location:** `droppable.tsx:49-71`
- **Symptom:** JSON.parse error on drop

### Problem 3: Null Properties
```
clip = undefined → clip.type → CRASH
```
- **Location:** `effect-controls-panel.tsx`
- **Symptom:** Cannot read properties of undefined

---

## Files That Need Fixes (Priority Order)

| File | Issue | Fix Status |
|------|-------|------------|
| `droppable.tsx` | JSON.parse error on drag/drop | Partially fixed |
| `effect-controls-panel.tsx` | Null property access | Partially fixed |
| `track-headers.tsx` | Undefined visible | Partially fixed |
| `interactions.tsx` | NaN in left/top | Partially fixed |
| `project-panel.tsx` | Invalid drag payload | Partially fixed |
| `use-timeline-events.ts` | Stale closure | Need review |

---

## What Can You Control?

| What You Can Control | What You CANNOT Control |
|---------------------|------------------------|
| Your 260 code files | `@designcombo/state` internals |
| Zustand store logic | StateManager canvas rendering |
| UI components | Fabric.js integration |
| Event handling | Remotion playback sync |
| Error handling | Event timing |

---

## Recommendation

Since you can't access DesignCombo source code, your best options are:

1. **Add defensive code everywhere** - Handle null/undefined at every access point
2. **Log more** - Add console.log to find exactly where things fail
3. **Contact DesignCombo** - Ask for fixes or support
4. **Consider migrating** - To a fully custom solution (months of work)

---

## Quick Fixes to Apply

```typescript
// 1. Always check before accessing properties
const details = clip?.details ?? {};

// 2. Always check before JSON.parse
try {
  const data = JSON.parse(str);
} catch {
  data = defaultData;
}

// 3. Always check drag data exists before using
const refData = getDragData();
if (!refData || !refData.type) return safeDefault;

// 4. Always use optional chaining
clip?.name ?? "Untitled"
```

Would you like me to apply these defensive patterns across all the core files?
