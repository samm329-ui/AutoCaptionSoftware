# Engine Migration Plan - ARCHIVE

> **NOTE:** This document describes the OLD architecture that has been FIXED.
> The timeline engine migration is now complete. See ENGINE_MIGRATION_PLAN.md
> in the root for the new architecture documentation.

---

# Engine Migration Plan - Complete Analysis (Legacy)

## Current Architecture Problem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CURRENT BROKEN STATE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                             │
│  Upload (menu-item)                                           │
│       ↓                                                     │
│  upload-store.ts → mediaAssets ← FILLED                       │
│       ↓                                                     │
│  [DISPATCH EVENTS THAT GO NOWHERE]                            │
│       ↓                                                     │
│  Zustand store ← trackItemsMap: {} ← EMPTY!                 │
│       ↓                                                     │
│  Timeline reads → Renders NOTHING                          │
│  Player reads → Renders NOTHING                          │
│  Scene reads → Renders NOTHING                          │
│                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## What Each Component Needs (Requirement Analysis)

### 1. Player Component (`player/player.tsx`)
**Needs:**
- `setPlayerRef` - to control playback (play, pause, seek)
- `duration` - video duration in ms
- `fps` - frames per second
- `size` - canvas {width, height}
- `background` - {type: "color"|"image", value: string}

**Current Source:** Zustand `useStore()`
```typescript
const { setPlayerRef, duration, fps, size, background } = useStore();
```

**Engine Has:**
- ❌ NO playerRef - needs to add
- ✅ can get duration from sequence
- ✅ can get fps from sequence
- ✅ can get canvas from sequence

**Fix:** Add to engine - create player registry

---

### 2. Timeline Component (`timeline/timeline.tsx`)
**Needs:**
- `tracks` - array of track objects
- `trackItemsMap` - map of clipId → clip data
- `activeIds` - selected clip IDs
- `scale` - {index, unit, zoom, segments}
- `fps` - frames per second
- `playerRef` - for seeking

**Current Source:** Zustand `useStore()`
```typescript
const { scale, playerRef, fps, tracks: storeTracks, activeIds: selection, trackItemsMap } = useStore();
```

**Engine Has:**
- ✅ `tracks` (Record<string, Track>)
- ✅ `clips` (Record<string, Clip>) 
- ❌ NO `scale` - needs to add to UI state
- ❌ NO `playerRef` - needs to add

**Fix:** Add playerRef to engine, add scale/zoom to UI state

---

### 3. Scene Component (`scene/scene.tsx`)
**Needs:**
- `size` - canvas dimensions
- Zoom state

**Current Source:** Zustand + Engine mix
```typescript
const { size } = useStore();
const engineClipCount = useEngineSelector(selectClipCount);
```

**Engine Has:**
- ✅ canvas from sequence
- ✅ clip count via selector

---

### 4. Control Panels (`control-item/*.tsx`, `panels/*.tsx`)
**Needs:**
- `activeIds` - selected clip for editing
- `trackItemsMap` - clip details for properties
- Edit functions (transform, details, etc)

**Current Source:** Zustand `useStore().editObject()`
```typescript
const { activeIds, trackItemsMap } = useStore();
useStore().editObject({[clipId]: {details: {...}}});
```

**Engine Has:**
- ✅ clips (Record<string, Clip>)
- ✅ has UPDATE_CLIP command
- ✅ has SET_SELECTION command

---

### 5. Menu Items (`menu-item/*.tsx`) - UPLOAD
**Needs:**
- Add media to timeline
- Read media assets
- Create clips/tracks

**Current Source:** dispatch events → Zustand
```typescript
dispatch(ADD_ITEMS, {trackItems: [...], tracks: [...]})
```

**Engine Has:**
- ✅ ADD_CLIP command
- ✅ ADD_TRACK command

---

## Complete Requirements List

