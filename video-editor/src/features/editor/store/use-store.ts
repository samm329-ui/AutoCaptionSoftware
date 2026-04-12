/**
 * store/use-store.ts — UI-ONLY RUNTIME STATE
 *
 * This store no longer owns any project data (tracks, clips, timeline).
 * All project state is owned by the engine (engine-core.ts).
 *
 * What remains here:
 *   - playerRef        : runtime ref to the Remotion player
 *   - sceneMoveableRef : runtime ref to the Moveable instance
 *   - scroll           : timeline scroll position (pure UI)
 *   - scale            : timeline zoom/scale (UI, mirrors engine zoom)
 *   - background       : canvas background (kept for legacy player compat)
 *   - viewTimeline     : panel visibility toggle
 *
 * Project fields that have been removed:
 *   - trackItemIds     (→ engine: selectAllClips)
 *   - trackItemsMap    (→ engine: clips record)
 *   - tracks           (→ engine: selectOrderedTracks)
 *   - activeIds        (→ engine: ui.selection)
 *   - duration         (→ engine: selectDuration)
 *   - fps              (→ engine: selectFps)
 *   - size             (→ engine: selectCanvasSize)
 */

import { create } from "zustand";
import type { PlayerRef } from "@remotion/player";
import type { Moveable } from "@interactify/toolkit";

// Re-export legacy constants so existing imports don't break
export const EDIT_OBJECT   = "EDIT_OBJECT";
export const ADD_ANIMATION = "ADD_ANIMATION";
export const ADD_ITEMS     = "ADD_ITEMS";
export const LAYER_DELETE  = "LAYER_DELETE";
export const ADD_TRACK     = "ADD_TRACK";

let idCounter = 0;
export const generateId = () => `id-${Date.now()}-${++idCounter}`;

// ITrackItem is kept as a type export so existing casts compile
export interface ITrackItem {
  id: string;
  type: string;
  name?: string;
  display: { from: number; to: number };
  trim: { from: number; to: number };
  details: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface IScrollState {
  left?: number;
  top?: number;
}

interface IUIStore {
  // ── Runtime refs (not project data) ─────────────────────────────────────────
  playerRef: React.RefObject<PlayerRef> | null;
  sceneMoveableRef: React.RefObject<Moveable> | null;

  // ── Pure UI state ────────────────────────────────────────────────────────────
  scroll:        IScrollState;
  scale:         { index: number; unit: number; zoom: number; segments: number };
  background:    { type: "color" | "image"; value: string };
  viewTimeline:  boolean;

  // ── Setters ──────────────────────────────────────────────────────────────────
  setPlayerRef:        (ref: React.RefObject<PlayerRef> | null) => void;
  setSceneMoveableRef: (ref: React.RefObject<Moveable>) => void;
  setScroll:           (scroll: IScrollState) => void;
  setBackground:       (background: { type: "color" | "image"; value: string }) => void;
  setViewTimeline:     (view: boolean) => void;
}

const useStore = create<IUIStore>((set) => ({
  playerRef:        null,
  sceneMoveableRef: null,
  scroll:           { left: 0, top: 0 },
  scale:            { index: 7, unit: 300, zoom: 1 / 300, segments: 5 },
  background:       { type: "color", value: "transparent" },
  viewTimeline:     true,

  setPlayerRef:        (ref)        => set({ playerRef: ref }),
  setSceneMoveableRef: (ref)        => set({ sceneMoveableRef: ref }),
  setScroll:           (scroll)     => set({ scroll }),
  setBackground:       (background) => set({ background }),
  setViewTimeline:     (viewTimeline) => set({ viewTimeline }),
}));

export default useStore;
