import Timeline from "@designcombo/timeline";
import {
  IComposition,
  ISize,
  ITimelineScaleState,
  ITimelineScrollState,
  ITrack,
  ITrackItem,
  ITransition,
  ItemStructure
} from "@designcombo/types";
import { Moveable } from "@interactify/toolkit";
import { PlayerRef } from "@remotion/player";
import { create } from "zustand";

interface ITimelineStore {
  duration: number;
  fps: number;
  scale: ITimelineScaleState;
  scroll: ITimelineScrollState;
  size: ISize;
  tracks: ITrack[];
  trackItemIds: string[];
  transitionIds: string[];
  transitionsMap: Record<string, ITransition>;
  trackItemsMap: Record<string, ITrackItem>;
  structure: ItemStructure[];
  activeIds: string[];
  timeline: Timeline | null;
  setTimeline: (timeline: Timeline) => void;
  setScale: (scale: ITimelineScaleState) => void;
  setScroll: (scroll: ITimelineScrollState) => void;
  playerRef: React.RefObject<PlayerRef> | null;
  setPlayerRef: (playerRef: React.RefObject<PlayerRef> | null) => void;

  sceneMoveableRef: React.RefObject<Moveable> | null;
  setSceneMoveableRef: (ref: React.RefObject<Moveable>) => void;
  setState: (
    state:
      | Partial<ITimelineStore>
      | ((state: ITimelineStore) => Partial<ITimelineStore>)
  ) => Promise<void>;
  compositions: Partial<IComposition>[];
  setCompositions: (compositions: Partial<IComposition>[]) => void;

  background: {
    type: "color" | "image";
    value: string;
  };
  viewTimeline: boolean;
  setViewTimeline: (viewTimeline: boolean) => void;

  // Undo/Redo
  historyPast: any[];
  historyFuture: any[];
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_HISTORY = 120;

function cloneState(state: any) {
  try {
    return structuredClone(state);
  } catch {
    return JSON.parse(JSON.stringify(state));
  }
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function mergeTrackItem(existing: ITrackItem | undefined, patch: any): ITrackItem {
  if (!existing) return patch as ITrackItem;

  return {
    ...existing,
    ...patch,
    details: {
      ...(isPlainObject((existing as any).details) ? (existing as any).details : {}),
      ...(isPlainObject(patch?.details) ? patch.details : {})
    },
    display: {
      ...(isPlainObject((existing as any).display) ? (existing as any).display : {}),
      ...(isPlainObject(patch?.display) ? patch.display : {})
    },
    trim: {
      ...(isPlainObject((existing as any).trim) ? (existing as any).trim : {}),
      ...(isPlainObject(patch?.trim) ? patch.trim : {})
    }
  };
}

function mergeTrackItemsMap(
  current: Record<string, ITrackItem>,
  patch: Record<string, any>
): Record<string, ITrackItem> {
  const next: Record<string, ITrackItem> = { ...current };

  for (const [id, itemPatch] of Object.entries(patch)) {
    if (!isPlainObject(itemPatch)) continue;
    next[id] = mergeTrackItem(current[id], itemPatch);
  }

  return next;
}

const useStore = create<ITimelineStore>((set, get) => ({
  compositions: [],
  structure: [],
  setCompositions: (compositions) => set({ compositions }),
  size: {
    width: 1080,
    height: 1920
  },

  background: {
    type: "color",
    value: "transparent"
  },
  viewTimeline: true,
  setViewTimeline: (viewTimeline) => set({ viewTimeline }),

  timeline: null,
  duration: 1000,
  fps: 30,
  scale: {
    index: 7,
    unit: 300,
    zoom: 1 / 300,
    segments: 5
  },
  scroll: {
    left: 0,
    top: 0
  },
  playerRef: null,

  activeIds: [],
  targetIds: [],
  tracks: [],
  trackItemIds: [],
  transitionIds: [],
  transitionsMap: {},
  trackItemsMap: {},
  sceneMoveableRef: null,

  // Undo/Redo state
  historyPast: [],
  historyFuture: [],
  canUndo: false,
  canRedo: false,

  pushHistory: () => {
    const state = get();
    const snapshot = cloneState({
      tracks: state.tracks,
      trackItemIds: state.trackItemIds,
      transitionIds: state.transitionIds,
      transitionsMap: state.transitionsMap,
      trackItemsMap: state.trackItemsMap,
      structure: state.structure,
      activeIds: state.activeIds,
      duration: state.duration,
    });
    set({
      historyPast: [...state.historyPast, snapshot].slice(-MAX_HISTORY),
      historyFuture: [],
      canUndo: true,
      canRedo: false,
    });
  },

  undo: () => {
    const state = get();
    if (state.historyPast.length === 0) return;
    
    const currentSnapshot = cloneState({
      tracks: state.tracks,
      trackItemIds: state.trackItemIds,
      transitionIds: state.transitionIds,
      transitionsMap: state.transitionsMap,
      trackItemsMap: state.trackItemsMap,
      structure: state.structure,
      activeIds: state.activeIds,
      duration: state.duration,
    });
    
    const previous = state.historyPast[state.historyPast.length - 1];
    set({
      ...previous,
      historyPast: state.historyPast.slice(0, -1),
      historyFuture: [currentSnapshot, ...state.historyFuture].slice(0, MAX_HISTORY),
      canUndo: state.historyPast.length > 1,
      canRedo: true,
    });
  },

  redo: () => {
    const state = get();
    if (state.historyFuture.length === 0) return;
    
    const currentSnapshot = cloneState({
      tracks: state.tracks,
      trackItemIds: state.trackItemIds,
      transitionIds: state.transitionIds,
      transitionsMap: state.transitionsMap,
      trackItemsMap: state.trackItemsMap,
      structure: state.structure,
      activeIds: state.activeIds,
      duration: state.duration,
    });
    
    const next = state.historyFuture[0];
    set({
      ...next,
      historyPast: [...state.historyPast, currentSnapshot].slice(-MAX_HISTORY),
      historyFuture: state.historyFuture.slice(1),
      canUndo: true,
      canRedo: state.historyFuture.length > 1,
    });
  },

  setTimeline: (timeline: Timeline) =>
    set(() => ({
      timeline: timeline
    })),
  setScale: (scale: ITimelineScaleState) =>
    set(() => ({
      scale: scale
    })),
  setScroll: (scroll: ITimelineScrollState) =>
    set(() => ({
      scroll: scroll
    })),
  setState: async (patch) => {
    const resolvedPatch =
      typeof patch === "function" ? patch(get()) : patch;

    if (!resolvedPatch || typeof resolvedPatch !== "object") return;

    set((state) => {
      const next: Record<string, any> = { ...resolvedPatch };

      if ("trackItemsMap" in resolvedPatch && resolvedPatch.trackItemsMap) {
        next.trackItemsMap = mergeTrackItemsMap(
          state.trackItemsMap,
          resolvedPatch.trackItemsMap as Record<string, any>
        );
      }

      if ("transitionsMap" in resolvedPatch && resolvedPatch.transitionsMap) {
        next.transitionsMap = {
          ...state.transitionsMap,
          ...(resolvedPatch.transitionsMap as Record<string, ITransition>)
        };
      }

      return next as Partial<ITimelineStore>;
    });
  },
  setPlayerRef: (playerRef: React.RefObject<PlayerRef> | null) =>
    set({ playerRef }),
  setSceneMoveableRef: (ref) => set({ sceneMoveableRef: ref })
}));

export default useStore;
