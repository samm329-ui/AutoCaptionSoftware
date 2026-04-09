/**
 * runtime/interaction/pointer-manager.ts
 * Manages pointer capture for timeline drag, trim, and selection.
 *
 * Uses Pointer Events API (not HTML5 drag/drop) for:
 *   - frame-accurate per-pixel updates
 *   - no ghost image
 *   - works on touch and mouse uniformly
 *   - reliable pointerup even outside the window
 */

import { eventBus } from "../../events/event-bus";
import { engineStore } from "../../state/engine-store";
import { dragRegistry } from "./drag-registry";
import type { Clip, Milliseconds, Pixels } from "../../model/schema";

export type DragMode = "move" | "trim-start" | "trim-end" | "marquee";

export interface PointerDragSession {
  mode: DragMode;
  pointerId: number;
  startX: Pixels;
  startY: Pixels;
  currentX: Pixels;
  currentY: Pixels;
  clipId?: string;
  token?: string;
  /** Timeline x offset at drag start (for scroll compensation) */
  startScrollX: Pixels;
  startClipFrom?: Milliseconds;
  startClipTo?: Milliseconds;
}

let activeSession: PointerDragSession | null = null;

// ─── Start ───────────────────────────────────────────────────────────────────

export function startPointerDrag(
  e: PointerEvent,
  mode: DragMode,
  target: HTMLElement,
  clipId?: string
): void {
  if (activeSession) cancelPointerDrag();

  const state = engineStore.getState();
  const clip = clipId ? state.clips[clipId] : undefined;

  // Register in drag registry for any fallback HTML5 drop handlers
  const token = clipId && clip
    ? dragRegistry.register({ source: "timeline-clip", clip })
    : undefined;

  activeSession = {
    mode,
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    currentX: e.clientX,
    currentY: e.clientY,
    clipId,
    token,
    startScrollX: state.ui.scrollX,
    startClipFrom: clip?.display.from,
    startClipTo: clip?.display.to,
  };

  target.setPointerCapture(e.pointerId);

  if (mode === "move" && clipId && clip) {
    eventBus.emit("DRAG_START", {
      token: token!,
      originX: e.clientX,
      originY: e.clientY,
      clipId,
      source: "timeline-clip",
    });
  } else if (mode === "trim-start" || mode === "trim-end") {
    eventBus.emit("TRIM_START", {
      clipId: clipId!,
      edge: mode === "trim-start" ? "start" : "end",
      mode: "ripple",
    });
  } else if (mode === "marquee") {
    eventBus.emit("MARQUEE_START", { x: e.clientX, y: e.clientY });
  }
}

// ─── Move ────────────────────────────────────────────────────────────────────

/**
 * Call on every pointermove while a drag/trim session is active.
 *
 * @param e       - Native PointerEvent
 * @param zoom    - Current zoom in px/ms
 * @param scrollX - Current scroll offset in px
 */
export function onPointerMove(
  e: PointerEvent,
  zoom: number,
  scrollX: Pixels
): void {
  if (!activeSession || e.pointerId !== activeSession.pointerId) return;
  activeSession.currentX = e.clientX;
  activeSession.currentY = e.clientY;

  const deltaXPx = e.clientX - activeSession.startX;
  // zoom = px/ms → deltaMs = deltaXPx / zoom
  const deltaMs = deltaXPx / zoom;

  if (activeSession.mode === "move" && activeSession.token) {
    const rawTimeMs = (activeSession.startClipFrom ?? 0) + deltaMs;
    eventBus.emit("DRAG_MOVE", {
      token: activeSession.token,
      x: e.clientX,
      y: e.clientY,
      deltaX: deltaXPx,
      deltaY: e.clientY - activeSession.startY,
      snapTimeMs: rawTimeMs,
    });
  } else if (
    (activeSession.mode === "trim-start" || activeSession.mode === "trim-end") &&
    activeSession.clipId
  ) {
    eventBus.emit("TRIM_MOVE", {
      clipId: activeSession.clipId,
      edge: activeSession.mode === "trim-start" ? "start" : "end",
      deltaMs,
    });
  } else if (activeSession.mode === "marquee") {
    const dx = e.clientX - activeSession.startX;
    const dy = e.clientY - activeSession.startY;
    eventBus.emit("MARQUEE_MOVE", {
      x: Math.min(activeSession.startX, e.clientX),
      y: Math.min(activeSession.startY, e.clientY),
      width: Math.abs(dx),
      height: Math.abs(dy),
    });
  }
}

// ─── End ─────────────────────────────────────────────────────────────────────

/**
 * Call on pointerup to finalise a drag/trim session.
 *
 * @param e             - Native PointerEvent
 * @param zoom          - Current zoom in px/ms
 * @param targetTrackId - Track id resolved from hit-test at drop position
 */
export function onPointerUp(
  e: PointerEvent,
  zoom: number,
  targetTrackId?: string
): void {
  if (!activeSession || e.pointerId !== activeSession.pointerId) return;
  const session = activeSession;
  activeSession = null;

  const deltaXPx = e.clientX - session.startX;
  // zoom = px/ms → deltaMs = deltaXPx / zoom
  const deltaMs = deltaXPx / zoom;

  if (session.mode === "move" && session.token) {
    const targetTimeMs = Math.max(0, (session.startClipFrom ?? 0) + deltaMs);
    eventBus.emit("DRAG_END", {
      token: session.token,
      x: e.clientX,
      y: e.clientY,
      droppedOnTimeline: true,
      targetTrackId,
      targetTimeMs,
    });
    if (session.token) dragRegistry.release(session.token);
  } else if (
    (session.mode === "trim-start" || session.mode === "trim-end") &&
    session.clipId
  ) {
    eventBus.emit("TRIM_END", {
      clipId: session.clipId,
      edge: session.mode === "trim-start" ? "start" : "end",
      finalDeltaMs: deltaMs,
    });
  } else if (session.mode === "marquee") {
    eventBus.emit("MARQUEE_END", { selectedClipIds: [] });
  }
}

// ─── Cancel ──────────────────────────────────────────────────────────────────

export function cancelPointerDrag(): void {
  if (!activeSession) return;
  if (activeSession.token) {
    dragRegistry.release(activeSession.token);
    eventBus.emit("DRAG_CANCEL", { token: activeSession.token });
  }
  activeSession = null;
}

export function getActiveSession(): PointerDragSession | null {
  return activeSession;
}
