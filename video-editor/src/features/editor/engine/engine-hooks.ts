/**
 * engine-hooks.ts
 * React hooks for editor-engine integration.
 * Uses useSyncExternalStore with stable selectors.
 */

import { useSyncExternalStore, useMemo } from "react";
import { engineStore } from "./engine-core";
import type { Project } from "./engine-core";

function subscribe(callback: () => void): () => void {
  return engineStore.subscribe(() => callback());
}

function getSnapshot(): Project {
  return engineStore.getState();
}

function getServerSnapshot(): Project {
  return engineStore.getState();
}

/**
 * Get the current engine state.
 */
export function useEngineState(): Project {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
}

/**
 * Select a specific slice of engine state.
 * The selector should be stable - wrap in useCallback outside or use the typed selectors below.
 */
export function useEngineSelector<T>(selector: (state: Project) => T): T {
  const state = useEngineState();
  return useMemo(() => selector(state), [state, selector]);
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
  const state = useEngineState();
  return useMemo(() => state.ui.selection ?? [], [state.ui.selection]);
}

/**
 * Get current playhead time from engine.
 */
export function useEnginePlayhead(): number {
  const state = useEngineState();
  return useMemo(() => state.ui.playheadTime ?? 0, [state.ui.playheadTime]);
}

/**
 * Get current zoom from engine.
 */
export function useEngineZoom(): number {
  const state = useEngineState();
  return useMemo(() => state.ui.zoom ?? (1 / 300), [state.ui.zoom]);
}

/**
 * Get all tracks from engine.
 */
export function useEngineTracks() {
  const state = useEngineState();
  return useMemo(() => Object.values(state.tracks), [state.tracks]);
}

/**
 * Get all clips from engine.
 */
export function useEngineClips() {
  const state = useEngineState();
  return useMemo(() => Object.values(state.clips), [state.clips]);
}

/**
 * Get undo/redo state.
 */
export function useEngineHistory() {
  const state = useEngineState();
  return useMemo(() => ({
    canUndo: state.ui.selection.length > 0,
    canRedo: false,
  }), [state.ui.selection]);
}

/**
 * Convenience hook for selection.
 */
export function useEngineSelectedClips() {
  const selection = useEngineSelection();
  const clips = useEngineClips();
  return useMemo(() => 
    selection.map((id) => clips.find((c) => c.id === id)).filter(Boolean),
    [selection, clips]
  );
}

// ─── Layout State Hooks ─────────────────────────────────────────────────────

export function useLayoutState() {
  const state = useEngineState();
  return useMemo(() => ({
    activeMenuItem: state.ui.activeMenuItem ?? null,
    showMenuItem: state.ui.showMenuItem ?? false,
    showControlItem: state.ui.showControlItem ?? false,
    showToolboxItem: state.ui.showToolboxItem ?? false,
    activeToolboxItem: state.ui.activeToolboxItem ?? null,
    floatingControl: state.ui.floatingControl ?? null,
    drawerOpen: state.ui.drawerOpen ?? false,
    controItemDrawerOpen: state.ui.controItemDrawerOpen ?? false,
    typeControlItem: state.ui.typeControlItem ?? "",
    labelControlItem: state.ui.labelControlItem ?? "",
  }), [
    state.ui.activeMenuItem,
    state.ui.showMenuItem,
    state.ui.showControlItem,
    state.ui.showToolboxItem,
    state.ui.activeToolboxItem,
    state.ui.floatingControl,
    state.ui.drawerOpen,
    state.ui.controItemDrawerOpen,
    state.ui.typeControlItem,
    state.ui.labelControlItem,
  ]);
}

// ─── Crop State Hooks ───────────────────────────────────────────────────────

export function useCropState() {
  const state = useEngineState();
  return useMemo(() => ({
    cropTarget: state.ui.cropTarget ?? null,
    cropArea: state.ui.cropArea ?? [0, 0, 0, 0],
    cropSrc: state.ui.cropSrc ?? "",
    cropElement: state.ui.cropElement ?? null,
    cropFileLoading: state.ui.cropFileLoading ?? false,
    cropStep: state.ui.cropStep ?? 0,
    cropScale: state.ui.cropScale ?? 1,
    cropSize: state.ui.cropSize ?? { width: 0, height: 0 },
  }), [
    state.ui.cropTarget,
    state.ui.cropArea,
    state.ui.cropSrc,
    state.ui.cropElement,
    state.ui.cropFileLoading,
    state.ui.cropStep,
    state.ui.cropScale,
    state.ui.cropSize,
  ]);
}

// ─── Download State Hooks ───────────────────────────────────────────────────

