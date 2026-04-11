/**
 * engine-sync.ts
 * Synchronizes editor-engine state with Zustand store.
 * This enables gradual migration while maintaining backward compatibility.
 */

import { useEffect } from "react";
import useStore from "../store/use-store";
import { engineStore, type Project, type EditorCommand } from "./engine-core";

let syncEnabled = false;

/**
 * Enable the engine sync - call once during app initialization.
 */
export function enableEngineBridge() {
  syncEnabled = true;
}

/**
 * Check if engine bridge is enabled.
 */
export function isEngineBridgeEnabled() {
  return syncEnabled;
}

/**
 * Sync Zustand state to engine.
 */
export function syncToEngine(design: Record<string, unknown>) {
  if (!syncEnabled) return;

  const project = engineStore.getState();
  
  const tracks = design.tracks as Project["tracks"] | undefined;
  const trackItemsMap = design.trackItemsMap as Project["clips"] | undefined;
  const activeIds = design.activeIds as string[] | undefined;
  const size = design.size as { width: number; height: number } | undefined;
  
  if (tracks || trackItemsMap || activeIds) {
    engineStore.dispatch({
      type: "LOAD_PROJECT",
      payload: {
        project: {
          ...project,
          tracks: tracks ?? project.tracks,
          clips: trackItemsMap ?? project.clips,
          ui: {
            ...project.ui,
            selection: activeIds ?? project.ui.selection,
          },
          sequences: size ? {
            [project.rootSequenceId]: {
              ...project.sequences[project.rootSequenceId],
              canvas: size,
            },
          } : project.sequences,
        },
      },
    });
  }
}

/**
 * Sync engine state back to Zustand.
 */
export function syncFromEngine() {
  if (!syncEnabled) return;
  
  const engineState = engineStore.getState();
  const zustandState = useStore.getState();
  
  const engineTracks = Object.values(engineState.tracks);
  if (engineTracks.length > 0) {
    zustandState.setState({ tracks: engineTracks as any });
  }
  
  const engineClips = engineState.clips;
  const engineClipIds = Object.keys(engineClips);
  if (engineClipIds.length > 0) {
    zustandState.setState({
      trackItemsMap: engineClips as any,
      trackItemIds: engineClipIds,
    });
  }
  
  if (engineState.ui.selection !== zustandState.activeIds) {
    zustandState.setState({ activeIds: engineState.ui.selection });
  }
}

/**
 * Hook to initialize engine sync.
 * Call this in a component during app initialization.
 */
export function useEngineSync() {
  useEffect(() => {
    if (!syncEnabled) return;
    
    const unsubscribe = engineStore.subscribe(() => {
      syncFromEngine();
    });
    
    return unsubscribe;
  }, []);
}

/**
 * Dispatch a command directly to the engine.
 */
export function dispatchToEngine(command: EditorCommand) {
  if (!syncEnabled) return false;
  engineStore.dispatch(command);
  return true;
}

/**
 * Add a track to the engine.
 */
export function addEngineTrack(type: "video" | "audio" | "text" | "caption" | "overlay", name?: string) {
  const track = {
    id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    name: name ?? type.charAt(0).toUpperCase() + type.slice(1),
    order: 0,
    locked: false,
    muted: false,
    hidden: false,
    clipIds: [],
  };
  
  dispatchToEngine({
    type: "ADD_TRACK",
    payload: { track },
  });
  
  return track.id;
}

/**
 * Add a clip to the engine.
 */
export function addEngineClip(
  trackId: string,
  type: "video" | "audio" | "image" | "text" | "caption",
  display: { from: number; to: number },
  details?: Record<string, unknown>
) {
  const clip = {
    id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    trackId,
    name: type,
    display,
    trim: { from: 0, to: display.to - display.from },
    transform: {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotate: 0,
      opacity: 1,
      flipX: false,
      flipY: false,
    },
    details: details ?? {},
    effectIds: [],
    keyframeIds: [],
  };
  
  dispatchToEngine({
    type: "ADD_CLIP",
    payload: { clip, trackId },
  });
  
  return clip.id;
}

/**
 * Move a clip in the engine.
 */
export function moveEngineClip(clipId: string, newStart: number, newTrackId?: string) {
  dispatchToEngine({
    type: "MOVE_CLIP",
    payload: { clipId, newStart, newTrackId },
  });
}

/**
 * Delete clips from the engine.
 */
export function deleteEngineClips(clipIds: string[]) {
  dispatchToEngine({
    type: "DELETE_CLIP",
    payload: { clipIds },
  });
}

/**
 * Set selection in the engine.
 */
export function setEngineSelection(clipIds: string[]) {
  dispatchToEngine({
    type: "SET_SELECTION",
    payload: { clipIds },
  });
}

/**
 * Set playhead position.
 */
export function setEnginePlayhead(timeMs: number) {
  dispatchToEngine({
    type: "SET_PLAY_HEAD",
    payload: { timeMs },
  });
}

/**
 * Undo last action.
 */
export function undoEngine() {
  if (syncEnabled) engineStore.undo();
}

/**
 * Redo last undone action.
 */
export function redoEngine() {
  if (syncEnabled) engineStore.redo();
}

/**
 * Get engine store for direct access.
 */
export function getEngineStore() {
  return engineStore;
}