/**
 * engine-hooks.ts
 * React hooks for editor-engine integration.
 * Uses useSyncExternalStore for React 19 compatibility.
 */

import { useSyncExternalStore } from "react";
import { engineStore, createEmptyProject } from "./engine-core";
import type { Project } from "./engine-core";

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

/**
 * Select a specific slice of engine state.
 */
export function useEngineSelector<T>(selector: (state: Project) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(engineStore.getState()),
    () => selector(EMPTY_PROJECT)
  );
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
  return useEngineSelector((state) => Object.values(state.tracks));
}

/**
 * Get all clips from engine.
 */
export function useEngineClips() {
  return useEngineSelector((state) => Object.values(state.clips));
}

/**
 * Get undo/redo state.
 */
export function useEngineHistory() {
  return useEngineSelector((state) => ({
    canUndo: state.ui.selection.length > 0, // Simplified
    canRedo: false,
  }));
}

/**
 * Dispatch command to engine.
 */
import { useCallback } from "react";
import type { EditorCommand } from "./engine-core";

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