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

import type { Project, Clip, Track, Sequence, KeyframeTrack, TimelineMarker } from "./engine-core";

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

/** Group priority for sorting: SUBTITLE → VIDEO → TEXT → AUDIO */
const GROUP_ORDER: Record<string, number> = {
  subtitle: 0,
  video: 1,
  text: 2,
  audio: 3,
};

/** All tracks in sequence order (from root sequence trackIds) */
export function selectOrderedTracks(p: Project): Track[] {
  const seq = getRootSequence(p);
  if (!seq) return [];
  const trackIds = seq.trackIds ?? [];
  const tracks = getTracks(p);
  return trackIds
    .map((id) => tracks[id])
    .filter((t): t is Track => !!t)
    .sort((a, b) => {
      const groupA = a.group || (a.type === "audio" ? "audio" : a.type === "caption" ? "subtitle" : a.type === "text" ? "text" : "video");
      const groupB = b.group || (b.type === "audio" ? "audio" : b.type === "caption" ? "subtitle" : b.type === "text" ? "text" : "video");
      const orderA = GROUP_ORDER[groupA] ?? 4;
      const orderB = GROUP_ORDER[groupB] ?? 4;
      if (orderA !== orderB) return orderA - orderB;
      return (a.order ?? 0) - (b.order ?? 0);
    });
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

// ─── Lane/Group selectors ───────────────────────────────────────────────────

export type TrackGroup = "subtitle" | "text" | "video" | "audio";

/** All groups in canonical order: SUBTITLE → VIDEO → TEXT → AUDIO */
export function selectTimelineGroups(p: Project): TrackGroup[] {
  return ["subtitle", "video", "text", "audio"];
}

/** Tracks filtered by group */
export function selectTracksByGroup(group: TrackGroup) {
  return (p: Project): Track[] => {
    const tracks = getTracks(p);
    return Object.values(tracks)
      .filter((t): t is Track => !!t && t.group === group)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  };
}

/** Track matrix: grouped tracks in canonical order */
export function selectTrackMatrix(p: Project): Record<TrackGroup, Track[]> {
  const groups = selectTimelineGroups(p);
  const tracks = getTracks(p);
  const matrix: Record<TrackGroup, Track[]> = { subtitle: [], text: [], video: [], audio: [] };
  
  for (const group of groups) {
    matrix[group] = Object.values(tracks)
      .filter((t): t is Track => !!t && t.group === group)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  
  return matrix;
}

/** Only tracks that are actually in the sequence */
export function selectSequenceTracks(p: Project): Track[] {
  const seq = getRootSequence(p);
  if (!seq) return [];
  const trackIds = seq.trackIds ?? [];
  const tracks = getTracks(p);
  return trackIds
    .map((id) => tracks[id])
    .filter((t): t is Track => !!t);
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
  const clipValues = Object.values(clips);
  
  if (clipValues.length > 0) {
    const maxDisplayTo = Math.max(...clipValues.map(c => c?.display?.to ?? 0));
    return Math.round(maxDisplayTo);
  }
  
  return 0;
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

// ─── Layout State ───────────────────────────────────────────────────────────

export function selectLayoutState(p: Project) {
  return {
    activeMenuItem: p.ui?.activeMenuItem ?? null,
    showMenuItem: p.ui?.showMenuItem ?? false,
    showControlItem: p.ui?.showControlItem ?? false,
    showToolboxItem: p.ui?.showToolboxItem ?? false,
    activeToolboxItem: p.ui?.activeToolboxItem ?? null,
    floatingControl: p.ui?.floatingControl ?? null,
    drawerOpen: p.ui?.drawerOpen ?? false,
    controItemDrawerOpen: p.ui?.controItemDrawerOpen ?? false,
    typeControlItem: p.ui?.typeControlItem ?? "",
    labelControlItem: p.ui?.labelControlItem ?? "",
  };
}

// ─── Crop State ──────────────────────────────────────────────────────────────

export function selectCropState(p: Project) {
  return {
    cropTarget: p.ui?.cropTarget ?? null,
    cropArea: p.ui?.cropArea ?? [0, 0, 0, 0],
    cropSrc: p.ui?.cropSrc ?? "",
    cropElement: p.ui?.cropElement ?? null,
    cropFileLoading: p.ui?.cropFileLoading ?? false,
    cropStep: p.ui?.cropStep ?? 0,
    cropScale: p.ui?.cropScale ?? 1,
    cropSize: p.ui?.cropSize ?? { width: 0, height: 0 },
  };
}

// ─── Download State ───────────────────────────────────────────────────────────

export function selectDownloadState(p: Project) {
  return {
    projectId: p.ui?.projectId ?? "",
    exporting: p.ui?.exporting ?? false,
    exportType: p.ui?.exportType ?? "mp4",
    exportProgress: p.ui?.exportProgress ?? 0,
    exportOutput: p.ui?.exportOutput ?? null,
    displayProgressModal: p.ui?.displayProgressModal ?? false,
  };
}

// ─── Folder State ───────────────────────────────────────────────────────────

export function selectFolderState(p: Project) {
  return {
    valueFolder: p.ui?.valueFolder ?? "",
    folderVideos: p.ui?.folderVideos ?? [],
  };
}

// ─── Upload State ────────────────────────────────────────────────────────────

export function selectUploads(p: Project): typeof p.uploads {
  return p.uploads ?? [];
}

export function selectFolders(p: Project): typeof p.folders {
  return p.folders ?? [];
}

export function selectMediaAssets(p: Project): typeof p.mediaAssets {
  return p.mediaAssets ?? [];
}

export function selectShowUploadModal(p: Project): boolean {
  return p.showUploadModal ?? false;
}

// ─── Data State (Fonts) ─────────────────────────────────────────────────────

export function selectFonts(p: Project): typeof p.fonts {
  return p.fonts ?? [];
}

export function selectCompactFonts(p: Project): typeof p.compactFonts {
  return p.compactFonts ?? [];
}

// ─── Keyframe State ─────────────────────────────────────────────────────────

export function selectKeyframesByClip(p: Project): typeof p.keyframesByClip {
  return p.keyframesByClip ?? {};
}

export function selectClipKeyframes(clipId: string) {
  return (p: Project): Record<string, KeyframeTrack> => {
    return p.keyframesByClip?.[clipId] ?? {};
  };
}

// ─── Runtime State ─────────────────────────────────────────────────────────

export function selectPlayerRef(p: Project): unknown {
  return p.playerRef ?? null;
}

export function selectSceneMoveableRef(p: Project): unknown {
  return p.sceneMoveableRef ?? null;
}

export function selectBackground(p: Project): { type: "color" | "image"; value: string } {
  return p.background ?? { type: "color", value: "transparent" };
}

export function selectViewTimeline(p: Project): boolean {
  return p.viewTimeline ?? true;
}

// ─── Marker State ───────────────────────────────────────────────────────────

export function selectTimelineMarkers(p: Project): TimelineMarker[] {
  return p.timelineMarkers ?? [];
}

export function selectMarkerById(id: string) {
  return (p: Project): TimelineMarker | undefined => {
    return p.timelineMarkers?.find((m) => m.id === id);
  };
}

export function selectMarkersInRange(fromMs: number, toMs: number) {
  return (p: Project): TimelineMarker[] => {
    return (p.timelineMarkers ?? []).filter(
      (m) => m.timeMs >= fromMs && m.timeMs <= toMs
    );
  };
}

export function selectMarkerTimes(p: Project): number[] {
  return (p.timelineMarkers ?? []).map((m) => m.timeMs);
}