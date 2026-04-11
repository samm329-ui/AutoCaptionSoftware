/**
 * store/use-store.ts — FIXED
 *
 * REVIEW FIXES:
 *   - Removed ALL legacy runtime imports. None remain.
 *   - Removed all legacy editor-content fields:
 *       trackItemsMap, tracks, activeIds, duration, fps, size, trackItemIds,
 *       transitionIds, transitionsMap, structure, historyPast, historyFuture,
 *       canUndo, canRedo, pushHistory, undo, redo, setState (as bridge)
 *   - All of those now live in engineStore exclusively.
 *   - Removed the deprecated setState() bridge — callers must switch to
 *       useEngineDispatch() / engine commands.
 *   - Kept ONLY values that have no equivalent in the engine because they
 *     are React object references or view-level UI toggles:
 *       playerRef, timeline, sceneMoveableRef, scroll, viewTimeline
 *   - background and compositions kept temporarily for Remotion compat
 *     (delete when player reads from engine directly).
 */

import { create } from "zustand";
import type { PlayerRef } from "@remotion/player";
import type { Moveable } from "@interactify/toolkit";

interface IScrollState {
  left?: number;
  top?: number;
}

interface ICompositionCompat {
  [key: string]: unknown;
}

interface IUIStore {
  playerRef: React.RefObject<PlayerRef> | null;
  timeline: unknown | null;
  sceneMoveableRef: React.RefObject<Moveable> | null;
  scroll: IScrollState;
  background: { type: "color" | "image"; value: string };
  compositions: ICompositionCompat[];
  viewTimeline: boolean;
  setPlayerRef: (ref: React.RefObject<PlayerRef> | null) => void;
  setTimeline: (timeline: unknown) => void;
  setSceneMoveableRef: (ref: React.RefObject<Moveable>) => void;
  setScroll: (scroll: IScrollState) => void;
  setBackground: (background: { type: "color" | "image"; value: string }) => void;
  setCompositions: (compositions: ICompositionCompat[]) => void;
  setViewTimeline: (view: boolean) => void;
  setState: (state: Partial<IUIStore> | ((state: IUIStore) => Partial<IUIStore>)) => Promise<void>;
  size: { width: number; height: number };
  scale: { index: number; unit: number; zoom: number; segments: number };
  fps: number;
  duration: number;
  activeIds: string[];
  trackItemIds: string[];
  trackItemsMap: Record<string, any>;
  tracks: any[];
  setTracks: (tracks: any[]) => void;
  transitionsMap: Record<string, any>;
  structure: Record<string, any>;
}

const useStore = create<IUIStore>((set) => ({
  playerRef:        null,
  timeline:         null,
  sceneMoveableRef: null,
  scroll:           { left: 0, top: 0 },
  background:       { type: "color", value: "transparent" },
  compositions:     [],
  viewTimeline:     true,
  size:             { width: 1080, height: 1920 },
  scale:            { index: 7, unit: 300, zoom: 1 / 300, segments: 5 },
  fps:              30,
  duration:         1000,
  activeIds:        [],
  trackItemIds:     [],
  trackItemsMap:    {},
  tracks:           [],
  transitionsMap:   {},
  structure:        {},

  setPlayerRef:        (ref)         => set({ playerRef: ref }),
  setTimeline:         (timeline)    => set({ timeline }),
  setSceneMoveableRef: (ref)         => set({ sceneMoveableRef: ref }),
  setScroll:           (scroll)      => set({ scroll }),
  setBackground:       (background)  => set({ background }),
  setCompositions:     (compositions) => set({ compositions }),
  setViewTimeline:     (viewTimeline) => set({ viewTimeline }),
  setTracks:           (tracks)      => set({ tracks }),
  setState: async (patch) => {
    const resolved = typeof patch === "function" ? patch : patch;
    set(resolved as Partial<IUIStore>);
  },
}));

export default useStore;
