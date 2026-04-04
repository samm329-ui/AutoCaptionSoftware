/**
 * Marker Engine
 * Timeline markers for annotations, navigation, and snap targets.
 *
 * Markers can be:
 *  - Sequence markers (on the ruler, apply to whole timeline)
 *  - Clip markers (attached to a specific clip)
 */

import { create } from "zustand";

export type MarkerColor =
  | "green"
  | "red"
  | "blue"
  | "yellow"
  | "orange"
  | "purple"
  | "cyan";

export interface TimelineMarker {
  id: string;
  /** Time in ms from sequence start */
  timeMs: number;
  /** Optional end time for ranged markers */
  endTimeMs?: number;
  label: string;
  color: MarkerColor;
  type: "sequence" | "clip";
  /** If type = 'clip', which clip */
  clipId?: string;
  /** Note/comment */
  notes?: string;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface IMarkerStore {
  markers: TimelineMarker[];
  addMarker: (marker: Omit<TimelineMarker, "id">) => TimelineMarker;
  removeMarker: (id: string) => void;
  updateMarker: (id: string, updates: Partial<TimelineMarker>) => void;
  moveMarker: (id: string, newTimeMs: number) => void;
  getMarkersInRange: (fromMs: number, toMs: number) => TimelineMarker[];
  getMarkerTimes: () => number[];
  clearAll: () => void;
}

export const useMarkerStore = create<IMarkerStore>((set, get) => ({
  markers: [],

  addMarker: (marker) => {
    const id = crypto.randomUUID();
    const newMarker: TimelineMarker = { id, ...marker };
    set((state) => ({ markers: [...state.markers, newMarker] }));
    return newMarker;
  },

  removeMarker: (id) => {
    set((state) => ({ markers: state.markers.filter((m) => m.id !== id) }));
  },

  updateMarker: (id, updates) => {
    set((state) => ({
      markers: state.markers.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  },

  moveMarker: (id, newTimeMs) => {
    set((state) => ({
      markers: state.markers.map((m) =>
        m.id === id ? { ...m, timeMs: newTimeMs } : m
      ),
    }));
  },

  getMarkersInRange: (fromMs, toMs) => {
    return get().markers.filter(
      (m) => m.timeMs >= fromMs && m.timeMs <= toMs
    );
  },

  getMarkerTimes: () => {
    return get().markers.map((m) => m.timeMs);
  },

  clearAll: () => set({ markers: [] }),
}));

// ─── Keyboard Shortcut ────────────────────────────────────────────────────────

import { useEffect } from "react";
import { getCurrentTime } from "../utils/time";

/**
 * Hook: Press M to add a marker at the current playhead position.
 * Press Shift+M to open marker editor (handled externally).
 */
export function useMarkerShortcuts(
  onOpenEditor?: (marker: TimelineMarker) => void
): void {
  const { addMarker } = useMarkerStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        const timeMs = getCurrentTime();
        const marker = addMarker({
          timeMs,
          label: "Marker",
          color: "green",
          type: "sequence",
        });
        if (e.shiftKey && onOpenEditor) {
          onOpenEditor(marker);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addMarker, onOpenEditor]);
}

// ─── Marker Colors ────────────────────────────────────────────────────────────

export const MARKER_COLORS: Record<MarkerColor, string> = {
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#eab308",
  orange: "#f97316",
  purple: "#a855f7",
  cyan: "#06b6d4",
};
