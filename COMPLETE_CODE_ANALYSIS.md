# Complete Code Analysis: How DesignCombo Actually Works

## 1. Package Internals (From node_modules)

### @designcombo/state (5012 lines compiled)

**What it exports:**
```
StateManager (class) - The main engine
dispatch() - Sends events to the system
subject - RxJS Subject for event bus
filter - RxJS filter for event filtering
```

**All Event Constants:**
```
ADD_VIDEO = "add:video"
ADD_AUDIO = "add:audio"
ADD_IMAGE = "add:image"
ADD_TEXT = "add:text"
ADD_CAPTIONS = "add:caption"
ADD_ITEMS = "add:items"
ADD_TRANSITION = "add:transition"
ADD_ANIMATION = "add:animation"
EDIT_OBJECT = "edit:object"
EDIT_TRACK = "edit:track"
LAYER_DELETE = "layer:delete"
LAYER_CLONE = "layer:clone"
LAYER_SELECTION = "layer:selection"
DESIGN_LOAD = "design:load"
DESIGN_RESIZE = "design:resize"
HISTORY_UNDO = "history:undo"
HISTORY_REDO = "history:redo"
```

**StateManager Internal Structure:**
```javascript
class StateManager {
  // Internal state
  state = {
    tracks: [],
    trackItemsMap: {},
    trackItemIds: [],
    transitionIds: [],
    transitionsMap: {},
    structure: [],
    size: { width: 1080, height: 1920 },
    duration: 1000,
    fps: 30,
    scale: { index: 7, unit: 300, zoom: 1/300 },
    activeIds: [],
    background: { type: "color", value: "transparent" }
  }

  // Methods
  getState() → returns current state
  updateState(partialState, options) → updates state
  subscribe(callback) → listen to state changes
  undo() → restore previous state
  redo() → restore forward state
  toJSON() → export state as JSON
}
```

**How it handles events:**
```javascript
// When dispatch(ADD_VIDEO, { payload }) is called:
1. Event is sent to @designcombo/events dispatcher
2. StateManager receives event
3. Handler creates new track item
4. State is updated via updateState()
5. stateSubject.next(newState) emits to all subscribers
6. Undo/redo history is recorded
```

---

### @designcombo/timeline (Canvas-based)

**What it exports:**
```
Timeline (class) - Canvas timeline using Fabric.js
generateId() - Generate unique IDs
timeMsToUnits() - Convert ms to timeline pixels
unitsToTimeMs() - Convert pixels to ms
```

**Timeline Internal Structure:**
```javascript
class Timeline extends Fabric.Canvas {
  // Properties
  tracks: ITrack[]
  trackItemsMap: Record<string, ITrackItem>
  trackItemIds: string[]
  transitionIds: string[]
  transitionsMap: Record<string, ITransition>
  scale: ITimelineScaleState
  duration: number
  state: StateManager  // Reference to StateManager
  activeIds: string[]

  // Methods
  getState() → returns timeline state
  updateState() → syncs changes back to StateManager
  setActiveIds() → update selection
  setScale() → update zoom level
  scrollTo() → scroll timeline
  setBounding() → resize canvas
  notify() → emit state changes
}
```

**How it works:**
```
1. Timeline is a Fabric.js Canvas
2. Renders tracks as rectangles
3. Renders clips as draggable objects
4. On drag/resize → updates trackItemsMap
5. Calls updateState() to sync with StateManager
6. StateManager emits event → Zustand updates
```

---

### @designcombo/events (Event Bus)

**What it exports:**
```
subject - RxJS Subject (event stream)
dispatch(type, { payload }) - Send event
filter - RxJS filter operator
```

**How it works:**
```javascript
// dispatch() implementation
const subject = new Subject();
const dispatch = (type, data) => {
  subject.next({ key: type, value: data });
};

// When you call dispatch(ADD_VIDEO, { payload })
// It sends { key: "add:video", value: { payload: {...} } }
// to all subscribers
```

---

## 2. How Your Code Connects

