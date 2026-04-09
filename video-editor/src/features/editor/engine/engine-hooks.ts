/**
 * engine-hooks.ts
 * React hooks for editor-engine integration.
 * Uses useSyncExternalStore for React 19 compatibility.
 * 
 * Note: This file provides standalone hooks. For most use cases,
 * import from engine-provider.tsx which provides the same hooks
 * with proper caching.
 */

import { useSyncExternalStore, useRef, useCallback } from "react";
import { engineStore, createEmptyProject } from "./engine-core";
import type { Project, EditorCommand } from "./engine-core";

const EMPTY_PROJECT = createEmptyProject();

function getServerSnapshot(): Project {
  return engineStore.getState();
}

function subscribe(callback: () => void): () => void {
  return engineStore.subscribe(() => callback());
}

/**
 * Get the current engine state.
 */
export function useEngineState(): Project {
  return useSyncExternalStore(
    subscribe,
    () => engineStore.getState(),
    getServerSnapshot
  );
}

// Cache for selectors
const selectorCache = new WeakMap<(state: Project) => unknown, { value: unknown }>();

/**
 * Select a specific slice of engine state.
 * Note: For array selectors, use shallowArrayEqual as second argument.
 */
export function useEngineSelector<T>(
  selector: (state: Project) => T,
  isEqual?: (a: T, b: T) => boolean
): T {
  const cacheRef = useRef<{ value: T } | null>(null);
  const selectorRef = useRef(selector);
  const isEqualRef = useRef(isEqual);
  selectorRef.current = selector;
  isEqualRef.current = isEqual;

  const getSnapshot = useCallback((): T => {
    const next = selectorRef.current(engineStore.getState());

    if (cacheRef.current !== null) {
      const prev = cacheRef.current.value;
      const equal = isEqualRef.current 
        ? isEqualRef.current(prev as T, next) 
        : Object.is(prev, next);
      if (equal) return prev;
    }

    cacheRef.current = { value: next };
    return next;
  }, []);

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );
}

// Shallow array comparison helper
function shallowArrayEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Get current selection from engine.
 */
export function useEngineSelection(): string[] {
  return useEngineSelector((state) => state.ui.selection);
}

/**
 * Get current playhead time from engine.
 */
export function useEnginePlayhead(): number {
  return useEngineSelector((state) => state.ui.playheadTime);
}

/**
 * Get current zoom from engine.
 */
export function useEngineZoom(): number {
  return useEngineSelector((state) => state.ui.zoom);
}

/**
 * Get all tracks from engine.
 */
export function useEngineTracks() {
  return useEngineSelector((state) => Object.values(state.tracks), shallowArrayEqual);
}

/**
 * Get all clips from engine.
 */
export function useEngineClips() {
  return useEngineSelector((state) => Object.values(state.clips), shallowArrayEqual);
}

/**
 * Get undo/redo state.
 */
export function useEngineHistory() {
  return useEngineSelector((state) => ({
    canUndo: state.ui.selection.length > 0,
    canRedo: false,
  }));
}

/**
 * Dispatch command to engine.
 */
export function useEngineDispatch() {
  return useCallback((command: EditorCommand) => {
    engineStore.dispatch(command);
  }, []);
}

/**
 * Convenience hook for selection.
 */
export function useEngineSelectedClips() {
  const selection = useEngineSelection();
  const clips = useEngineClips();
  return selection.map((id) => clips.find((c) => c.id === id)).filter(Boolean);
}