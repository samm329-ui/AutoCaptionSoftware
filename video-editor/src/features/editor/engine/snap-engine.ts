/**
 * Snap Engine
 * Implements magnetic timeline snapping — when a clip is dragged near a boundary,
 * it jumps to align exactly with it (frame-accurate).
 *
 * Snap targets include:
 *   - Other clip boundaries (in + out points)
 *   - Playhead position
 *   - Sequence markers
 *   - Track start/end (time = 0 and sequence end)
 *
 * Uses a spatial sweep approach: maintain sorted snap points, binary-search for nearest.
 */

export interface SnapPoint {
  timeMs: number;
  /** What generated this snap point (for debug/visual indicator) */
  source: "clip-start" | "clip-end" | "playhead" | "marker" | "origin";
  /** Optional label */
  label?: string;
}

export interface SnapResult {
  snapped: boolean;
  timeMs: number;
  /** Which snap point was hit */
  point?: SnapPoint;
}

// ─── Snap Engine State ────────────────────────────────────────────────────────

let snapEnabled = true;
/** Pixel distance within which snap activates */
const SNAP_PROXIMITY_MS = 200; // 200ms default snap range

export function setSnapEnabled(enabled: boolean): void {
  snapEnabled = enabled;
}

export function isSnapEnabled(): boolean {
  return snapEnabled;
}

// ─── Build Snap Points ────────────────────────────────────────────────────────

/**
 * Build the complete sorted list of snap points from all clips + playhead + markers.
 * Call this whenever the timeline state changes.
 *
 * @param trackItemsMap - All clips
 * @param playheadMs - Current playhead position in ms
 * @param markers - Optional list of marker times in ms
 * @param excludeIds - Clip IDs to exclude (the clip being dragged)
 */
export function buildSnapPoints(
  trackItemsMap: Record<string, { id: string; display?: { from: number; to: number } }>,
  playheadMs: number,
  markers: number[] = [],
  excludeIds: Set<string> = new Set()
): SnapPoint[] {
  const points: SnapPoint[] = [];

  // Origin
  points.push({ timeMs: 0, source: "origin", label: "Start" });

  // Clip boundaries
  for (const [id, item] of Object.entries(trackItemsMap)) {
    if (excludeIds.has(id)) continue;
    if (item.display) {
      points.push({ timeMs: item.display.from, source: "clip-start" });
      points.push({ timeMs: item.display.to, source: "clip-end" });
    }
  }

  // Playhead (highest priority)
  points.push({ timeMs: playheadMs, source: "playhead", label: "Playhead" });

  // Markers
  for (const m of markers) {
    points.push({ timeMs: m, source: "marker", label: "Marker" });
  }

  // Sort ascending by time
  return points.sort((a, b) => a.timeMs - b.timeMs);
}

// ─── Snap Query ─────────────────────────────────────────────────────────────

/**
 * Given a dragged clip's proposed time, find the nearest snap point.
 * Returns the snapped time, or the original time if no snap within threshold.
 *
 * Priority: playhead > markers > clip boundaries > origin
 *
 * @param proposedMs - Where the user is dragging (ms)
 * @param snapPoints - Sorted snap points from buildSnapPoints()
 * @param thresholdMs - How close to snap (default 200ms, adjust for zoom level)
 */
export function findSnap(
  proposedMs: number,
  snapPoints: SnapPoint[],
  thresholdMs: number = SNAP_PROXIMITY_MS
): SnapResult {
  if (!snapEnabled || snapPoints.length === 0) {
    return { snapped: false, timeMs: proposedMs };
  }

  // Binary search to find nearest point
  let lo = 0;
  let hi = snapPoints.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (snapPoints[mid].timeMs < proposedMs) lo = mid + 1;
    else hi = mid;
  }

  // Check lo and lo-1 for the nearest
  const candidates: SnapPoint[] = [];
  if (lo > 0) candidates.push(snapPoints[lo - 1]);
  if (lo < snapPoints.length) candidates.push(snapPoints[lo]);

  // Sort candidates by priority: playhead first, then markers, then others
  const PRIORITY: Record<SnapPoint["source"], number> = {
    playhead: 0,
    marker: 1,
    origin: 2,
    "clip-start": 3,
    "clip-end": 3,
  };

  let best: SnapPoint | null = null;
  let bestDist = Infinity;

  for (const c of candidates) {
    const dist = Math.abs(c.timeMs - proposedMs);
    if (dist <= thresholdMs) {
      // Prefer by priority, then by distance
      const p = PRIORITY[c.source];
      const bestP = best ? PRIORITY[best.source] : Infinity;
      if (p < bestP || (p === bestP && dist < bestDist)) {
        best = c;
        bestDist = dist;
      }
    }
  }

  if (best) {
    return { snapped: true, timeMs: best.timeMs, point: best };
  }

  return { snapped: false, timeMs: proposedMs };
}

// ─── Zoom-Aware Threshold ─────────────────────────────────────────────────────

/**
 * Convert pixel snap distance to milliseconds based on current zoom.
 * At higher zoom, snap range narrows; at lower zoom it widens.
 *
 * @param pixelRadius - How many pixels = snap distance (default 12px)
 * @param zoom - Timeline zoom factor (ms per pixel)
 */
export function getSnapThresholdMs(pixelRadius: number = 12, zoom: number = 1): number {
  // zoom is ms/pixel from scale.zoom
  // scale.zoom = 1/300 means 1px = 1/300 second = 3.33ms
  const msPerPixel = zoom > 0 ? 1 / zoom : 1;
  return Math.max(50, pixelRadius * msPerPixel);
}

// ─── Snap Indicators ─────────────────────────────────────────────────────────

/**
 * Returns snap indicator lines to draw on the canvas timeline UI.
 * Each indicator is an { x, label } where x is pixel position.
 *
 * @param activeSnapPoint - The currently active snap (from findSnap result)
 * @param scrollLeft - Timeline horizontal scroll offset in px
 * @param zoom - Timeline zoom factor
 */
export function getSnapIndicator(
  activeSnapPoint: SnapPoint | undefined,
  scrollLeft: number,
  zoom: number
): { xPx: number; label: string } | null {
  if (!activeSnapPoint) return null;
  const msPerUnit = zoom > 0 ? 1 / zoom : 1;
  const xPx = activeSnapPoint.timeMs / msPerUnit - scrollLeft;
  return {
    xPx,
    label: activeSnapPoint.label ?? activeSnapPoint.source,
  };
}