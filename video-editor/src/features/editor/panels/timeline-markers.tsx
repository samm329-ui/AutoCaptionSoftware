"use client";

/**
 * Timeline Markers UI
 * Renders colored marker triangles on the ruler row.
 * Also provides a marker editor dialog.
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Pencil, Trash2 } from "lucide-react";
import {
  useMarkerStore,
  TimelineMarker,
  MARKER_COLORS,
  MarkerColor,
} from "../engine/marker-engine";
import useStore from "../store/use-store";
import { timeMsToUnits } from "@designcombo/timeline";

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
      {/* Triangle pointing down */}
      <svg width="10" height="14" viewBox="0 0 10 14">
        <polygon points="5,0 10,9 0,9" fill={color} />
        <rect x="4" y="9" width="2" height="5" fill={color} />
      </svg>

      {/* Tooltip */}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg p-4 w-72 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Edit Marker</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all",
                    color === c && "ring-2 ring-white ring-offset-1 ring-offset-card"
                  )}
                  style={{ backgroundColor: MARKER_COLORS[c] }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              className="flex-1 bg-primary text-primary-foreground rounded px-3 py-1.5 text-sm font-medium hover:bg-primary/90"
            >
              Save
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 px-2 py-1.5 text-sm"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Markers Layer ────────────────────────────────────────────────────────────

/**
 * Drop this inside the Timeline ruler row.
 * Position: absolute, full width, z-30.
 *
 * @param scrollLeft - Current timeline scroll offset (px)
 */
const TimelineMarkersLayer: React.FC<{ scrollLeft: number }> = ({
  scrollLeft,
}) => {
  const { markers } = useMarkerStore();
  const { scale } = useStore();
  const [editingMarker, setEditingMarker] = useState<TimelineMarker | null>(null);

  const sequenceMarkers = markers.filter((m) => m.type === "sequence");

  return (
    <>
      <div className="absolute inset-0 pointer-events-none">
        {sequenceMarkers.map((m) => {
          const xPx = timeMsToUnits(m.timeMs, scale.zoom) - scrollLeft;
          if (xPx < -10 || xPx > 9999) return null;
          return (
            <MarkerPin
              key={m.id}
              marker={m}
              xPx={xPx}
              onEdit={(marker) => setEditingMarker(marker)}
            />
          );
        })}
      </div>

      {editingMarker && (
        <MarkerEditorDialog
          marker={editingMarker}
          onClose={() => setEditingMarker(null)}
        />
      )}
    </>
  );
};

export { TimelineMarkersLayer, MarkerEditorDialog };
export default TimelineMarkersLayer;
