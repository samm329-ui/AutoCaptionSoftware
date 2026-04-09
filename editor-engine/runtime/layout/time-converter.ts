/**
 * runtime/layout/time-converter.ts
 * Utilities for converting between timeline pixels and time values.
 * All functions are pure — no side effects, no store reads.
 *
 * ─── Zoom convention (enforced here and everywhere in the engine) ──────────
 *
 *   zoom: ZoomFactor   =  pixels per millisecond  (px / ms)
 *
 *   Default: 1/300 ≈ 0.00333 px/ms
 *     → at rest, 1 pixel represents ~300 ms of timeline time
 *     → a 5 000 ms clip is  5000 * (1/300) ≈ 16.7 px wide
 *
 *   Zoomed IN  (larger zoom, e.g. 1/50):  more px per ms, clips appear wider
 *   Zoomed OUT (smaller zoom, e.g. 1/3000): fewer px per ms, clips appear narrower
 *
 *   Derivations:
 *     px  = timeMs * zoom              (time  → screen x)
 *     ms  = px / zoom                  (screen x → time)
 *     widthPx  = durationMs * zoom
 *     durationMs = widthPx / zoom
 *
 * ─── scrollX convention ────────────────────────────────────────────────────
 *
 *   scrollX is the timeline time origin offset in PIXELS.
 *   When scrollX = 600, the left edge of the canvas shows time = 600/zoom ms.
 *
 *   screenX = timeMs * zoom - scrollX
 *   timeMs  = (screenX + scrollX) / zoom
 */

import type { Milliseconds, Pixels, ZoomFactor } from "../../model/schema";

// ─── Time ↔ Pixel ─────────────────────────────────────────────────────────────

/**
 * Convert a timeline time in ms to a canvas x position in pixels.
 *
 * zoom (px/ms):  px = timeMs * zoom - scrollX
 *
 * @param timeMs  - Time on the timeline in ms
 * @param scrollX - Current horizontal scroll offset in px
 * @param zoom    - px/ms  (e.g. 1/300 at default zoom)
 */
export function timeMsToX(
  timeMs: Milliseconds,
  scrollX: Pixels,
  zoom: ZoomFactor
): Pixels {
  return timeMs * zoom - scrollX;
}

/**
 * Convert a canvas x position in pixels back to a timeline time in ms.
 *
 * zoom (px/ms):  ms = (px + scrollX) / zoom
 *
 * @param xPx     - Canvas x position in pixels (relative to timeline content area)
 * @param scrollX - Current horizontal scroll offset in px
 * @param zoom    - px/ms
 */
export function xToTimeMs(
  xPx: Pixels,
  scrollX: Pixels,
  zoom: ZoomFactor
): Milliseconds {
  return (xPx + scrollX) / zoom;
}

/**
 * Convert a duration in ms to a width in pixels.
 *   widthPx = durationMs * zoom
 */
export function durationToWidth(
  durationMs: Milliseconds,
  zoom: ZoomFactor
): Pixels {
  return durationMs * zoom;
}

/**
 * Convert a pixel width to a duration in ms.
 *   durationMs = widthPx / zoom
 */
export function widthToDuration(
  widthPx: Pixels,
  zoom: ZoomFactor
): Milliseconds {
  return widthPx / zoom;
}

// ─── Track Layout ────────────────────────────────────────────────────────────

export const TRACK_HEIGHT_PX = 52;
export const TRACK_HEADER_WIDTH_PX = 180;
export const TIMELINE_RULER_HEIGHT_PX = 32;

/**
 * Get the canvas y position for a track by its visual index.
 * @param trackIndex - Zero-based visual order index
 */
export function trackIndexToY(trackIndex: number): Pixels {
  return TIMELINE_RULER_HEIGHT_PX + trackIndex * TRACK_HEIGHT_PX;
}

/**
 * Get the track index from a canvas y position.
 * Returns -1 if y is in the ruler area.
 */
export function yToTrackIndex(yPx: Pixels): number {
  if (yPx < TIMELINE_RULER_HEIGHT_PX) return -1;
  return Math.floor((yPx - TIMELINE_RULER_HEIGHT_PX) / TRACK_HEIGHT_PX);
}

// ─── Ruler Ticks ────────────────────────────────────────────────────────────

export interface RulerTick {
  timeMs: Milliseconds;
  xPx: Pixels;
  label: string;
  major: boolean;
}

/**
 * Generate ruler tick marks for the visible range.
 * Automatically chooses an appropriate interval based on zoom.
 *
 * zoom is px/ms:
 *   msPerPx = 1 / zoom    (how many ms each pixel represents)
 *   visibleMs = canvasWidth / zoom
 */
export function getRulerTicks(
  scrollX: Pixels,
  canvasWidth: Pixels,
  zoom: ZoomFactor,
  fps = 30
): RulerTick[] {
  // zoom = px/ms → msPerPx = 1/zoom
  const msPerPx = 1 / zoom;
  const visibleMs = canvasWidth * msPerPx;
  const startMs = xToTimeMs(0, scrollX, zoom);
  const endMs = startMs + visibleMs;

  // Choose a tick interval that gives ~10 major ticks across the visible range
  const targetTicks = 10;
  const rawInterval = visibleMs / targetTicks;

  const INTERVALS_MS = [
    100, 200, 500,
    1000, 2000, 5000,
    10_000, 30_000,
    60_000, 120_000, 300_000,
  ];

  const interval =
    INTERVALS_MS.find((i) => i >= rawInterval) ??
    INTERVALS_MS[INTERVALS_MS.length - 1];

  const majorEvery = interval >= 1000 ? 1 : 5;

  const ticks: RulerTick[] = [];
  let t = Math.floor(startMs / interval) * interval;
  let i = 0;

  while (t <= endMs) {
    const xPx = timeMsToX(t, scrollX, zoom);
    const major = i % majorEvery === 0;
    ticks.push({ timeMs: t, xPx, label: major ? formatTime(t) : "", major });
    t += interval;
    i++;
  }

  return ticks;
}

// ─── Hit Testing ─────────────────────────────────────────────────────────────

export interface ClipHitArea {
  type: "body" | "trim-start" | "trim-end";
  /** Trim handle detection radius in px */
  handleRadius?: Pixels;
}

const HANDLE_RADIUS = 8;

/**
 * Determine which part of a clip was hit given a canvas x position.
 *
 * @param xPx       - Canvas x of the pointer
 * @param clipFromMs - Clip start time in ms
 * @param clipToMs  - Clip end time in ms
 * @param scrollX   - Current scroll
 * @param zoom      - Current zoom
 */
export function hitTestClip(
  xPx: Pixels,
  clipFromMs: Milliseconds,
  clipToMs: Milliseconds,
  scrollX: Pixels,
  zoom: ZoomFactor
): ClipHitArea | null {
  const left = timeMsToX(clipFromMs, scrollX, zoom);
  const right = timeMsToX(clipToMs, scrollX, zoom);

  if (xPx < left - HANDLE_RADIUS || xPx > right + HANDLE_RADIUS) return null;

  if (xPx <= left + HANDLE_RADIUS) return { type: "trim-start", handleRadius: HANDLE_RADIUS };
  if (xPx >= right - HANDLE_RADIUS) return { type: "trim-end", handleRadius: HANDLE_RADIUS };
  return { type: "body" };
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/** Format milliseconds as MM:SS.ms for ruler labels */
export function formatTime(ms: Milliseconds): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor((ms % 1000) / 10);

  if (minutes > 0) {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(seconds).padStart(2, "0")}.${String(millis).padStart(2, "0")}`;
}