| Component | Need | Current Source | Engine Status | Action |
|-----------|------|--------------|-------------|--------|
| Player | playerRef | Zustand | ❌ Add | Add ref registry |
| Player | duration | Zustand | ✅ Add getter | Add to engine |
| Player | fps | Zustand | ✅ Add getter | Add to engine |
| Player | size | Zustand | ✅ Has | Add getter |
| Player | background | Zustand | ✅ Has | Add getter |
| Timeline | tracks | Zustand | ✅ Has | Convert format |
| Timeline | trackItemsMap | Zustand | ✅ Has (as clips) | Rename mapping |
| Timeline | activeIds | Zustand | ✅ Has (ui.selection) | Create alias |
| Timeline | scale | Zustand | ❌ Add | Add to UI state |
| Timeline | playerRef | Zustand | ❌ Add (from player) | Pass via context |
| Scene | size | Zustand | ✅ Has | Add getter |
| Scene | zoom | local hook | ❌ Keep | Keep existing |
| Controls | activeIds | Zustand | ✅ Has | Create alias |
| Controls | trackItemsMap | Zustand | ✅ Has | Create getter |
| Controls | editObject | Zustand | ✅ Has UPDATE_CLIP | Add wrapper |
| Menu | addItems | Zustand dispatch | ✅ Has ADD_CLIP | Add wrapper |

---

## Migration Steps

### Step 1: Extend Engine
**File:** `src/features/editor/engine/engine-core.ts`

Add to UIState:
```typescript
interface UIState {
  // EXISTING:
  selection: string[];
  activeTrackId?: string;
  playheadTime: number;
  zoom: number;
  scrollX: number;
  scrollY: number;
  timelineVisible: boolean;
  
  // NEW:
  viewerZoom: number;      // scene zoom level
  viewerX: number;        // scene pan X
  viewerY: number;       // scene pan Y
  timelineScale: { index: number; zoom: number };  // timeline zoom
  canvasSize: { width: number; height: number };
  canvasBackground: { type: "color"|"image"; value: string };
}
```

Add commands:
```typescript
| { type: "SET_VIEWER_ZOOM"; payload: { zoom: number } }
| { type: "SET_TIMELINE_SCALE"; payload: { index: number; zoom: number } }
| { type: "SET_CANVAS_SIZE"; payload: { width: number; height: number } }
| { type: "SET_CANVAS_BACKGROUND"; payload: { type: "color"|"image"; value: string } }
```

---

### Step 2: Create Engine Context
**New File:** `src/features/editor/engine/engine-context.tsx`

```typescript
import { createContext, useContext, ReactNode } from "react";
import { engineStore, type EngineStore } from "./engine-core";

interface EngineContextValue {
  store: EngineStore;
  // Helper hooks
  useTracks: () => Track[];
  useClip: (id: string) => Clip | undefined;
  useClips: () => Clip[];
  useSelection: () => string[];
  useSequence: () => Sequence;
  usePlayerRef: () => React.MutableRefObject<any>;
}

const EngineContext = createContext<EngineContextValue | null>(null);

export function EngineProvider({ children }: { children: ReactNode }) {
  // Provide all engine helpers
  const value = {
    store: engineStore,
    useTracks: () => {
      const state = engineStore.getState();
      return Object.values(state.tracks);
    },
    useClip: (id: string) => engineStore.getState().clips[id],
    useClips: () => Object.values(engineStore.getState().clips),
    useSelection: () => engineStore.getState().ui.selection,
    useSequence: () => {
      const state = engineStore.getState();
      return state.sequences[state.rootSequenceId];
    },
    usePlayerRef: () => playerRef,
  };
  
  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngine() {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error("useEngine must be used within EngineProvider");
  return ctx;
}
```

---

### Step 3: Wire Player
**File:** `src/features/editor/player/player.tsx`

Before:
```typescript
import useStore from "../store/use-store";
const { setPlayerRef, duration, fps, size, background } = useStore();
```

After:
```typescript
import { useEngine } from "../engine/engine-context";
import { useEffect, useRef } from "react";

const { store, useSequence } = useEngine();
const seq = useSequence();  // from engine
const playerRef = useRef(null);

// Set player ref to engine for control
useEffect(() => {
  // Register player ref for seeking
}, []);

const duration = seq?.duration ?? 1000;
const fps = seq?.fps ?? 30;
const size = seq?.canvas ?? { width: 1080, height: 1920 };
const background = seq?.background ?? { type: "color", value: "#000" };
```

---

### Step 4: Wire Timeline
**File:** `src/features/editor/timeline/timeline.tsx`

Before:
```typescript
const { scale, playerRef, fps, tracks: storeTracks, activeIds: selection, trackItemsMap } = useStore();
```

After:
```typescript
const { store, useTracks, useClips, useSelection } = useEngine();

const tracks = useTracks();           // Engine: Object.values(tracks)
const clips = useClips();          // Engine: Object.values(clips)
const selection = useSelection(); // Engine: ui.selection

// Convert to timeline format
const trackItemsMap = clips.reduce((acc, clip) => {
  acc[clip.id] = clip;
  return acc;
}, {} as Record<string, any>);

// Scale comes from engine UI state or default
const scale = store.getState().ui.timelineScale ?? { index: 7, zoom: 1/300 };
```

