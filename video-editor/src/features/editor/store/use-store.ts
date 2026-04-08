import Timeline from "@designcombo/timeline";
import {
  IComposition,
  ISize,
  ITimelineScaleState,
  ITimelineScrollState,
  ITrack,
  ITrackItem,
  ITransition,
  ItemStructure,
} from "@designcombo/types";
import { Moveable } from "@interactify/toolkit";
import { PlayerRef } from "@remotion/player";
import { create } from "zustand";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ITimelineStore {
  // ── Editor content (source of truth for actual video edit) ──────────────────
  // RULE: Everything below belongs to the editor, NOT to UI.
  // Never duplicate these values in any other store.
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
  // activeIds: which clip(s) are currently selected
  activeIds: string[];
  background: { type: "color" | "image"; value: string };
  compositions: Partial<IComposition>[];

  // ── Infrastructure references ────────────────────────────────────────────────
  timeline: Timeline | null;
  playerRef: React.RefObject<PlayerRef> | null;
  sceneMoveableRef: React.RefObject<Moveable> | null;

  // ── UI-adjacent toggles (these are acceptable in this store because they
  //    directly affect rendering, not editing) ──────────────────────────────────
  viewTimeline: boolean;

  // ── Undo / Redo ──────────────────────────────────────────────────────────────
  historyPast: any[];
  historyFuture: any[];
  canUndo: boolean;
  canRedo: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────────
  setState: (
    state:
      | Partial<ITimelineStore>
      | ((state: ITimelineStore) => Partial<ITimelineStore>)
  ) => Promise<void>;
  setTimeline: (timeline: Timeline) => void;
  setScale: (scale: ITimelineScaleState) => void;
  setScroll: (scroll: ITimelineScrollState) => void;
  setPlayerRef: (playerRef: React.RefObject<PlayerRef> | null) => void;
  setSceneMoveableRef: (ref: React.RefObject<Moveable>) => void;
  setCompositions: (compositions: Partial<IComposition>[]) => void;
  setViewTimeline: (viewTimeline: boolean) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

const MAX_HISTORY = 120;

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// FIXED: Deep-merge a single ITrackItem so that nested `details`, `display`,
// and `trim` fields are merged rather than replaced.
// Previously a shallow spread would nuke sibling keys inside `details`.
function mergeTrackItem(existing: ITrackItem | undefined, patch: any): ITrackItem {
  if (!existing) return patch as ITrackItem;
  return {
    ...existing,
    ...patch,
    details: {
      ...(isPlainObject((existing as any).details) ? (existing as any).details : {}),
      ...(isPlainObject(patch?.details) ? patch.details : {}),
    },
    display: {
      ...(isPlainObject((existing as any).display) ? (existing as any).display : {}),
      ...(isPlainObject(patch?.display) ? patch.display : {}),
    },
    trim: {
      ...(isPlainObject((existing as any).trim) ? (existing as any).trim : {}),
      ...(isPlainObject(patch?.trim) ? patch.trim : {}),
    },
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

// ─── Store ─────────────────────────────────────────────────────────────────────
const useStore = create<ITimelineStore>((set, get) => ({
  compositions: [],
  structure: [],
  setCompositions: (compositions) => set({ compositions }),

  size: { width: 1080, height: 1920 },
  background: { type: "color", value: "transparent" },
  viewTimeline: true,
  setViewTimeline: (viewTimeline) => set({ viewTimeline }),

  timeline: null,
  duration: 1000,
  fps: 30,
  scale: { index: 7, unit: 300, zoom: 1 / 300, segments: 5 },
  scroll: { left: 0, top: 0 },
  playerRef: null,

  activeIds: [],
  tracks: [],
  trackItemIds: [],
  transitionIds: [],
  transitionsMap: {},
  trackItemsMap: {},
  sceneMoveableRef: null,

  // Undo / Redo
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

  setTimeline: (timeline) => set({ timeline }),
  setScale: (scale) => set({ scale }),
  setScroll: (scroll) => set({ scroll }),
  setPlayerRef: (playerRef) => set({ playerRef }),
  setSceneMoveableRef: (ref) => set({ sceneMoveableRef: ref }),

  // FIXED: setState performs a smart deep merge.
  // - trackItemsMap patches are merged per-item (not full replacement)
  // - transitionsMap entries are merged shallowly
  // - All other keys are shallow-merged at the top level
  // This prevents partial updates (e.g. editing clip position) from
  // accidentally wiping out sibling fields like `trim` or `display`.
  setState: async (patch) => {
    const resolvedPatch = typeof patch === "function" ? patch(get()) : patch;
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
          ...(resolvedPatch.transitionsMap as Record<string, ITransition>),
        };
      }

      return next as Partial<ITimelineStore>;
    });
  },
}));

export default useStore;
