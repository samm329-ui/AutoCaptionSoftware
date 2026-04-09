/**
 * runtime/interaction/snap-manager.ts
 * Stateless snap computation. Does NOT mutate engine state.
 * Call getSnapResult() during drag/trim to find the nearest snap target.
 *
 * ─── Zoom convention ────────────────────────────────────────────────────────
 *   zoom = px/ms  (pixels per millisecond)
 *
 *   Snap threshold in ms from pixel radius:
 *     thresholdMs = pixelRadius / zoom
 *
 *   Example: pixelRadius=12, zoom=1/300 (default)
 *     thresholdMs = 12 / (1/300) = 12 * 300 = 3600ms  ← WAY too large
 *
 *   That is correct at the default zoom level where 1px = 300ms.
 *   12 pixels of snap at default zoom legitimately covers 3.6 seconds —
 *   the user can see those pixels on screen.
 *
 *   At zoomed-in zoom=1/10 (1px=10ms):
 *     thresholdMs = 12 / (1/10) = 120ms  ← tighter, as expected
 *
 *   The floor of MIN_SNAP_MS prevents snap from activating across
 *   imperceptibly small distances at extreme zoom-out.
 */

import type { Project, Milliseconds, Pixels } from "../../model/schema";
import { getSnapPoints, type SnapPoint } from "../../state/selectors";

export interface SnapResult {
  snapped: boolean;
  timeMs: Milliseconds;
  point?: SnapPoint;
}

/** Minimum snap threshold in ms — prevents snap from firing across zero distance */
const MIN_SNAP_MS = 16; // ~0.5 frames at 30fps

const PRIORITY: Record<SnapPoint["source"], number> = {
  playhead: 0,
  marker: 1,
  origin: 2,
  "clip-start": 3,
  "clip-end": 3,
};

/**
 * Find the nearest snap point to `proposedMs`.
 *
 * @param proposedMs  - Raw dragged time in ms
 * @param project     - Current project state
 * @param excludeIds  - Clip IDs to exclude (the clip(s) being dragged)
 * @param pixelRadius - Snap activation distance in screen pixels (default 12)
 * @param zoom        - Current zoom in px/ms (e.g. 1/300 at default)
 */
export function getSnapResult(
  proposedMs: Milliseconds,
  project: Project,
  excludeIds: Set<string> = new Set(),
  pixelRadius = 12,
  zoom = 1 / 300
): SnapResult {
  // zoom = px/ms → ms per pixel = 1/zoom → thresholdMs = pixelRadius * (1/zoom)
  const thresholdMs = Math.max(MIN_SNAP_MS, pixelRadius / zoom);
  const points = getSnapPoints(project, excludeIds);

  if (points.length === 0) return { snapped: false, timeMs: proposedMs };

  // Binary search for the nearest point
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].timeMs < proposedMs) lo = mid + 1;
    else hi = mid;
  }

  // Check neighbours of the binary-search landing point
  const candidates: SnapPoint[] = [];
  if (lo > 0) candidates.push(points[lo - 1]);
  if (lo < points.length) candidates.push(points[lo]);

  let best: SnapPoint | null = null;
  let bestDist = Infinity;

  for (const c of candidates) {
    const dist = Math.abs(c.timeMs - proposedMs);
    if (dist > thresholdMs) continue;
    const p = PRIORITY[c.source];
    const bp = best ? PRIORITY[best.source] : Infinity;
    if (p < bp || (p === bp && dist < bestDist)) {
      best = c;
      bestDist = dist;
    }
  }

  return best
    ? { snapped: true, timeMs: best.timeMs, point: best }
    : { snapped: false, timeMs: proposedMs };
}

/**
 * Convert a snap result's time to a canvas x position.
 * zoom = px/ms → screenX = timeMs * zoom - scrollX
 */
export function snapTimeToX(
  timeMs: Milliseconds,
  scrollX: Pixels,
  zoom: number
): Pixels {
  return timeMs * zoom - scrollX;
}