### editor.tsx (Line 44) - CREATES THE ENGINE

```typescript
// YOUR CODE
const stateManager = new StateManager({
  size: { width: 1080, height: 1920 },
});

// This creates ONE StateManager instance
// All 139 dispatch() calls talk to THIS instance
```

### use-store.ts - ZUSTAND MIRROR

```typescript
// YOUR CODE
const useStore = create<ITimelineStore>((set, get) => ({
  // Mirrors StateManager data
  trackItemsMap: {},      // ← Same as StateManager.trackItemsMap
  tracks: [],            // ← Same as StateManager.tracks
  trackItemIds: [],      // ← Same as StateManager.trackItemIds
  
  // Actions
  setState: async (patch) => {
    // Deep merge for trackItemsMap
    // Preserves nested fields (details, display, trim)
  },
}));
```

### use-timeline-events.ts - THE BRIDGE

```typescript
// YOUR CODE - Subscribes to StateManager events
useEffect(() => {
  // Listen to EDIT_OBJECT events
  subject.pipe(filter(({ key }) => key === EDIT_OBJECT))
    .subscribe((obj) => {
      const payload = obj.value?.payload;
      // Merge into Zustand
      useStore.getState().setState({ 
        trackItemsMap: merged 
      });
    });
}, []);
```

### droppable.tsx - DRAG & DROP HANDLER

```typescript
// YOUR CODE
const handleDrop = (draggedData) => {
  switch (draggedData.type) {
    case "video":
      dispatch(ADD_VIDEO, { payload });  // → StateManager
      break;
    case "audio":
      dispatch(ADD_AUDIO, { payload });
      break;
  }
};
```

### interactions.tsx - CLIP MANIPULATION

```typescript
// YOUR CODE
const handleDragEnd = () => {
  dispatch(EDIT_OBJECT, { payload });  // → StateManager
};

const handleResize = (e) => {
  // Update DOM for smooth feel
  target.style.width = `${nextWidth}px`;
  
  // Sync Zustand immediately
  setState({
    trackItemsMap: { [id]: { details: { width: nextWidth } } }
  });
};
```

---

## 3. Complete Data Flow (Step by Step)

### Adding a Video to Timeline

```
1. User drags video from Project Panel
   ↓
2. project-panel.tsx: handleDragStart()
   - buildDragPayload(file) → JSON.stringify({...})
   - e.dataTransfer.setData("text/plain", jsonStr)
   - setDragData(parsed) → module-level ref
   ↓
3. User drops on Timeline Canvas
   ↓
4. droppable.tsx: onDrop()
   - parseDragData(e) → gets { type: "video", src: "...", ... }
   - dispatch(ADD_VIDEO, { payload }) → sends to StateManager
   ↓
5. @designcombo/state: handles ADD_VIDEO
   - Creates new track item in StateManager.trackItemsMap
   - Adds to StateManager.trackItemIds
   - Updates StateManager.tracks if needed
   - Emits event via stateSubject.next(newState)
   ↓
6. @designcombo/events: dispatches event
   - subject.next({ key: "add:video", value: { payload } })
   ↓
7. use-timeline-events.ts: receives event
   - Merges new item into Zustand trackItemsMap
   - Zustand triggers re-render
   ↓
8. UI Components update:
   - Timeline canvas shows new clip
   - Effect Controls panel can now select it
   - Project panel shows it in timeline
```

### Editing a Clip (Drag/Resize)

```
1. User drags clip on canvas
   ↓
2. interactions.tsx: handleDrag()
   - Moves DOM element (for smooth 60fps)
   - Updates Zustand live via setState()
   ↓
3. interactions.tsx: handleDragEnd()
   - dispatch(EDIT_OBJECT, { payload }) → StateManager
   ↓
4. StateManager: handles EDIT_OBJECT
   - Merges new position into trackItemsMap
   - Emits state change
   ↓
5. use-timeline-events.ts: receives EDIT_OBJECT
   - Updates Zustand with final position
   ↓
6. Effect Controls panel shows updated position
```

---