export function useDownloadState() {
  const state = useEngineState();
  return useMemo(() => ({
    projectId: state.ui.projectId ?? "",
    exporting: state.ui.exporting ?? false,
    exportType: state.ui.exportType ?? "mp4",
    exportProgress: state.ui.exportProgress ?? 0,
    exportOutput: state.ui.exportOutput ?? null,
    displayProgressModal: state.ui.displayProgressModal ?? false,
  }), [
    state.ui.projectId,
    state.ui.exporting,
    state.ui.exportType,
    state.ui.exportProgress,
    state.ui.exportOutput,
    state.ui.displayProgressModal,
  ]);
}

// ─── Folder State Hooks ─────────────────────────────────────────────────────

export function useFolderState() {
  const state = useEngineState();
  return useMemo(() => ({
    valueFolder: state.ui.valueFolder ?? "",
    folderVideos: state.ui.folderVideos ?? [],
  }), [state.ui.valueFolder, state.ui.folderVideos]);
}

// ─── Upload State Hooks ─────────────────────────────────────────────────────

export function useUploads() {
  const state = useEngineState();
  return useMemo(() => state.uploads ?? [], [state.uploads]);
}

export function useFolders() {
  const state = useEngineState();
  return useMemo(() => state.folders ?? [], [state.folders]);
}

export function useMediaAssets() {
  const state = useEngineState();
  return useMemo(() => state.mediaAssets ?? [], [state.mediaAssets]);
}

export function useShowUploadModal() {
  const state = useEngineState();
  return useMemo(() => state.showUploadModal ?? false, [state.showUploadModal]);
}

// ─── Font State Hooks ───────────────────────────────────────────────────────

export function useFonts() {
  const state = useEngineState();
  return useMemo(() => state.fonts ?? [], [state.fonts]);
}

export function useCompactFonts() {
  const state = useEngineState();
  return useMemo(() => state.compactFonts ?? [], [state.compactFonts]);
}

// ─── Keyframe State Hooks ─────────────────────────────────────────────────

export function useKeyframesByClip() {
  const state = useEngineState();
  return useMemo(() => state.keyframesByClip ?? {}, [state.keyframesByClip]);
}

export function useClipKeyframes(clipId: string) {
  const state = useEngineState();
  return useMemo(() => state.keyframesByClip?.[clipId] ?? {}, [state.keyframesByClip, clipId]);
}

// ─── Runtime Refs ─────────────────────────────────────────────────────────
import type { PlayerRef } from "@remotion/player";
import { useRef, useEffect } from "react";

function getPlayerRefFromState(state: any): PlayerRef | null {
  const stored = state.playerRef;
  if (!stored) return null;
  // Handle both direct PlayerRef and { current: PlayerRef } format
  if (typeof stored === 'object' && 'current' in stored) {
    return stored.current as PlayerRef;
  }
  return stored as PlayerRef;
}

export function usePlayerRef(): PlayerRef | null {
  const state = useEngineState();
  return useMemo(() => getPlayerRefFromState(state), [state.playerRef]);
}

// Hook for code that needs a ref object like { current: PlayerRef }
export function usePlayerRefWrapper(): React.RefObject<PlayerRef> {
  const playerRef = usePlayerRef();
  const ref = useRef<PlayerRef | null>(null);
  
  useEffect(() => {
    ref.current = playerRef;
  }, [playerRef]);
  
  return ref;
}

export function useSceneMoveableRef() {
  const state = useEngineState();
  return useMemo(() => state.sceneMoveableRef ?? null, [state.sceneMoveableRef]);
}

export function useBackground() {
  const state = useEngineState();
  return useMemo(() => state.background ?? { type: "color", value: "transparent" }, [state.background]);
}

export function useViewTimeline() {
  const state = useEngineState();
  return useMemo(() => state.viewTimeline ?? true, [state.viewTimeline]);
}

// ─── Marker Hooks ───────────────────────────────────────────────────────────

export function useTimelineMarkers() {
  const state = useEngineState();
  return useMemo(() => state.timelineMarkers ?? [], [state.timelineMarkers]);
}

export function useMarkerById(id: string) {
  const state = useEngineState();
  return useMemo(() => state.timelineMarkers?.find((m) => m.id === id), [state.timelineMarkers, id]);
}

export function useMarkersInRange(fromMs: number, toMs: number) {
  const state = useEngineState();
  return useMemo(() => (state.timelineMarkers ?? []).filter(
    (m) => m.timeMs >= fromMs && m.timeMs <= toMs
  ), [state.timelineMarkers, fromMs, toMs]);
}

export function useMarkerTimes() {
  const state = useEngineState();
  return useMemo(() => (state.timelineMarkers ?? []).map((m) => m.timeMs), [state.timelineMarkers]);
}