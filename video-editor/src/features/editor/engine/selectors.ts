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
 *   - Added null/undefined safety for SSR
 *
 * USAGE:
 *   import { selectActiveClip, selectOrderedTracks } from "../engine/selectors";
 *   const clip = useEngineSelector(selectActiveClip);
 */

import type { Project, Clip, Track, Sequence } from "./engine-core";

// Safe array getter
function getSelection(p: Project): string[] {
  if (!p?.ui?.selection) return [];
  return Array.isArray(p.ui.selection) ? p.ui.selection : [];
}

function getTracks(p: Project): Record<string, Track> {
  if (!p?.tracks) return {};
  return p.tracks;
}

function getClips(p: Project): Record<string, Clip> {
  if (!p?.clips) return {};
  return p.clips;
}

function getSequences(p: Project): Record<string, Sequence> {
  if (!p?.sequences) return {};
  return p.sequences;
}

function getRootSequence(p: Project): Sequence | null {
  const seqId = p?.rootSequenceId;
  if (!seqId) return null;
  const seqs = getSequences(p);
  if (!seqs[seqId]) return null;
  return seqs[seqId] as Sequence;
}

// ─── Clips ────────────────────────────────────────────────────────────────────

/** All clips sorted by display.from */
export function selectAllClips(p: Project): Clip[] {
  const clips = getClips(p);
  return Object.values(clips)
    .filter((c): c is Clip => !!c && c.display?.from != null)
    .sort((a, b) => (a.display?.from ?? 0) - (b.display?.from ?? 0));
}

/** The single active clip (when exactly one clip is selected) */
export function selectActiveClip(p: Project): Clip | null {
  const selection = getSelection(p);
  if (selection.length !== 1) return null;
  const clipId = selection[0];
  if (!clipId) return null;
  return getClips(p)[clipId] ?? null;
}

/** All currently selected clips */
export function selectSelectedClips(p: Project): Clip[] {
  const selection = getSelection(p);
  const clips = getClips(p);
  return selection
    .map((id) => clips[id])
    .filter((c): c is Clip => !!c);
}

/** Clips visible at the current playhead time */
export function selectClipsAtPlayhead(p: Project): Clip[] {
  const t = p.ui?.playheadTime ?? 0;
  const clips = getClips(p);
  return Object.values(clips).filter(
    (c): c is Clip => !!c && c.display?.from != null && c.display?.to != null && 
      (c.display.from <= t && c.display.to > t)
  );
}

/** A single clip by id */
export function selectClipById(id: string) {
  return (p: Project): Clip | null => getClips(p)[id] ?? null;
}

/** All clips on a given track, sorted by start time */
export function selectTrackClips(trackId: string) {
  return (p: Project): Clip[] => {
    const track = getTracks(p)[trackId];
    if (!track) return [];
    const clips = getClips(p);
    const clipIds = track.clipIds ?? [];
    return clipIds
      .map((id) => clips[id])
      .filter((c): c is Clip => !!c)
      .sort((a, b) => (a.display?.from ?? 0) - (b.display?.from ?? 0));
  };
}

// ─── Tracks ───────────────────────────────────────────────────────────────────

/** All tracks in sequence order (from root sequence trackIds) */
export function selectOrderedTracks(p: Project): Track[] {
  const seq = getRootSequence(p);
  if (!seq) return [];
  const trackIds = seq.trackIds ?? [];
  const tracks = getTracks(p);
  return trackIds
    .map((id) => tracks[id])
    .filter((t): t is Track => !!t)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** A single track by id */
export function selectTrackById(id: string) {
  return (p: Project): Track | null => getTracks(p)[id] ?? null;
}

/** The track that contains a given clip */
export function selectTrackForClip(clipId: string) {
  return (p: Project): Track | null => {
    const clip = getClips(p)[clipId];
    if (!clip) return null;
    return getTracks(p)[clip.trackId] ?? null;
  };
}

// ─── Sequence ─────────────────────────────────────────────────────────────────

export function selectRootSequence(p: Project): Sequence | null {
  return getRootSequence(p);
}

export function selectDuration(p: Project): number {
  const seq = getRootSequence(p);
  return seq?.duration ?? 10000;
}

export function selectFps(p: Project): number {
  const seq = getRootSequence(p);
  return seq?.fps ?? 30;
}

export function selectCanvasSize(p: Project): { width: number; height: number } {
  const seq = getRootSequence(p);
  const canvas = seq?.canvas;
  if (!canvas?.width || !canvas?.height) {
    return { width: 1080, height: 1920 };
  }
  return canvas;
}

// ─── UI state ─────────────────────────────────────────────────────────────────

export function selectSelection(p: Project): string[] { 
  return getSelection(p); 
}

export function selectPlayheadTime(p: Project): number { 
  return p.ui?.playheadTime ?? 0; 
}

export function selectZoom(p: Project): number { 
  return p.ui?.zoom ?? (1 / 300); 
}

export function selectScroll(p: Project): { scrollX: number; scrollY: number } {
  return { 
    scrollX: p.ui?.scrollX ?? 0, 
    scrollY: p.ui?.scrollY ?? 0 
  };
}

// ─── Derived ────────────────────────────────────────────────────────────────────

export function selectIsSingleSelection(p: Project): boolean { 
  return getSelection(p).length === 1; 
}

export function selectHasSelection(p: Project): boolean { 
  return getSelection(p).length > 0; 
}

export function selectClipCount(p: Project): number { 
  return Object.keys(getClips(p)).length; 
}

export function selectIsEmpty(p: Project): boolean { 
  return Object.keys(getClips(p)).length === 0; 
}

export function selectNaturalEndMs(p: Project): number {
  const clips = getClips(p);
  return Object.values(clips).reduce(
    (max, c) => (c?.display?.to ? Math.max(max, c.display.to) : max),
    0
  );
}

// ─── Equality helpers ─────────────────────────────────────────────────────────

export function shallowArrayEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export function shallowObjectEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => a[k] === b[k]);
}