---

### Step 5: Wire Scene
**File:** `src/features/editor/scene/scene.tsx`

Before:
```typescript
const { size } = useStore();
const engineClipCount = useEngineSelector(selectClipCount);
```

After:
```typescript
const { store, useSequence, useClips } = useEngine();

const seq = useSequence();
const size = seq?.canvas ?? { width: 1080, height: 1920 };
const clips = useClips();
const hasClips = clips.length > 0;
```

---

### Step 6: Wire Control Panels
**File:** `src/features/editor/control-item/control-item.tsx`

Before:
```typescript
const { activeIds, trackItemsMap } = useStore();
const editClip = (id, changes) => useStore.getState().editObject({[id]: changes});
```

After:
```typescript
import { dispatchToEngine } from "../engine/engine-sync";
import { useEngine } from "../engine/engine-context";

const { store, useClips, useSelection } = useEngine();

const selection = useSelection();
const trackItemsMap = useClips(); // All clips
const activeClip = selection[0] ? store.getState().clips[selection[0]] : null;

const editClip = (id, changes) => {
  dispatchToEngine({
    type: "UPDATE_CLIP",
    payload: { clipId: id, ...changes }
  });
};
```

---

### Step 7: Wire Upload (Menu Items)
**File:** `src/features/editor/menu-item/videos.tsx` etc

Before:
```typescript
import { dispatch } from "../utils/events";
dispatch(ADD_ITEMS, {trackItems: [...], tracks: [...]});
```

After:
```typescript
import { dispatchToEngine, addEngineTrack, addEngineClip } from "../engine/engine-sync";

const handleUpload = async (file) => {
  // Probe file
  const asset = await probeMediaFile(file);
  
  // Create or get track
  let track = tracks.find(t => t.type === "video");
  if (!track) {
    const trackId = addEngineTrack("video", "Video Track");
    track = store.getState().tracks[trackId];
  }
  
  // Add clip to engine
  const clipId = addEngineClip(
    track.id,
    "video",
    { from: 0, to: asset.duration },
    { src: asset.url, name: file.name, ...asset }
  );
};
```

---

### Step 8: Remove Zustand

After all components are wired to Engine, delete Zustand references:

```
DELETE: src/features/editor/store/use-store.ts
DELETE: src/store/upload-store.ts (or rewrite to use engine)
```

---

## File-by-File Changes Summary

| File | Current | Change |
|------|---------|--------|
| `player/player.tsx` | Uses Zustand | Use Engine context |
| `player/composition.tsx` | Uses Zustand | Use Engine context |
| `scene/scene.tsx` | Uses Zustand | Use Engine context |
| `timeline/timeline.tsx` | Uses Zustand | Use Engine context |
| `timeline/header.tsx` | Uses Zustand | Use Engine + context |
| `control-item/control-item.tsx` | Uses Zustand | Use Engine commands |
| `control-item/common/*.tsx` | Uses Zustand | Use Engine |
| `panels/*.tsx` | Uses Zustand | Use Engine |
| `menu-item/*.tsx` | dispatch events | Use Engine commands |
| `editor.tsx` | Uses Zustand | Use Engine provider |
| `store/use-store.ts` | N/A | DELETE after migration |
| `upload-store.ts` | N/A | REWRITE to use Engine |

---

## Diagram

```
BEFORE (Broken):                      AFTER (Fixed):
                    
MenuItem                           MenuItem
    ↓                                ↓
upload-store                    addEngineClip()
    ↓                                ↓
dispatch(EVENTS)                 engineStore.dispatch()
    ↓                                ↓
Zustand ← EMPTY                 engineStore.state ← FILLED
    ↓                                ↓
Timeline reads              Timeline reads
Player reads              Player reads
Scene reads               Scene reads

Components import:               Components use:
useStore()                     useEngine() 
    ↓                                ↓
Empty data ← WRONG               Full data ✓
```

---

## Ready to Proceed?

Once you confirm, I'll execute each step in order:
1. Extend Engine types 
2. Create Engine Context
3. Wire Player
4. Wire Timeline  
5. Wire Scene
6. Wire Controls
7. Wire Uploads
8. Remove Zustand

Should I proceed?