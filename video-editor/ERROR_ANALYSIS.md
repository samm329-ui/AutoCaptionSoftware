# Video Editor Architecture Analysis & Error Fixes - ARCHIVE

> **NOTE:** This document contains pre-engine-migration analysis.

---

# Video Editor Architecture Analysis & Error Fixes (Legacy)

## Overview

The video editor uses a **hybrid state architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     VIDEO EDITOR                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────────────────────┐   │
│  │  @designcombo   │    │      Zustand Store              │   │
│  │  StateManager  │◄──►│      (useStore)                  │   │
│  │                 │    │                                  │   │
│  │ - dispatch()    │    │ - trackItemsMap: {}             │   │
│  │ - getState()    │    │ - tracks: []                    │   │
│  │ - subscribe()   │    │ - activeIds: []                 │   │
│  └────────┬────────┘    │ - timeline: Timeline | null    │   │
│           │             │ - playerRef: PlayerRef | null  │   │
│           │             └──────────────┬─────────────────┘   │
│           │                            │                       │
│           ▼                            ▼                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              React Components                            │   │
│  │  - Editor.tsx (main layout)                            │   │
│  │  - Timeline.tsx (canvas timeline)                       │   │
│  │  - Scene.tsx (preview canvas)                           │   │
│  │  - EffectControlsPanel.tsx (properties)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Adding a clip (drag from sidebar)
```
User drags clip → MenuList.tsx
  → applyEditorUpdate(ADD_VIDEO, payload)
  → dispatch(type, payload)
  → @designcombo/events subject.next()
  → StateManager receives event
  → Updates internal state
  → Emits state change
  → useTimelineEvents subscribes
  → useStore.setState({ trackItemsMap: ... })
  → Components re-render
```

### 2. Moving a clip (drag on timeline)
```
User drags clip → CanvasTimeline (Fabric.js)
  → on object:moving event
  → updates trackItemsMap
  → dispatch(EDIT_OBJECT, payload)
  → StateManager processes
  → Zustand updated
  → Timeline re-renders
```

### 3. Selecting a clip
```
User clicks clip → Scene.tsx or Timeline.tsx
  → dispatch(LAYER_SELECTION, { activeIds })
  → @designcombo/events → StateManager
  → useTimelineEvents → useStore.setState({ activeIds })
  → EffectControlsPanel sees activeIds change
  → Renders clip properties
```

## Root Causes of Errors

### Error 1: "Unexpected end of JSON input"
**Cause**: `structuredClone()` or `JSON.parse()` on invalid data
- Location: `use-store.ts` line ~76-79
- Fix: Add try-catch with fallback

### Error 2: "Cannot read properties of undefined (reading 'visible')"
**Cause**: Component trying to access null timeline object
- Location: Likely in timeline components accessing `timeline.visible`
- Fix: Add null checks before accessing properties

### Error 3: "Cannot read properties of undefined (reading 'left')"
**Cause**: Accessing getBoundingClientRect() on unmounted/ref-null elements
- Location: Timeline or ruler components
- Fix: Add null checks for refs

### Error 4: "React has detected a change in the order of Hooks"
**Cause**: Conditional hooks or different hook count between renders
- Location: EffectControlsPanel.tsx
- The component imports engine-hooks which uses useSyncExternalStore
- Must ensure hooks are always called in same order

## Fixes to Implement

### Fix 1: Safe state cloning
Add defensive coding in use-store.ts for JSON parsing

### Fix 2: Null-safe timeline access
Add guards in timeline components before accessing timeline properties

### Fix 3: Ref null checks
Add checks before calling getBoundingClientRect()

### Fix 4: Engine hooks isolation
The new engine hooks should NOT be used in existing components - they're only available for future migration

## Current State

The existing @designcombo + Zustand hybrid system works - these errors are pre-existing issues in the codebase, not caused by the engine integration (which is isolated in `engine/` folder and not actively used yet).