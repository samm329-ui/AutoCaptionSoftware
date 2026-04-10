"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  useRef,
} from "react";
import type { ReactNode } from "react";

import { engineStore, type EditorCommand, type Project } from "./engine-core";
import {
  selectActiveClip,
  selectCanvasSize,
  selectClipCount,
  selectDuration,
  selectHasSelection,
  selectPlayheadTime,
  selectScroll,
  selectSelection,
  selectSelectedClips,
  selectZoom,
} from "./selectors";

const EngineContext = createContext(engineStore);

export function EngineProvider({ children }: { children: ReactNode }) {
  return <EngineContext.Provider value={engineStore}>{children}</EngineContext.Provider>;
}

export function useEngine() {
  return useContext(EngineContext);
}

export function useEngineStore() {
  return useContext(EngineContext);
}

// Stable subscribe function created once
const stableSubscribe = (store: typeof engineStore) => {
  return (onChange: () => void) => store.subscribe(() => onChange());
};

export function useEngineSelector<T>(
  selector: (state: Project) => T,
  _isEqual?: (a: T, b: T) => boolean
): T {
  const store = useEngine();
  
  // Cache the selector in a ref to maintain identity across renders
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  // Use useSyncExternalStore with stable functions
  return useSyncExternalStore(
    stableSubscribe(store),
    useCallback(() => selectorRef.current(store.getState()), [store]),
    useCallback(() => selectorRef.current(store.getState()), [store])
  );
}

export function useEngineDispatch() {
  const store = useEngine();
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

export function useEngineCanvasSize() {
  return useEngineSelector(selectCanvasSize);
}

export function useEngineHistory() {
  const store = useEngine();
  return useEngineSelector(() => ({
    canUndo: store.canUndo,
    canRedo: store.canRedo,
    clipCount: selectClipCount(store.getState()),
    hasSelection: selectHasSelection(store.getState()),
    selectedClips: selectSelectedClips(store.getState()),
  }));
}