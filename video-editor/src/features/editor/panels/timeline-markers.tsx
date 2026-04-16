"use client";

/**
 * Timeline Markers UI
 * Renders colored marker triangles on the ruler row.
 * Also provides a marker editor dialog.
 * Now uses engine store instead of Zustand.
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Pencil, Trash2 } from "lucide-react";
import {
  useTimelineMarkers,
  engineStore,
  TimelineMarker,
  MarkerColor,
} from "../engine";
import { addMarker, removeMarker as removeMarkerCmd, updateMarker, clearMarkers } from "../engine/commands";
import { useEnginePlayhead, useEngineDuration, useEngineZoom } from "../engine/engine-provider";
import { zoomToPixelsPerMs } from "../engine/time-scale";

const MARKER_COLORS: Record<MarkerColor, string> = {
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#eab308",
  orange: "#f97316",
  purple: "#a855f7",
  cyan: "#06b6d4",
};

export function useMarkerStore() {
  const markers = useTimelineMarkers();
  
  return {
    markers,
    addMarker: (marker: Omit<TimelineMarker, "id">) => {
      const id = crypto.randomUUID();
      const newMarker: TimelineMarker = { id, ...marker };
      engineStore.dispatch(addMarker(newMarker));
      return newMarker;
    },
    removeMarker: (id: string) => engineStore.dispatch(removeMarkerCmd(id)),
    updateMarker: (id: string, updates: Partial<TimelineMarker>) => 
      engineStore.dispatch(updateMarker(id, updates)),
    getMarkersInRange: (fromMs: number, toMs: number) => 
      markers.filter((m) => m.timeMs >= fromMs && m.timeMs <= toMs),
    getMarkerTimes: () => markers.map((m) => m.timeMs),
    clearAll: () => engineStore.dispatch(clearMarkers()),
  };
}

// ─── Marker Triangle ──────────────────────────────────────────────────────────

const MarkerPin: React.FC<{
  marker: TimelineMarker;
  xPx: number;
  onEdit: (m: TimelineMarker) => void;
}> = ({ marker, xPx, onEdit }) => {
  const color = MARKER_COLORS[marker.color];
  const [hover, setHover] = useState(false);

  return (
    <div
      className="absolute top-0 z-30 cursor-pointer select-none"
      style={{ left: xPx - 5 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onEdit(marker)}
      title={marker.label}
    >
      <svg width="10" height="14" viewBox="0 0 10 14">
        <polygon points="5,0 10,9 0,9" fill={color} />
        <rect x="4" y="9" width="2" height="5" fill={color} />
      </svg>

      {hover && marker.label && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border border-border text-xs px-2 py-1 rounded shadow-xl whitespace-nowrap z-50"
          style={{ borderColor: color }}
        >
          {marker.label}
        </div>
      )}
    </div>
  );
};

// ─── Marker Editor Dialog ─────────────────────────────────────────────────────

const COLORS: MarkerColor[] = ["green", "red", "blue", "yellow", "orange", "purple", "cyan"];

const MarkerEditorDialog: React.FC<{
  marker: TimelineMarker;
  onClose: () => void;
}> = ({ marker, onClose }) => {
  const { updateMarker, removeMarker } = useMarkerStore();
  const [label, setLabel] = useState(marker.label);
  const [color, setColor] = useState<MarkerColor>(marker.color);
  const [notes, setNotes] = useState(marker.notes ?? "");

  const handleSave = () => {
    updateMarker(marker.id, { label, color, notes });
    onClose();
  };

  const handleDelete = () => {
    removeMarker(marker.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-card border border-border rounded-lg p-4 w-80 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Edit Marker</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
              placeholder="Marker label"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Color</label>
            <div className="flex gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2",
                    color === c ? "border-white" : "border-transparent"
                  )}
                  style={{ backgroundColor: MARKER_COLORS[c] }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm resize-none"
              rows={3}
              placeholder="Optional notes..."
            />
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={handleSave}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:bg-primary/90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Markers Layer ───────────────────────────────────────────────────────────

const TIMELINE_GUTTER = 120;

const TimelineMarkersLayer: React.FC<{ scrollLeft: number }> = ({ scrollLeft }) => {
  const engineZoom = useEngineZoom();
  const { markers, addMarker, getMarkersInRange } = useMarkerStore();
  const playheadTime = useEnginePlayhead();
  const duration = useEngineDuration();
  const [editingMarker, setEditingMarker] = useState<TimelineMarker | null>(null);

  const pixelsPerMs = zoomToPixelsPerMs(engineZoom);
  const visibleMarkers = getMarkersInRange(0, duration);

  return (
    <>
      {visibleMarkers.map((marker) => (
        <MarkerPin
          key={marker.id}
          marker={marker}
          xPx={(marker.timeMs * pixelsPerMs) - scrollLeft + TIMELINE_GUTTER}
          onEdit={setEditingMarker}
        />
      ))}

      {editingMarker && (
        <MarkerEditorDialog
          marker={editingMarker}
          onClose={() => setEditingMarker(null)}
        />
      )}
    </>
  );
};

export function useMarkerShortcuts(
  onOpenEditor?: (marker: TimelineMarker) => void
): void {
  const { addMarker } = useMarkerStore();
  const playheadTime = useEnginePlayhead();

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        const marker = addMarker({
          timeMs: playheadTime,
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
  }, [addMarker, playheadTime, onOpenEditor]);
}

export { TimelineMarkersLayer, MarkerEditorDialog };
export default TimelineMarkersLayer;