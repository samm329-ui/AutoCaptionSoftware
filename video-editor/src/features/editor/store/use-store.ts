import { create } from "zustand";
import type { PlayerRef } from "@remotion/player";
import type { Moveable } from "@interactify/toolkit";

export const EDIT_OBJECT = "EDIT_OBJECT";
export const ADD_ANIMATION = "ADD_ANIMATION";
export const ADD_ITEMS = "ADD_ITEMS";
export const LAYER_DELETE = "LAYER_DELETE";
export const ADD_TRACK = "ADD_TRACK";

let idCounter = 0;
export const generateId = () => `id-${Date.now()}-${++idCounter}`;

interface IScrollState {
  left?: number;
  top?: number;
}

interface ICompositionCompat {
  [key: string]: unknown;
}

interface IAnimation {
  name: string;
  composition: Array<{
    durationInFrames: number;
    [key: string]: unknown;
  }>;
}

export interface ITrackItem {
  id: string;
  type: string;
  name?: string;
  display: { from: number; to: number };
  trim: { from: number; to: number };
  details: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  animations?: {
    in?: IAnimation;
    out?: IAnimation;
    loop?: IAnimation;
  };
  [key: string]: unknown;
}

interface ITrack {
  id: string;
  type: string;
  name?: string;
  items: string[];
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
  size: { width: number; height: number };
  scale: { index: number; unit: number; zoom: number; segments: number };
  fps: number;
  duration: number;
  activeIds: string[];
  trackItemIds: string[];
  trackItemsMap: Record<string, ITrackItem>;
  tracks: ITrack[];
  transitionsMap: Record<string, unknown>;
  structure: Record<string, unknown>;

  setPlayerRef: (ref: React.RefObject<PlayerRef> | null) => void;
  setTimeline: (timeline: unknown) => void;
  setSceneMoveableRef: (ref: React.RefObject<Moveable>) => void;
  setScroll: (scroll: IScrollState) => void;
  setBackground: (background: { type: "color" | "image"; value: string }) => void;
  setCompositions: (compositions: ICompositionCompat[]) => void;
  setViewTimeline: (view: boolean) => void;
  setTracks: (tracks: ITrack[]) => void;
  setState: (state: Partial<IUIStore> | ((state: IUIStore) => Partial<IUIStore>)) => Promise<void>;
  editObject: (payload: Record<string, Partial<ITrackItem>>) => void;
  addAnimation: (payload: { id: string; animations: { in?: IAnimation; out?: IAnimation } }) => void;
  addItems: (payload: { trackItems: ITrackItem[]; tracks: { id: string; items: string[]; type: string }[] }) => void;
  layerDelete: (payload: { trackItemIds: string[] }) => void;
  addTrack: (payload: { id: string; type: string; items: string[] }) => void;
}

const useStore = create<IUIStore>((set, get) => ({
  playerRef: null,
  timeline: null,
  sceneMoveableRef: null,
  scroll: { left: 0, top: 0 },
  background: { type: "color", value: "transparent" },
  compositions: [],
  viewTimeline: true,
  size: { width: 1080, height: 1920 },
  scale: { index: 7, unit: 300, zoom: 1 / 300, segments: 5 },
  fps: 30,
  duration: 1000,
  activeIds: [],
  trackItemIds: [],
  trackItemsMap: {},
  tracks: [],
  transitionsMap: {},
  structure: {},

  setPlayerRef: (ref) => set({ playerRef: ref }),
  setTimeline: (timeline) => set({ timeline }),
  setSceneMoveableRef: (ref) => set({ sceneMoveableRef: ref }),
  setScroll: (scroll) => set({ scroll }),
  setBackground: (background) => set({ background }),
  setCompositions: (compositions) => set({ compositions }),
  setViewTimeline: (viewTimeline) => set({ viewTimeline }),
  setTracks: (tracks) => set({ tracks }),
  setState: async (patch) => {
    const current = get();
    const resolved = typeof patch === "function" ? patch(current) : patch;
    set(resolved as Partial<IUIStore>);
  },
  editObject: (payload) => {
    const { trackItemsMap } = get();
    const updated = { ...trackItemsMap };
    Object.entries(payload).forEach(([id, changes]) => {
      if (updated[id]) {
        updated[id] = { ...updated[id], ...changes };
      }
    });
    set({ trackItemsMap: updated });
  },
  addAnimation: (payload) => {
    const { trackItemsMap } = get();
    const item = trackItemsMap[payload.id];
    if (!item) return;
    const updated = { ...trackItemsMap };
    updated[payload.id] = {
      ...item,
      animations: {
        ...item.animations,
        ...payload.animations
      }
    };
    set({ trackItemsMap: updated });
  },
  addItems: (payload) => {
    const { trackItemsMap, trackItemIds, tracks } = get();
    const newTrackItems = payload.trackItems;
    const newTrackItemIds = newTrackItems.map(t => t.id);
    const updatedTrackItemsMap = { ...trackItemsMap };
    newTrackItems.forEach(item => {
      updatedTrackItemsMap[item.id] = item;
    });
    const newTracks = payload.tracks.map(t => ({
      id: t.id,
      type: t.type,
      name: t.type,
      items: t.items
    }));
    set({
      trackItemsMap: updatedTrackItemsMap,
      trackItemIds: [...trackItemIds, ...newTrackItemIds],
      tracks: [...tracks, ...newTracks]
    });
  },
  layerDelete: (payload) => {
    const { trackItemsMap, trackItemIds, tracks } = get();
    const idsToDelete = new Set(payload.trackItemIds);
    const updatedTrackItemsMap = { ...trackItemsMap };
    Object.keys(updatedTrackItemsMap).forEach(id => {
      if (idsToDelete.has(id)) {
        delete updatedTrackItemsMap[id];
      }
    });
    set({ trackItemsMap: updatedTrackItemsMap });
  },
  addTrack: (payload) => {
    const { tracks } = get();
    set({
      tracks: [...tracks, { id: payload.id, type: payload.type, name: payload.type, items: payload.items }]
    });
  },
}));

export default useStore;