## 4. The Actual Problem Areas

### Problem 1: Empty Drag Data

```typescript
// In droppable.tsx
const parseDragData = (e) => {
  const refData = getDragData();  // Module-level ref
  if (!refData) {
    // ❌ Sometimes dataTransfer.getData() returns empty string
    const transferData = e.dataTransfer?.getData("text/plain");
    return JSON.parse(transferData);  // CRASH!
  }
  return refData;
};
```

**Why it happens:**
- Browser security restrictions
- Timing issues between drag start and drop
- Module-level ref might be cleared before drop fires

### Problem 2: Null Properties

```typescript
// In effect-controls-panel.tsx
const details = clip.details;  // ❌ clip might be undefined
const type = clip.type;        // ❌ CRASH!
```

**Why it happens:**
- Zustand hasn't synced with StateManager yet
- Clip was deleted but panel still references it
- Race condition during selection change

### Problem 3: Two-Brain Sync Gap

```
StateManager changes → (gap) → Zustand updates → UI re-renders
                        ↑
                   HERE IS THE PROBLEM
```

**Why it happens:**
- StateManager emits event
- use-timeline-events.ts receives it
- But React hasn't re-rendered yet
- User sees stale data briefly

---

## 5. What You Can Actually Fix

### ✅ FIXABLE (Your Code)

| Issue | Fix | File |
|-------|-----|------|
| Empty drag data | Add try/catch + fallback | `droppable.tsx` |
| Null properties | Add optional chaining | `effect-controls-panel.tsx` |
| NaN values | Add validation | `interactions.tsx` |
| Stale Zustand | Improve sync timing | `use-timeline-events.ts` |
| Missing validation | Add validators | All dispatch calls |

### ❌ NOT FIXABLE (DesignCombo Internals)

| Issue | Why | Impact |
|-------|-----|--------|
| StateManager timing | Compiled code, no source | Can't change |
| Fabric.js canvas | Internal to Timeline | Can't modify |
| Event order | RxJS subscription order | Can't control |
| Undo/redo logic | Built into StateManager | Can't extend |

---

## 6. Recommended Approach

### Option A: Defensive Coding (Quick Fix)

Add guards everywhere:
```typescript
// Always use optional chaining
clip?.name ?? "Untitled"
clip?.details?.position?.x ?? 0

// Always wrap JSON.parse
try {
  const data = JSON.parse(str);
} catch {
  data = defaultData;
}

// Always validate before dispatch
if (!payload || !payload.type) return;
dispatch(ADD_VIDEO, { payload });
```

### Option B: Custom Engine (Long-term)

Replace DesignCombo with your own:
1. Create Zustand as single source of truth
2. Build custom canvas (Fabric.js or Konva)
3. Implement your own event system
4. Takes 2-4 months of work

### Option C: Hybrid Approach (Recommended)

1. Keep DesignCombo for core functionality
2. Add defensive layers in your code
3. Create validation system
4. Add comprehensive logging
5. Contact DesignCombo for support

---

## 7. File-by-File Action Items

| File | Action | Priority |
|------|--------|----------|
| `droppable.tsx` | Add try/catch + fallback | 🔴 HIGH |
| `effect-controls-panel.tsx` | Add optional chaining | 🔴 HIGH |
| `interactions.tsx` | Add NaN guards | 🔴 HIGH |
| `track-headers.tsx` | Add null checks | 🟡 MEDIUM |
| `project-panel.tsx` | Validate drag payload | 🟡 MEDIUM |
| `use-timeline-events.ts` | Improve sync timing | 🟡 MEDIUM |
| `player.tsx` | Add error boundary | 🟢 LOW |
| `timeline.tsx` | Add validation | 🟢 LOW |

---

## Summary

**DesignCombo is a black box** - you can't modify its internals.

**Your code is the only thing you can control** - make it defensive.

**The sync gap is inevitable** - work around it, don't fight it.

**Best path forward:**
1. Add defensive code everywhere
2. Create validation layer
3. Add logging for debugging
4. Consider custom engine for long-term
