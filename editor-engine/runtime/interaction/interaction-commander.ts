/**
 * runtime/interaction/interaction-commander.ts
 *
 * The missing link: subscribes to interaction events from the event bus
 * and dispatches the corresponding EditorCommands to the engine store.
 *
 * This closes the full interaction loop:
 *
 *   Pointer/Keyboard input
 *       ↓
 *   pointer-manager  (emits DRAG_*, TRIM_*)
 *       ↓
 *   interaction-commander  ← THIS FILE
 *       ↓
 *   engineStore.dispatch(MOVE_CLIP / TRIM_CLIP / RIPPLE_EDIT …)
 *       ↓
 *   reducer → new Project state
 *       ↓
 *   Canvas re-renders
 *
 * Call mountInteractionCommander() once when the editor mounts.
 * Returns a cleanup function.
 *
 * ─── Trim mode ────────────────────────────────────────────────────────────
 * During TRIM_MOVE we dispatch a TRIM_CLIP command on every frame for
 * live preview. On TRIM_END we push the final command to history.
 * To avoid N undo steps for a single trim gesture we use beginBatch()
 * / endBatch() so the whole trim lands as one undo entry.
 *
 * ─── Drag mode ────────────────────────────────────────────────────────────
 * During DRAG_MOVE we dispatch MOVE_CLIP with skipHistory=true (live preview).
 * On DRAG_END we commit the final position with a proper history entry.
 */

import { eventBus } from "../../events/event-bus";
import { engineStore } from "../../state/engine-store";
import { getSnapResult } from "./snap-manager";
import type { Milliseconds } from "../../model/schema";

// ─── In-flight gesture state ──────────────────────────────────────────────────

interface DragGesture {
  clipId: string;
  originalStart: Milliseconds;
  originalTrackId: string;
  currentStart: Milliseconds;
  currentTrackId: string;
}

interface TrimGesture {
  clipId: string;
  edge: "start" | "end";
  /** Snapshot of display + trim taken at gesture start for undo */
  originalDisplay: { from: Milliseconds; to: Milliseconds };
  originalTrim: { from: Milliseconds; to: Milliseconds };
}

let activeDrag: DragGesture | null = null;
let activeTrim: TrimGesture | null = null;

// ─── Mount / Unmount ──────────────────────────────────────────────────────────

/**
 * Wire all interaction events to engine commands.
 * Call once during editor initialisation.
 * Returns a cleanup function.
 */
