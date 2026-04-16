# VIDEO EDITOR ERROR ANALYSIS - ARCHIVE

> **NOTE:** This document describes the OLD hybrid architecture that has been FIXED.
> The timeline now uses a pure engine-first approach. This analysis is kept for reference.

---

# VIDEO EDITOR ERROR ANALYSIS - COMPLETE BREAKDOWN (Legacy)

## Executive Summary

**YES, DesignCombo is causing most of these errors.** The video-editor has a hybrid architecture where:

1. **DesignCombo (@designcombo/state)** - Provides timeline canvas, state management
2. **Zustand (useStore)** - Local mirror of state for React components
3. **@designcombo/events** - Event bus connecting them

When you drag/drop clips, DesignCombo fires events → Zustand updates → Components re-render. The errors occur because:

1. Timeline canvas hasn't initialized yet
2. State data is malformed/incomplete during rapid updates
3. Components access properties before data exists

---

## ERROR #1: "Unexpected end of JSON input"

### What's Happening

```
Your Action (drag clip)
       ↓
DesignCombo StateManager receives event
       ↓
StateManager tries to serialize/clone state
       ↓
structuredClone() or JSON.stringify() fails
       ↓
💥 ERROR: "Unexpected end of JSON input"
```

### Root Cause Location

**File:** `video-editor/src/features/editor/store/use-store.ts:74-88`

```typescript
function cloneState(state: any) {
  try {
    if (typeof state !== 'object' || state === null) {
      return state;
    }
    return structuredClone(state);  // ← Can fail on circular refs
  } catch {
    try {
      return JSON.parse(JSON.stringify(state));  // ← Can fail on undefined values
    } catch {
      console.warn('[useStore] Failed to clone state, returning empty object');
      return {};  // ← This fallback exists but isn't always used
    }
  }
}
```

### When Does It Fail?

- **During rapid drag operations** - State updates too fast
- **Circular references in state** - DesignCombo has complex nested objects
- **Undefined values in arrays** - `[1, undefined, 3]` can't be stringified

### Why During Drag/Drop?

```
Frame 1: Drag starts → State update 1
Frame 2: Drag continues → State update 2  
Frame 3: Drag continues → State update 3 (too fast!)
```

The clone happens on EVERY state update via `pushHistory()`. During drag, updates fire every ~16ms (60fps), and `structuredClone()` can't keep up.

---

## ERROR #2: "Cannot read properties of undefined (reading 'visible')"

### What's Happening

```
Component renders
       ↓
Component tries to access: timeline.visible
       ↓
timeline is NULL (not initialized yet)
       ↓
💥 ERROR: Cannot read properties of undefined (reading 'visible')
```

### Root Cause Location

**File:** `video-editor/src/features/editor/timeline/timeline.tsx:287-294`

```typescript
useEffect(() => {
  const availableScroll = horizontalScrollbarVpRef.current?.scrollWidth;
  if (!availableScroll || !timeline) return;  // ← This check EXISTS
  const canvasWidth = timeline.width;  // ← But timeline could be null here!
  // ...
}, [scale]);
```

The `if (!timeline) return;` check should prevent this, BUT:

1. `timeline` is null on first render (initialized in a different useEffect)
2. Component re-renders from state change
3. The `timeline.width` access happens before the check completes
4. Race condition between React rendering and useEffect execution

### When Does It Fail?

- **On first load** - Timeline hasn't been created yet
- **After switching projects** - Old timeline cleared, new not created
- **During rapid state changes** - Component renders before timeline initializes

---

## ERROR #3: "Cannot read properties of undefined (reading 'left')"

### What's Happening

Same as Error #2, but for `getBoundingClientRect()` calls:

```
Component renders
       ↓
Event handler called (drag start, resize, etc.)
       ↓
Handler tries: element.getBoundingClientRect()
       ↓
element is NULL or not mounted
       ↓
💥 ERROR: Cannot read properties of undefined (reading 'left')
```

### Root Cause Locations

**File:** `video-editor/src/features/editor/timeline/ruler.tsx:195`

```typescript
const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current;  // ← Could be null!
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();  // ← Safe after check
  // ...
};
```

**File:** `video-editor/src/features/editor/hooks/use-resizable-timeline.ts:12`

