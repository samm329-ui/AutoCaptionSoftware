/**
 * engine/selectors.ts — FIXED
 *
 * REVIEW FIXES:
 *   - Removed selectClipAsTrackItem, selectTrackItemsMap, selectTrackItemIds.
 *     These were legacy compatibility helpers that encouraged old-model reads
 *     to survive in the main selector API.
 *   - They have been moved to engine/migration-adapter.ts which is explicitly
 *     marked for deletion once the last consumer (player, timeline) is migrated.
 *   - This file now contains ONLY pure engine selectors. No ITrackItem shapes.
 *
 * USAGE:
 *   import { selectActiveClip, selectOrderedTracks } from "../engine/selectors";
 *   const clip = useEngineSelector(selectActiveClip);
 */

import type { Project, Clip, Track, Sequence } from "./engine-core";

// ─── Clips ────────────────────────────────────────────────────────────────────

/** All clips sorted by display.from */
export function selectAllClips(p: Project): Clip[] {
  return Object.values(p.clips)
    .filter((c): c is Clip => !!c)
    .sort((a, b) => a.display.from - b.display.from);
}

/** The single active clip (when exactly one clip is selected) */
export function selectActiveClip(p: Project): Clip | null {
  const { selection } = p.ui;
  if (selection.length !== 1) return null;
  return p.clips[selection[0]] ?? null;
}

/** All currently selected clips */
export function selectSelectedClips(p: Project): Clip[] {
  return p.ui.selection
    .map((id) => p.clips[id])
    .filter((c): c is Clip => !!c);
}

/** Clips visible at the current playhead time */
export function selectClipsAtPlayhead(p: Project): Clip[] {
  const t = p.ui.playheadTime;
  return Object.values(p.clips).filter(
    (c): c is Clip => !!c && c.display.from <= t && c.display.to > t
  );
}

/** A single clip by id */
export function selectClipById(id: string) {
  return (p: Project): Clip | null => p.clips[id] ?? null;
}

/** All clips on a given track, sorted by start time */
export function selectTrackClips(trackId: string) {
  return (p: Project): Clip[] => {
    const track = p.tracks[trackId];
    if (!track) return [];
    return track.clipIds
      .map((id) => p.clips[id])
      .filter((c): c is Clip => !!c)
      .sort((a, b) => a.display.from - b.display.from);
  };
}

// ─── Tracks ───────────────────────────────────────────────────────────────────

/** All tracks in sequence order (from root sequence trackIds) */
export function selectOrderedTracks(p: Project): Track[] {
  const seq = p.sequences[p.rootSequenceId];
  if (!seq) return [];
  return seq.trackIds
    .map((id) => p.tracks[id])
    .filter((t): t is Track => !!t)
    .sort((a, b) => a.order - b.order);
}

/** A single track by id */
export function selectTrackById(id: string) {
  return (p: Project): Track | null => p.tracks[id] ?? null;
}

/** The track that contains a given clip */
export function selectTrackForClip(clipId: string) {
  return (p: Project): Track | null => {
    const clip = p.clips[clipId];
    if (!clip) return null;
    return p.tracks[clip.trackId] ?? null;
  };
}

// ─── Sequence ─────────────────────────────────────────────────────────────────

export function selectRootSequence(p: Project): Sequence | null {
  return p.sequences[p.rootSequenceId] ?? null;
}

export function selectDuration(p: Project): number {
  return p.sequences[p.rootSequenceId]?.duration ?? 0;
}

export function selectFps(p: Project): number {
  return p.sequences[p.rootSequenceId]?.fps ?? 30;
}

export function selectCanvasSize(p: Project): { width: number; height: number } {
  return p.sequences[p.rootSequenceId]?.canvas ?? { width: 1080, height: 1920 };
}

// ─── UI state ─────────────────────────────────────────────────────────────────

export function selectSelection(p: Project): string[] { return p.ui.selection; }
export function selectPlayheadTime(p: Project): number { return p.ui.playheadTime; }
export function selectZoom(p: Project): number { return p.ui.zoom; }
export function selectScroll(p: Project): { scrollX: number; scrollY: number } {
  return { scrollX: p.ui.scrollX, scrollY: p.ui.scrollY };
}

// ─── Derived ────────────────────────────────────────────────────────────────────

export function selectIsSingleSelection(p: Project): boolean { return p.ui.selection.length === 1; }
export function selectHasSelection(p: Project): boolean { return p.ui.selection.length > 0; }
export function selectClipCount(p: Project): number { return Object.keys(p.clips).length; }
export function selectIsEmpty(p: Project): boolean { return Object.keys(p.clips).length === 0; }

export function selectNaturalEndMs(p: Project): number {
  return Object.values(p.clips).reduce(
    (max, c) => (c ? Math.max(max, c.display.to) : max),
    0
  );
}

// ─── Equality helpers ─────────────────────────────────────────────────────────

export function shallowArrayEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export function shallowObjectEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  if (a === b) return true;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => a[k] === b[k]);
}