export function mountInteractionCommander(): () => void {
  const unsubs: Array<() => void> = [];

  // ── Drag ────────────────────────────────────────────────────────────────

  unsubs.push(
    eventBus.on("DRAG_START", ({ clipId, source }) => {
      if (source !== "timeline-clip" || !clipId) return;
      const project = engineStore.getState();
      const clip = project.clips[clipId];
      if (!clip) return;

      activeDrag = {
        clipId,
        originalStart: clip.display.from,
        originalTrackId: clip.trackId,
        currentStart: clip.display.from,
        currentTrackId: clip.trackId,
      };

      // Signal batch start so live-preview dispatches don't flood history
      engineStore.beginBatch();
    })
  );

  unsubs.push(
    eventBus.on("DRAG_MOVE", ({ snapTimeMs }) => {
      if (!activeDrag || snapTimeMs === undefined) return;

      const project = engineStore.getState();
      const clip = project.clips[activeDrag.clipId];
      if (!clip) return;

      // Apply snap
      const excludeIds = new Set([activeDrag.clipId]);
      const snapResult = getSnapResult(
        snapTimeMs,
        project,
        excludeIds,
        12,
        project.ui.zoom
      );

      const snappedStart = Math.max(0, snapResult.timeMs);

      if (snappedStart === activeDrag.currentStart) return; // no change

      activeDrag.currentStart = snappedStart;

      // Optimistic live-preview — skipHistory (batching handles undo)
      engineStore.dispatch(
        {
          type: "MOVE_CLIP",
          payload: {
            clipId: activeDrag.clipId,
            newStart: snappedStart,
          },
        },
        { skipHistory: true }
      );

      // Emit snap indicator event if snapped
      if (snapResult.snapped && snapResult.point) {
        eventBus.emit("SNAP_ACTIVATED", {
          timeMs: snapResult.timeMs,
          source: snapResult.point.source,
        });
      } else {
        eventBus.emit("SNAP_CLEARED", {});
      }
    })
  );

  unsubs.push(
    eventBus.on("DRAG_END", ({ targetTimeMs, targetTrackId }) => {
      if (!activeDrag) return;

      // If the drop landed at a specific time, apply one final snap-resolved
      // move with skipHistory so the live-preview state is accurate, then
      // close the batch.  endBatch() is the single history boundary — the
      // entire gesture (beginBatch → N skipHistory dispatches → endBatch)
      // becomes one undo step.  A second dispatch here would create a second
      // undo entry, which is the bug we are fixing.
      if (
        targetTimeMs !== undefined &&
        targetTrackId !== undefined &&
        targetTrackId !== activeDrag.currentTrackId
      ) {
        // Cross-track drop: apply the track change inside the batch
        engineStore.dispatch(
          {
            type: "MOVE_CLIP",
            payload: {
              clipId: activeDrag.clipId,
              newStart: Math.max(0, targetTimeMs),
              newTrackId: targetTrackId,
            },
          },
          { skipHistory: true }
        );
      }

      engineStore.endBatch("Move clip");
      eventBus.emit("SNAP_CLEARED", {});
      activeDrag = null;
    })
  );

  unsubs.push(
    eventBus.on("DRAG_CANCEL", () => {
      if (!activeDrag) return;
      // Revert to original position
      engineStore.endBatch(); // discard batch without committing
      engineStore.dispatch(
        {
          type: "MOVE_CLIP",
          payload: {
            clipId: activeDrag.clipId,
            newStart: activeDrag.originalStart,
            newTrackId: activeDrag.originalTrackId,
          },
        },
        { skipHistory: true }
      );
      eventBus.emit("SNAP_CLEARED", {});
      activeDrag = null;
    })
  );

  // ── Trim ────────────────────────────────────────────────────────────────

  unsubs.push(
    eventBus.on("TRIM_START", ({ clipId, edge }) => {
      const project = engineStore.getState();
      const clip = project.clips[clipId];
      if (!clip) return;

      activeTrim = {
        clipId,
        edge,
        originalDisplay: { ...clip.display },
        originalTrim: { ...clip.trim },
      };

      engineStore.beginBatch();
    })
  );

  unsubs.push(
    eventBus.on("TRIM_MOVE", ({ clipId, edge, deltaMs }) => {
      if (!activeTrim || activeTrim.clipId !== clipId) return;

      const project = engineStore.getState();
      const clip = project.clips[clipId];
      if (!clip) return;

      const { originalDisplay: od, originalTrim: ot } = activeTrim;
      const MIN_DURATION = 100; // ms

      let newDisplay: { from: Milliseconds; to: Milliseconds };
      let newTrim: { from: Milliseconds; to: Milliseconds };

      if (edge === "end") {
        const rawTo = od.to + deltaMs;
        const clampedTo = Math.max(od.from + MIN_DURATION, rawTo);
        const actualDelta = clampedTo - od.to;
        newDisplay = { from: od.from, to: clampedTo };
        newTrim = { from: ot.from, to: ot.to + actualDelta };
      } else {
        const rawFrom = od.from + deltaMs;
        const clampedFrom = Math.min(od.to - MIN_DURATION, Math.max(0, rawFrom));
        const actualDelta = clampedFrom - od.from;
        newDisplay = { from: clampedFrom, to: od.to };
        newTrim = { from: ot.from + actualDelta, to: ot.to };
      }

      // Live preview — skipHistory
      engineStore.dispatch(
        {
          type: "TRIM_CLIP",
          payload: { clipId, display: newDisplay, trim: newTrim },
        },
        { skipHistory: true }
      );
    })
  );

  unsubs.push(
    eventBus.on("TRIM_END", ({ clipId, edge, finalDeltaMs }) => {
      if (!activeTrim || activeTrim.clipId !== clipId) return;

      const project = engineStore.getState();
      const clip = project.clips[clipId];

      if (clip) {
        // Commit final trim as one undo step
        engineStore.endBatch(`Trim clip ${edge}`);
      } else {
        engineStore.endBatch();
      }

      activeTrim = null;
    })
  );

  // ── Marquee selection ───────────────────────────────────────────────────

  unsubs.push(
    eventBus.on("MARQUEE_END", ({ selectedClipIds }) => {
      if (selectedClipIds.length > 0) {
        engineStore.dispatch({
          type: "SET_SELECTION",
          payload: { clipIds: selectedClipIds },
        });
      }
    })
  );

  // ── Playhead seek ───────────────────────────────────────────────────────

  unsubs.push(
    eventBus.on("PLAYHEAD_SEEK", ({ timeMs }) => {
      engineStore.dispatch(
        { type: "SET_PLAYHEAD", payload: { timeMs } },
        { skipHistory: true }
      );
    })
  );

  // ── Zoom / scroll ───────────────────────────────────────────────────────

  unsubs.push(
    eventBus.on("ZOOM_CHANGE", ({ zoom }) => {
      engineStore.dispatch(
        { type: "SET_ZOOM", payload: { zoom } },
        { skipHistory: true }
      );
    })
  );

  unsubs.push(
    eventBus.on("SCROLL_CHANGE", ({ scrollX, scrollY }) => {
      engineStore.dispatch(
        { type: "SET_SCROLL", payload: { scrollX, scrollY } },
        { skipHistory: true }
      );
    })
  );

  return () => {
    for (const unsub of unsubs) unsub();
    activeDrag = null;
    activeTrim = null;
  };
}

// ─── Exported gesture accessors (for rendering live feedback) ─────────────────

export function getActiveDrag(): DragGesture | null {
  return activeDrag;
}

export function getActiveTrim(): TrimGesture | null {
  return activeTrim;
}