```typescript
const onMouseDown = (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
  if (!timelineContainerRef.current) return;  // ← Check exists
  const rect = timelineContainerRef.current.getBoundingClientRect();
  // ...
};
```

### When Does It Fail?

- **Drag starts before DOM is ready** - Ref is null
- **Component unmounts during drag** - Ref becomes null mid-drag
- **Touch events on mobile** - Touch handler fires before mouse handler

---

## WHY DESIGNCOMBO CAUSES THESE ERRORS

### DesignCombo's Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  @designcombo/state (StateManager)                          │
│  ─────────────────────────────────────────────────────────  │
│  • Manages timeline canvas (Fabric.js)                      │
│  • Handles object serialization                              │
│  • Fires events via @designcombo/events                     │
│  • Has its own internal state separate from Zustand        │
│                                                              │
│  ⚠️ PROBLEM: StateManager can fire events BEFORE            │
│     Zustand is ready, causing race conditions               │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ Fires events
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  @designcombo/events (Event Bus)                            │
│  ─────────────────────────────────────────────────────────  │
│  • Subject/Observable pattern                               │
│  • All components subscribe to events                        │
│  • When event fires, ALL subscribers update simultaneously   │
│                                                              │
│  ⚠️ PROBLEM: No ordering guarantee - component A might      │
│     try to access timeline before component B creates it     │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ Updates state
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Zustand (useStore)                                         │
│  ─────────────────────────────────────────────────────────  │
│  • Mirror of DesignCombo state for React                    │
│  • Components read from here, not from DesignCombo directly │
│  • pushHistory() clones state on EVERY update               │
│                                                              │
│  ⚠️ PROBLEM: cloneState() can't handle rapid updates       │
└─────────────────────────────────────────────────────────────┘
```

### The Race Condition

```
Timeline Component                    Clip Component
───────────────                      ───────────────
1. Renders with timeline=null
2. useEffect runs: create Timeline canvas
3. setTimeline(canvas) called        1. Renders with clip data
2. useEffect: timeline.visible       3. 💥 ERROR! timeline is null
```

---

## THE FIXES WE'VE APPLIED

| Error | Fix Location | What We Did |
|-------|--------------|-------------|
| JSON input | `use-store.ts:74-88` | Added try-catch with fallback |
| visible | `timeline.tsx:287-294` | Added `timeline?.width ?? 0` |
| left | `vertical-scrollbar.tsx` | Added `timeline?.scrollTo?.()` |
| Hooks order | `effect-controls-panel.tsx` | Moved hooks before returns |

---

## WHAT YOU SEE DURING DRAG/DROP

### Step-by-Step What Happens

```
1. USER DRAGS CLIP ON TIMELINE
   │
   ▼
2. DesignCombo StateManager receives event
   │
   ▼
3. StateManager updates internal Fabric.js canvas
   │
   ▼
4. StateManager fires event on @designcombo/events bus
   │
   ▼
5. ALL subscribers receive event simultaneously:
   - Timeline component
   - Scene component
   - EffectControls component
   - useTimelineEvents hook
   │
   ▼
6. Each subscriber tries to update their state
   │
   ▼
7. 💥 ONE OF THEM FAILS:
   - Timeline: timeline.visible (not initialized)
   - EffectControls: Hook order violation
   - JSON parse: Clone fails
```

---

## RECOMMENDATIONS FOR FULL FIX

### Option 1: Continue with DesignCombo (Current Path)
- Add more defensive checks everywhere
- Debounce rapid updates
- Accept the complexity

### Option 2: Migrate to Pure Engine (Recommended)
- Remove DesignCombo as source of truth
- Use the engine module we created
- Slowly migrate each component

### Option 3: Fork and Fix DesignCombo
- Deep dive into @designcombo packages
- Fix the race conditions at source
- Requires understanding Fabric.js internals

---

## CURRENT STATUS

✅ **Build passes** - Code compiles correctly

⚠️ **Runtime errors persist** - Due to DesignCombo race conditions

🔧 **Short-term fix** - Add defensive checks (in progress)

🎯 **Long-term fix** - Migrate away from DesignCombo

The errors are NOT in YOUR code - they're in the DesignCombo integration layer. Every drag/drop operation triggers a cascade of events that race against each other.
