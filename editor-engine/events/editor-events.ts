/**
 * events/editor-events.ts
 * Complete map of all event names → payload types.
 *
 * Keep every event name here so the bus is fully typed.
 */

import type { EditorCommand } from "../commands";
import type { Project, Clip, Milliseconds, Pixels } from "../model/schema";

export interface EditorEventMap {
  // ── State ────────────────────────────────────────────────────────────────
  STATE_CHANGED: {
    command: EditorCommand | null;
    state: Project;
  };
  COMMAND_REJECTED: {
    command: EditorCommand;
    reason: string;
  };

  // ── Drag ─────────────────────────────────────────────────────────────────
  DRAG_START: {
    token: string;
    /** Where on screen the drag began */
    originX: Pixels;
    originY: Pixels;
    /** Which clip is being dragged (if from timeline) */
    clipId?: string;
    /** Type of drag: from media bin, from timeline, etc. */
    source: "media-bin" | "timeline-clip" | "external";
  };
  DRAG_MOVE: {
    token: string;
    x: Pixels;
    y: Pixels;
    deltaX: Pixels;
    deltaY: Pixels;
    /** Suggested snap time in ms */
    snapTimeMs?: Milliseconds;
  };
  DRAG_END: {
    token: string;
    x: Pixels;
    y: Pixels;
    /** Did the drop land on the timeline? */
    droppedOnTimeline: boolean;
    /** Resolved track id from hit-test */
    targetTrackId?: string;
    /** Resolved timeline time in ms */
    targetTimeMs?: Milliseconds;
  };
  DRAG_CANCEL: {
    token: string;
  };

  // ── Trim ─────────────────────────────────────────────────────────────────
  TRIM_START: {
    clipId: string;
    edge: "start" | "end";
    mode: "ripple" | "rolling" | "slip" | "slide";
  };
  TRIM_MOVE: {
    clipId: string;
    edge: "start" | "end";
    deltaMs: Milliseconds;
  };
  TRIM_END: {
    clipId: string;
    edge: "start" | "end";
    finalDeltaMs: Milliseconds;
  };

  // ── Selection ─────────────────────────────────────────────────────────────
  SELECTION_CHANGE: {
    clipIds: string[];
    source: "click" | "marquee" | "keyboard" | "command";
  };

  // ── Playhead ──────────────────────────────────────────────────────────────
  PLAYHEAD_SEEK: {
    timeMs: Milliseconds;
    source: "ruler-click" | "keyboard" | "scrub";
  };

  // ── Zoom / Scroll ─────────────────────────────────────────────────────────
  ZOOM_CHANGE: {
    zoom: number;
    /** Pivot point in px (anchor zoom around this timeline x position) */
    pivotX?: Pixels;
  };
  SCROLL_CHANGE: {
    scrollX?: Pixels;
    scrollY?: Pixels;
  };

  // ── Keyboard ─────────────────────────────────────────────────────────────
  KEYBOARD_SHORTCUT: {
    key: string;
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
    /** Human label for the action triggered */
    action: string;
  };

  // ── Snap ─────────────────────────────────────────────────────────────────
  SNAP_ACTIVATED: {
    timeMs: Milliseconds;
    source: string;
  };
  SNAP_CLEARED: Record<string, never>;

  // ── Render ────────────────────────────────────────────────────────────────
  RENDER_FRAME: {
    timestamp: number;
  };

  // ── Caption backend ───────────────────────────────────────────────────────
  CAPTION_JOB_STARTED: {
    jobId: string;
    clipId: string;
  };
  CAPTION_JOB_PROGRESS: {
    jobId: string;
    progress: number;
  };
  CAPTION_JOB_COMPLETE: {
    jobId: string;
    clipId: string;
    captions: import("../model/schema").Caption[];
  };
  CAPTION_JOB_FAILED: {
    jobId: string;
    error: string;
  };

  // ── Interaction ───────────────────────────────────────────────────────────
  MARQUEE_START: { x: Pixels; y: Pixels };
  MARQUEE_MOVE: { x: Pixels; y: Pixels; width: Pixels; height: Pixels };
  MARQUEE_END: { selectedClipIds: string[] };
}
