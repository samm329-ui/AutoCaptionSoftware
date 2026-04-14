"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";

import { engineStore, type EditorCommand, type Project } from "./engine-core";
import {
  selectActiveClip,
  selectAllClips,
  selectOrderedTracks,
  selectSelection,
  selectZoom,
  selectScroll,
  selectPlayheadTime,
  selectDuration,
  selectFps,
  selectCanvasSize,
  selectActiveSequence,
} from "./selectors";

const EngineContext = createContext<typeof engineStore | null>(null);

export function EngineProvider({ children }: { children: ReactNode }) {
  return <EngineContext.Provider value={engineStore}>{children}</EngineContext.Provider>;
}

export function useEngine() {
  return useContext(EngineContext);
}

export function useEngineStore() {
  return useContext(EngineContext);
}

export function useEngineSelector<T>(selector: (state: Project) => T): T {
  const store = useContext(EngineContext);
  const [value, setValue] = useState<T>(() => {
    // Initial value
    if (!store) return selector({} as Project);
    try {
      return selector(store.getState());
    } catch {
      return selector({} as Project);
    }
  });

  // Cache selector in ref
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  // Subscribe to store changes
  useEffect(() => {
    if (!store) return;

    const unsubscribe = store.subscribe(() => {
      try {
        const newValue = selectorRef.current(store.getState());
        setValue(newValue);
      } catch (e) {
        // Ignore errors during state updates
      }
    });

    return unsubscribe;
  }, [store]);

  return value;
}

export function useEngineDispatch() {
  const store = useContext(EngineContext);
  if (!store) {
    return (_command: EditorCommand) => {};
  }
  return useCallback((command: EditorCommand, opts?: { skipHistory?: boolean }) => {
    store.dispatch(command, opts);
  }, [store]);
}

export function useEngineSelection() {
  return useEngineSelector(selectSelection);
}

export function useEngineActiveId() {
  return useEngineSelector((state) => selectActiveClip(state)?.id ?? null);
}

export function useEnginePlayhead() {
  return useEngineSelector(selectPlayheadTime);
}

export function useEngineZoom() {
  return useEngineSelector(selectZoom);
}

export function useEngineScroll() {
  return useEngineSelector(selectScroll);
}

export function useEngineDuration() {
  return useEngineSelector(selectDuration);
}

// New: Get timeline duration based on actual clips (not sequence)
export function useTimelineDuration() {
  const clips = useEngineSelector(selectAllClips);
  const tracks = useEngineSelector(selectOrderedTracks);
  
  // If no clips, default to 10 seconds
  if (clips.length === 0) return 10000;
  
  // Find max clip end time across all tracks
  const maxEnd = Math.max(...clips.map(c => c.display.to));
  // Add 2 seconds buffer
  return maxEnd + 2000;
}

export function useEngineFps() {
  return useEngineSelector(selectFps);
}

export function useEngineCanvasSize() {
  return useEngineSelector(selectCanvasSize);
}

export function useEngineHistory() {
  const store = useContext(EngineContext);
  return useEngineSelector(() => ({
    canUndo: store?.canUndo ?? false,
    canRedo: store?.canRedo ?? false,
    clipCount: selectClipCount(store?.getState() ?? {} as Project),
    hasSelection: selectHasSelection(store?.getState() ?? {} as Project),
    selectedClips: selectSelectedClips(store?.getState() ?? {} as Project),
  }));
}