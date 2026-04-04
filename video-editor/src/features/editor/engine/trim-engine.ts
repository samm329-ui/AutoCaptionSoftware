/**
 * Trim Engine
 * Implements all professional NLE trimming operations:
 * - Ripple Edit (B): trim + shift all downstream clips
 * - Rolling Edit (N): adjust cut between two adjacent clips, preserve total duration
 * - Slip Tool (Y): move source in/out without changing timeline footprint
 * - Slide Tool (U): move clip, adjust neighbor durations
 * - Rate Stretch (R): change speed by stretching duration
 *
 * All functions are pure — they take the current state and return a new state.
 * Wire them up by dispatching EDIT_OBJECT with the returned mutations.
 */

import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { ITrack, ITrackItem } from "@designcombo/types";

export interface ClipBounds {
  id: string;
  trackId: string;
  /** Start time on timeline in ms */
  display_from: number;
  /** End time on timeline in ms */
  display_to: number;
  /** Source media start in ms */
  trim_start: number;
  /** Source media end in ms */
  trim_end: number;
  /** Total source media duration in ms */
  sourceDuration: number;
}

export interface TrimState {
  tracks: ITrack[];
  trackItemsMap: Record<string, ITrackItem>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get clips on a track sorted by start time
 */
function getTrackClips(state: TrimState, trackId: string): ITrackItem[] {
  const track = state.tracks.find((t) => t.id === trackId);
  if (!track) return [];
  const trackItemIds = (track as any).itemIds ?? (track as any).items ?? [];
  return trackItemIds
    .map((id: string) => state.trackItemsMap[id])
    .filter(Boolean)
    .sort((a: ITrackItem, b: ITrackItem) => (a.display?.from ?? 0) - (b.display?.from ?? 0));
}

/**
 * Get all clips across all tracks sorted by start time
 */
function getAllClipsSorted(state: TrimState): ITrackItem[] {
  return Object.values(state.trackItemsMap).sort(
    (a, b) => (a.display?.from ?? 0) - (b.display?.from ?? 0)
  );
}

/**
 * Get clips on the same track that start AFTER a given time
 */
function getDownstreamClips(
  state: TrimState,
  trackId: string,
  afterTime: number
): ITrackItem[] {
  return getTrackClips(state, trackId).filter(
    (c) => (c.display?.from ?? 0) > afterTime
  );
}

/**
 * Find the trackId for a given clip
 */
function findClipTrackId(clipId: string, state: TrimState): string {
  for (const track of state.tracks) {
    const trackItemIds = (track as any).itemIds ?? (track as any).items ?? [];
    if (trackItemIds.includes(clipId)) return track.id;
  }
  return "";
}

// ─── Ripple Edit ──────────────────────────────────────────────────────────────

/**
 * Ripple Edit: Trim a clip edge and shift ALL downstream clips on the same track
 * by the same delta. Total sequence duration changes.
 *
 * @param clipId - The clip being trimmed
 * @param edge - "start" trims the beginning, "end" trims the tail
 * @param deltaMs - Positive = make clip longer, Negative = shorter
 * @param state - Current editor state
 */
export function rippleEdit(
  clipId: string,
  edge: "start" | "end",
  deltaMs: number,
  state: TrimState
): Record<string, Partial<ITrackItem>> {
  const clip = state.trackItemsMap[clipId];
  if (!clip) return {};

  const mutations: Record<string, Partial<ITrackItem>> = {};
  const from = clip.display?.from ?? 0;
  const to = clip.display?.to ?? 0;
  const trimStart = clip.trim?.from ?? 0;
  const trimEnd = clip.trim?.to ?? to - from;

  if (edge === "end") {
    // Trim the tail of the clip
    const newTo = Math.max(from + 100, to + deltaMs); // min 100ms clip
    const actualDelta = newTo - to;

    mutations[clipId] = {
      display: { from, to: newTo },
      trim: { from: trimStart, to: trimEnd + actualDelta },
    };

    // Shift all downstream clips by actualDelta
    const trackId = findClipTrackId(clipId, state);
    const downstream = getDownstreamClips(state, trackId, from);
    for (const dc of downstream) {
      const dcFrom = dc.display?.from ?? 0;
      const dcTo = dc.display?.to ?? 0;
      mutations[dc.id] = {
        display: { from: dcFrom + actualDelta, to: dcTo + actualDelta },
      };
    }
  } else {
    // Trim the head of the clip
    const newFrom = Math.min(to - 100, from + deltaMs);
    const actualDelta = newFrom - from;

    mutations[clipId] = {
      display: { from: newFrom, to },
      trim: { from: trimStart + actualDelta, to: trimEnd },
    };

    // Shift downstream clips
    const trackId2 = findClipTrackId(clipId, state);
    const downstream = getDownstreamClips(state, trackId2, from);
    for (const dc of downstream) {
      const dcFrom = dc.display?.from ?? 0;
      const dcTo = dc.display?.to ?? 0;
      mutations[dc.id] = {
        display: { from: dcFrom + actualDelta, to: dcTo + actualDelta },
      };
    }
  }

  return mutations;
}

// ─── Rolling Edit ─────────────────────────────────────────────────────────────

/**
 * Rolling Edit: Adjust the cut point between two adjacent clips.
 * Left clip's out-point and right clip's in-point both move by delta.
 * Total sequence duration is PRESERVED.
 *
 * @param leftClipId - The clip to the left of the cut
 * @param rightClipId - The clip to the right of the cut
 * @param deltaMs - Positive = cut moves right (left clip longer, right clip shorter)
 */
export function rollingEdit(
  leftClipId: string,
  rightClipId: string,
  deltaMs: number,
  state: TrimState
): Record<string, Partial<ITrackItem>> {
  const left = state.trackItemsMap[leftClipId];
  const right = state.trackItemsMap[rightClipId];
  if (!left || !right) return {};

  const leftFrom = left.display?.from ?? 0;
  const leftTo = left.display?.to ?? 0;
  const rightFrom = right.display?.from ?? 0;
  const rightTo = right.display?.to ?? 0;

  const leftTrimStart = left.trim?.from ?? 0;
  const leftTrimEnd = left.trim?.to ?? leftTo - leftFrom;
  const rightTrimStart = right.trim?.from ?? 0;
  const rightTrimEnd = right.trim?.to ?? rightTo - rightFrom;

  // Clamp so neither clip goes below 100ms
  const maxDelta = Math.min(
    deltaMs,
    (rightTo - rightFrom) - 100,   // right clip can't go below 100ms
    leftTrimEnd - leftTrimStart     // left clip can't exceed its source handles
  );
  const minDelta = Math.max(
    deltaMs,
    -((leftTo - leftFrom) - 100),  // left clip can't go below 100ms
    -(rightTrimEnd - rightTrimStart) // right clip can't exceed its source
  );
  const safeDelta = Math.max(minDelta, Math.min(maxDelta, deltaMs));

  return {
    [leftClipId]: {
      display: { from: leftFrom, to: leftTo + safeDelta },
      trim: { from: leftTrimStart, to: leftTrimEnd + safeDelta },
    },
    [rightClipId]: {
      display: { from: rightFrom + safeDelta, to: rightTo },
      trim: { from: rightTrimStart + safeDelta, to: rightTrimEnd },
    },
  };
}

// ─── Slip Edit ────────────────────────────────────────────────────────────────

/**
 * Slip Tool: Move what part of the source media shows in the clip window.
 * Timeline footprint (display.from / display.to) does NOT change.
 * Only trim.from and trim.to shift together by deltaMs.
 *
 * @param clipId - The clip to slip
 * @param deltaMs - How many ms to slip the source content
 */
export function slipEdit(
  clipId: string,
  deltaMs: number,
  state: TrimState
): Record<string, Partial<ITrackItem>> {
  const clip = state.trackItemsMap[clipId];
  if (!clip) return {};

  const trimStart = clip.trim?.from ?? 0;
  const trimEnd = clip.trim?.to ?? (clip.display?.to ?? 0) - (clip.display?.from ?? 0);
  const clipDuration = trimEnd - trimStart;
  const sourceDuration = clip.details?.duration ?? clipDuration * 4; // fallback

  // Clamp: source start can't go below 0, source end can't exceed source duration
  const newTrimStart = Math.max(0, Math.min(sourceDuration - clipDuration, trimStart + deltaMs));
  const newTrimEnd = newTrimStart + clipDuration;

  return {
    [clipId]: {
      trim: { from: newTrimStart, to: newTrimEnd },
    },
  };
}

// ─── Slide Edit ───────────────────────────────────────────────────────────────

/**
 * Slide Tool: Move a clip's position on the timeline while adjusting
 * the surrounding clips to fill the gap. Total sequence duration preserved.
 *
 * Left neighbor's out-point extends/contracts.
 * Right neighbor's in-point extends/contracts.
 * The target clip's trim points don't change (only its timeline position).
 *
 * @param clipId - The clip to slide
 * @param deltaMs - Positive = slide right
 */
export function slideEdit(
  clipId: string,
  deltaMs: number,
  state: TrimState
): Record<string, Partial<ITrackItem>> {
  const clip = state.trackItemsMap[clipId];
  if (!clip) return {};

  const clipTrackId = findClipTrackId(clipId, state);
  const clips = getTrackClips(state, clipTrackId);
  const idx = clips.findIndex((c) => c.id === clipId);
  if (idx === -1) return {};

  const leftNeighbor = idx > 0 ? clips[idx - 1] : null;
  const rightNeighbor = idx < clips.length - 1 ? clips[idx + 1] : null;

  const from = clip.display?.from ?? 0;
  const to = clip.display?.to ?? 0;

  // Clamp delta so neighbors don't go below 100ms
  let safeDelta = deltaMs;
  if (leftNeighbor) {
    const leftDuration = (leftNeighbor.display?.to ?? 0) - (leftNeighbor.display?.from ?? 0);
    safeDelta = Math.max(safeDelta, -(leftDuration - 100));
  }
  if (rightNeighbor) {
    const rightDuration = (rightNeighbor.display?.to ?? 0) - (rightNeighbor.display?.from ?? 0);
    safeDelta = Math.min(safeDelta, rightDuration - 100);
  }

  const mutations: Record<string, Partial<ITrackItem>> = {
    [clipId]: {
      display: { from: from + safeDelta, to: to + safeDelta },
      // trim stays the same
    },
  };

  // Extend/contract left neighbor's tail
  if (leftNeighbor) {
    const lFrom = leftNeighbor.display?.from ?? 0;
    const lTo = leftNeighbor.display?.to ?? 0;
    const lTrimStart = leftNeighbor.trim?.from ?? 0;
    const lTrimEnd = leftNeighbor.trim?.to ?? lTo - lFrom;
    mutations[leftNeighbor.id] = {
      display: { from: lFrom, to: lTo + safeDelta },
      trim: { from: lTrimStart, to: lTrimEnd + safeDelta },
    };
  }

  // Extend/contract right neighbor's head
  if (rightNeighbor) {
    const rFrom = rightNeighbor.display?.from ?? 0;
    const rTo = rightNeighbor.display?.to ?? 0;
    const rTrimStart = rightNeighbor.trim?.from ?? 0;
    const rTrimEnd = rightNeighbor.trim?.to ?? rTo - rFrom;
    mutations[rightNeighbor.id] = {
      display: { from: rFrom + safeDelta, to: rTo },
      trim: { from: rTrimStart + safeDelta, to: rTrimEnd },
    };
  }

  return mutations;
}

// ─── Rate Stretch ─────────────────────────────────────────────────────────────

/**
 * Rate Stretch: Change the clip's duration, automatically adjusting playback speed.
 * Source in/out points stay the same; the clip stretches/compresses on the timeline.
 *
 * @param clipId - Target clip
 * @param newDurationMs - The desired new duration on the timeline
 */
export function rateStretch(
  clipId: string,
  newDurationMs: number,
  state: TrimState
): Record<string, Partial<ITrackItem>> {
  const clip = state.trackItemsMap[clipId];
  if (!clip) return {};

  const from = clip.display?.from ?? 0;
  const to = clip.display?.to ?? 0;
  const originalDuration = to - from;

  if (newDurationMs < 100) return {}; // min 100ms

  // Speed = original / new  (e.g., shrink to half = 2x speed)
  const newSpeed = originalDuration / newDurationMs;

  return {
    [clipId]: {
      display: { from, to: from + newDurationMs },
      details: {
        ...clip.details,
        speed: Math.max(0.1, Math.min(10, newSpeed)), // clamp 0.1x–10x
      },
    },
  };
}

// ─── Dispatch Helpers ─────────────────────────────────────────────────────────

/**
 * Apply a mutations map to the editor state via EDIT_OBJECT dispatch.
 * Call this after any trim operation.
 */
export function applyMutations(mutations: Record<string, Partial<ITrackItem>>): void {
  if (Object.keys(mutations).length === 0) return;
  dispatch(EDIT_OBJECT, { payload: mutations });
}

/**
 * Convenience: perform ripple trim and dispatch immediately.
 */
export function doRippleEdit(
  clipId: string,
  edge: "start" | "end",
  deltaMs: number,
  state: TrimState
): void {
  applyMutations(rippleEdit(clipId, edge, deltaMs, state));
}

/**
 * Convenience: perform rolling edit and dispatch immediately.
 */
export function doRollingEdit(
  leftClipId: string,
  rightClipId: string,
  deltaMs: number,
  state: TrimState
): void {
  applyMutations(rollingEdit(leftClipId, rightClipId, deltaMs, state));
}

/**
 * Convenience: perform slip edit and dispatch immediately.
 */
export function doSlipEdit(clipId: string, deltaMs: number, state: TrimState): void {
  applyMutations(slipEdit(clipId, deltaMs, state));
}

/**
 * Convenience: perform slide edit and dispatch immediately.
 */
export function doSlideEdit(clipId: string, deltaMs: number, state: TrimState): void {
  applyMutations(slideEdit(clipId, deltaMs, state));
}

/**
 * Convenience: rate stretch and dispatch immediately.
 */
export function doRateStretch(
  clipId: string,
  newDurationMs: number,
  state: TrimState
): void {
  applyMutations(rateStretch(clipId, newDurationMs, state));
}
