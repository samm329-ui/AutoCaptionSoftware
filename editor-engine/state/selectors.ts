/**
 * state/selectors.ts
 * Pure selector functions. No state owned here — only derived reads.
 *
 * All selectors are pure functions: (Project) => derived value.
 * Memoisation (e.g. reselect) can be layered on top if needed.
 */

import type {
  Project,
  Track,
  Clip,
  Caption,
  Milliseconds,
} from "../model/schema";

// ─── Track Selectors ─────────────────────────────────────────────────────────

/** All tracks in display order (ascending .order) */
export function getOrderedTracks(project: Project): Track[] {
  const seq = project.sequences[project.rootSequenceId];
  if (!seq) return [];
  return seq.trackIds
    .map((id) => project.tracks[id])
    .filter(Boolean)
    .sort((a, b) => a!.order - b!.order) as Track[];
}

/** All clips on a given track, sorted by start time */
export function getTrackClips(project: Project, trackId: string): Clip[] {
  const track = project.tracks[trackId];
  if (!track) return [];
  return track.clipIds
    .map((id) => project.clips[id])
    .filter(Boolean)
    .sort((a, b) => a!.display.from - b!.display.from) as Clip[];
}

// ─── Selection Selectors ─────────────────────────────────────────────────────

export function getSelectedClips(project: Project): Clip[] {
  return project.ui.selection
    .map((id) => project.clips[id])
    .filter(Boolean) as Clip[];
}

export function isSingleSelection(project: Project): boolean {
  return project.ui.selection.length === 1;
}

export function getActiveClip(project: Project): Clip | null {
  if (project.ui.selection.length !== 1) return null;
  return project.clips[project.ui.selection[0]] ?? null;
}

// ─── Timeline Selectors ───────────────────────────────────────────────────────

/** Total duration of the root sequence in ms */
export function getDuration(project: Project): Milliseconds {
  return project.sequences[project.rootSequenceId]?.duration ?? 0;
}

/** Canvas size of the root sequence */
export function getCanvasSize(project: Project): { width: number; height: number } {
  return project.sequences[project.rootSequenceId]?.canvas ?? { width: 1080, height: 1920 };
}

/** All clips visible at a given playhead time */
export function getClipsAtTime(project: Project, timeMs: Milliseconds): Clip[] {
  return Object.values(project.clips).filter(
    (clip) => clip && clip.display.from <= timeMs && clip.display.to > timeMs
  ) as Clip[];
}

/** Clip at a given pixel x position on the timeline, given scroll/zoom */
export function getClipAtTimelineX(
  project: Project,
  xPx: number,
  scrollX: number,
  zoom: number
): Clip | null {
  const timeMs = (xPx + scrollX) / zoom;
  // Intentionally returns first match; callers should do track-level hit test
  return getClipsAtTime(project, timeMs)[0] ?? null;
}

// ─── Caption Selectors ────────────────────────────────────────────────────────

/** All captions sorted by start time */
export function getSortedCaptions(project: Project): Caption[] {
  return Object.values(project.captions)
    .filter(Boolean)
    .sort((a, b) => a!.start - b!.start) as Caption[];
}

/** Captions visible at a given time */
export function getCaptionsAtTime(project: Project, timeMs: Milliseconds): Caption[] {
  return getSortedCaptions(project).filter(
    (c) => c.start <= timeMs && c.end > timeMs
  );
}

// ─── Derived Duration ────────────────────────────────────────────────────────

/** Compute the natural end of the last clip across all tracks */
export function computeNaturalDuration(project: Project): Milliseconds {
  let max = 0;
  for (const clip of Object.values(project.clips)) {
    if (clip && clip.display.to > max) max = clip.display.to;
  }
  return max;
}

// ─── Snap Points ─────────────────────────────────────────────────────────────

export interface SnapPoint {
  timeMs: Milliseconds;
  source: "clip-start" | "clip-end" | "playhead" | "marker" | "origin";
  label?: string;
}

/** Build a sorted list of snap points from the current project state */
export function getSnapPoints(
  project: Project,
  excludeClipIds: Set<string> = new Set()
): SnapPoint[] {
  const points: SnapPoint[] = [{ timeMs: 0, source: "origin", label: "Start" }];

  for (const [id, clip] of Object.entries(project.clips)) {
    if (excludeClipIds.has(id) || !clip) continue;
    points.push({ timeMs: clip.display.from, source: "clip-start" });
    points.push({ timeMs: clip.display.to, source: "clip-end" });
  }

  points.push({ timeMs: project.ui.playheadTime, source: "playhead", label: "Playhead" });

  for (const marker of Object.values(project.markers)) {
    if (marker) points.push({ timeMs: marker.time, source: "marker", label: marker.label });
  }

  return points.sort((a, b) => a.timeMs - b.timeMs);
}
