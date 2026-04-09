/**
 * state/reducer.ts
 * Pure reducer: (Project, EditorCommand) => Project
 *
 * Rules:
 *  - Never mutates input state
 *  - Returns same reference if nothing changed
 *  - All times in ms, all positions in px
 *  - Validation happens BEFORE the command is dispatched (see validation/)
 */

import type { Project, Clip, Track, ClipDisplay, ClipTrim } from "../model/schema";
import type { EditorCommand } from "../commands";
import { DEFAULT_TRANSFORM } from "../model/schema";
import { nanoid } from "../utils/id";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mergeClip(clip: Clip, patch: Partial<Clip>): Clip {
  return {
    ...clip,
    ...patch,
    details: patch.details ? { ...clip.details, ...patch.details } : clip.details,
    transform: patch.transform ? { ...clip.transform, ...patch.transform } : clip.transform,
    display: patch.display ? { ...clip.display, ...patch.display } : clip.display,
    trim: patch.trim ? { ...clip.trim, ...patch.trim } : clip.trim,
  };
}

function removeFromArray<T>(arr: T[], item: T): T[] {
  const idx = arr.indexOf(item);
  if (idx === -1) return arr;
  return [...arr.slice(0, idx), ...arr.slice(idx + 1)];
}

function insertSorted(arr: string[], id: string): string[] {
  return arr.includes(id) ? arr : [...arr, id];
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function reducer(state: Project, command: EditorCommand): Project {
  switch (command.type) {

    // ── ADD_CLIP ─────────────────────────────────────────────────────────────
    case "ADD_CLIP": {
      const { clip: rawClip, trackId } = command.payload;

      const clip: Clip = {
        effectIds: [],
        keyframeIds: [],
        ...rawClip,
        transform: { ...DEFAULT_TRANSFORM, ...(rawClip as any).transform },
      };

      const targetTrackId = trackId ?? clip.trackId;

      if (!targetTrackId || !state.tracks[targetTrackId]) {
        return state; // guard: track must exist
      }

      const track = state.tracks[targetTrackId];
      const updatedTrack: Track = {
        ...track,
        clipIds: [...track.clipIds, clip.id],
      };

      return {
        ...state,
        clips: { ...state.clips, [clip.id]: { ...clip, trackId: targetTrackId } },
        tracks: { ...state.tracks, [targetTrackId]: updatedTrack },
      };
    }

    // ── MOVE_CLIP ────────────────────────────────────────────────────────────
    case "MOVE_CLIP": {
      const { clipId, newStart, newTrackId } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;

      const duration = clip.display.to - clip.display.from;
      const updatedClip = mergeClip(clip, {
        display: { from: newStart, to: newStart + duration },
        trackId: newTrackId ?? clip.trackId,
      });

      let tracks = state.tracks;

      if (newTrackId && newTrackId !== clip.trackId) {
        const oldTrack = state.tracks[clip.trackId];
        const newTrack = state.tracks[newTrackId];
        if (!oldTrack || !newTrack) return state;

        tracks = {
          ...tracks,
          [clip.trackId]: { ...oldTrack, clipIds: removeFromArray(oldTrack.clipIds, clipId) },
          [newTrackId]: { ...newTrack, clipIds: insertSorted(newTrack.clipIds, clipId) },
        };
      }

      return {
        ...state,
        clips: { ...state.clips, [clipId]: updatedClip },
        tracks,
      };
    }

    // ── TRIM_CLIP ────────────────────────────────────────────────────────────
    case "TRIM_CLIP": {
      const { clipId, display, trim } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;

      return {
        ...state,
        clips: {
          ...state.clips,
          [clipId]: mergeClip(clip, { display, trim }),
        },
      };
    }

    // ── SPLIT_CLIP ───────────────────────────────────────────────────────────
    case "SPLIT_CLIP": {
      const { clipId, splitAt, leftId, rightId } = command.payload;
      const original = state.clips[clipId];
      if (!original) return state;

      const { from, to } = original.display;
      if (splitAt <= from || splitAt >= to) return state;

      const trimDuration = original.trim.to - original.trim.from;
      const clipDuration = to - from;
      const splitRatio = (splitAt - from) / clipDuration;
      const trimSplit = original.trim.from + trimDuration * splitRatio;

      const leftClip: Clip = {
        ...original,
        id: leftId,
        display: { from, to: splitAt },
        trim: { from: original.trim.from, to: trimSplit },
        keyframeIds: [],
      };

      const rightClip: Clip = {
        ...original,
        id: rightId,
        display: { from: splitAt, to },
        trim: { from: trimSplit, to: original.trim.to },
        keyframeIds: [],
      };

      const track = state.tracks[original.trackId];
      if (!track) return state;

      const newClipIds = track.clipIds
        .filter((id) => id !== clipId)
        .concat([leftId, rightId]);

      const newClips = { ...state.clips };
      delete newClips[clipId];
      newClips[leftId] = leftClip;
      newClips[rightId] = rightClip;

      return {
        ...state,
        clips: newClips,
        tracks: {
          ...state.tracks,
          [original.trackId]: { ...track, clipIds: newClipIds },
        },
      };
    }

    // ── DELETE_CLIP ──────────────────────────────────────────────────────────
    case "DELETE_CLIP": {
      const { clipIds } = command.payload;
      const idSet = new Set(clipIds);

      const newClips = { ...state.clips };
      const newTracks = { ...state.tracks };
      const affectedTracks = new Set<string>();

      for (const id of idSet) {
        const clip = state.clips[id];
        if (clip) affectedTracks.add(clip.trackId);
        delete newClips[id];
      }

      for (const trackId of affectedTracks) {
        const track = state.tracks[trackId];
        if (track) {
          newTracks[trackId] = {
            ...track,
            clipIds: track.clipIds.filter((id) => !idSet.has(id)),
          };
        }
      }

      return {
        ...state,
        clips: newClips,
        tracks: newTracks,
        ui: {
          ...state.ui,
          selection: state.ui.selection.filter((id) => !idSet.has(id)),
        },
      };
    }

    // ── DUPLICATE_CLIP ───────────────────────────────────────────────────────
    case "DUPLICATE_CLIP": {
      const { clipId, newClipId, offsetMs = 0 } = command.payload;
      const original = state.clips[clipId];
      if (!original) return state;

      const duration = original.display.to - original.display.from;
      const newStart = original.display.from + offsetMs;

      const newClip: Clip = {
        ...original,
        id: newClipId,
        name: `${original.name} (copy)`,
        display: { from: newStart, to: newStart + duration },
        keyframeIds: [],
      };

      const track = state.tracks[original.trackId];
      if (!track) return state;

      return {
        ...state,
        clips: { ...state.clips, [newClipId]: newClip },
        tracks: {
          ...state.tracks,
          [original.trackId]: {
            ...track,
            clipIds: [...track.clipIds, newClipId],
          },
        },
      };
    }

    // ── UPDATE_CLIP ──────────────────────────────────────────────────────────
    case "UPDATE_CLIP": {
      const { clipId, ...patch } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;

      return {
        ...state,
        clips: { ...state.clips, [clipId]: mergeClip(clip, patch as Partial<Clip>) },
      };
    }

    // ── RIPPLE_EDIT ──────────────────────────────────────────────────────────
    case "RIPPLE_EDIT": {
      const { clipId, edge, deltaMs } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;

      const { from, to } = clip.display;
      const { from: trimFrom, to: trimTo } = clip.trim;

      let newDisplay: ClipDisplay;
      let newTrim: ClipTrim;
      let actualDelta: number;

      if (edge === "end") {
        const newTo = Math.max(from + 100, to + deltaMs);
        actualDelta = newTo - to;
        newDisplay = { from, to: newTo };
        newTrim = { from: trimFrom, to: trimTo + actualDelta };
      } else {
        const newFrom = Math.min(to - 100, from + deltaMs);
        actualDelta = newFrom - from;
        newDisplay = { from: newFrom, to };
        newTrim = { from: trimFrom + actualDelta, to: trimTo };
      }

      const track = state.tracks[clip.trackId];
      const downstream = (track?.clipIds ?? [])
        .map((id) => state.clips[id])
        .filter((c) => c && c.display.from > from) as Clip[];

      const newClips: Record<string, Clip> = {
        ...state.clips,
        [clipId]: mergeClip(clip, { display: newDisplay, trim: newTrim }),
      };

      for (const dc of downstream) {
        newClips[dc.id] = mergeClip(dc, {
          display: {
            from: dc.display.from + actualDelta,
            to: dc.display.to + actualDelta,
          },
        });
      }

      return { ...state, clips: newClips };
    }

    // ── ROLLING_EDIT ─────────────────────────────────────────────────────────
    case "ROLLING_EDIT": {
      const { leftClipId, rightClipId, deltaMs } = command.payload;
      const left = state.clips[leftClipId];
      const right = state.clips[rightClipId];
      if (!left || !right) return state;

      const safeDelta = Math.max(
        Math.min(deltaMs, (right.display.to - right.display.from) - 100),
        -((left.display.to - left.display.from) - 100)
      );

      return {
        ...state,
        clips: {
          ...state.clips,
          [leftClipId]: mergeClip(left, {
            display: { from: left.display.from, to: left.display.to + safeDelta },
            trim: { from: left.trim.from, to: left.trim.to + safeDelta },
          }),
          [rightClipId]: mergeClip(right, {
            display: { from: right.display.from + safeDelta, to: right.display.to },
            trim: { from: right.trim.from + safeDelta, to: right.trim.to },
          }),
        },
      };
    }

    // ── SLIP_EDIT ────────────────────────────────────────────────────────────
    case "SLIP_EDIT": {
      const { clipId, deltaMs } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;

      const clipDuration = clip.trim.to - clip.trim.from;
      const sourceDuration = (clip.details.duration as number) ?? clipDuration * 4;
      const newTrimFrom = Math.max(0, Math.min(sourceDuration - clipDuration, clip.trim.from + deltaMs));

      return {
        ...state,
        clips: {
          ...state.clips,
          [clipId]: mergeClip(clip, {
            trim: { from: newTrimFrom, to: newTrimFrom + clipDuration },
          }),
        },
      };
    }

    // ── SLIDE_EDIT ───────────────────────────────────────────────────────────
    case "SLIDE_EDIT": {
      const { clipId, deltaMs } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;

      const track = state.tracks[clip.trackId];
      if (!track) return state;

      const sorted = track.clipIds
        .map((id) => state.clips[id])
        .filter(Boolean)
        .sort((a, b) => a!.display.from - b!.display.from) as Clip[];

      const idx = sorted.findIndex((c) => c.id === clipId);
      const left = idx > 0 ? sorted[idx - 1] : null;
      const right = idx < sorted.length - 1 ? sorted[idx + 1] : null;

      let safe = deltaMs;
      if (left) safe = Math.max(safe, -((left.display.to - left.display.from) - 100));
      if (right) safe = Math.min(safe, (right.display.to - right.display.from) - 100);

      const newClips: Record<string, Clip> = {
        ...state.clips,
        [clipId]: mergeClip(clip, {
          display: { from: clip.display.from + safe, to: clip.display.to + safe },
        }),
      };
      if (left) {
        newClips[left.id] = mergeClip(left, {
          display: { from: left.display.from, to: left.display.to + safe },
          trim: { from: left.trim.from, to: left.trim.to + safe },
        });
      }
      if (right) {
        newClips[right.id] = mergeClip(right, {
          display: { from: right.display.from + safe, to: right.display.to },
          trim: { from: right.trim.from + safe, to: right.trim.to },
        });
      }

      return { ...state, clips: newClips };
    }

    // ── ADD_EFFECT ───────────────────────────────────────────────────────────
    case "ADD_EFFECT": {
      const { clipId, effect } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;

      return {
        ...state,
        effects: { ...state.effects, [effect.id]: effect },
        clips: {
          ...state.clips,
          [clipId]: {
            ...clip,
            effectIds: [...clip.effectIds, effect.id],
          },
        },
      };
    }

    // ── REMOVE_EFFECT ────────────────────────────────────────────────────────
    case "REMOVE_EFFECT": {
      const { clipId, effectId } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;

      const newEffects = { ...state.effects };
      delete newEffects[effectId];

      return {
        ...state,
        effects: newEffects,
        clips: {
          ...state.clips,
          [clipId]: {
            ...clip,
            effectIds: clip.effectIds.filter((id) => id !== effectId),
          },
        },
      };
    }

    // ── UPDATE_EFFECT ────────────────────────────────────────────────────────
    case "UPDATE_EFFECT": {
      const { effectId, params } = command.payload;
      const effect = state.effects[effectId];
      if (!effect) return state;

      return {
        ...state,
        effects: {
          ...state.effects,
          [effectId]: { ...effect, params: { ...effect.params, ...params } },
        },
      };
    }

    // ── ADD_TRANSITION ───────────────────────────────────────────────────────
    case "ADD_TRANSITION": {
      const { transition } = command.payload;
      return {
        ...state,
        transitions: { ...state.transitions, [transition.id]: transition },
      };
    }

    // ── REMOVE_TRANSITION ────────────────────────────────────────────────────
    case "REMOVE_TRANSITION": {
      const { transitionId } = command.payload;
      const newTransitions = { ...state.transitions };
      delete newTransitions[transitionId];
      return { ...state, transitions: newTransitions };
    }

    // ── ADD_TRACK ────────────────────────────────────────────────────────────
    case "ADD_TRACK": {
      const { track: rawTrack } = command.payload;
      const track: Track = { clipIds: [], ...rawTrack };
      const seq = state.sequences[state.rootSequenceId];

      return {
        ...state,
        tracks: { ...state.tracks, [track.id]: track },
        sequences: {
          ...state.sequences,
          [state.rootSequenceId]: {
            ...seq,
            trackIds: [...seq.trackIds, track.id],
          },
        },
      };
    }

    // ── REMOVE_TRACK ─────────────────────────────────────────────────────────
    case "REMOVE_TRACK": {
      const { trackId } = command.payload;
      const track = state.tracks[trackId];
      if (!track) return state;

      const newTracks = { ...state.tracks };
      delete newTracks[trackId];

      const newClips = { ...state.clips };
      for (const clipId of track.clipIds) delete newClips[clipId];

      const seq = state.sequences[state.rootSequenceId];
      return {
        ...state,
        tracks: newTracks,
        clips: newClips,
        sequences: {
          ...state.sequences,
          [state.rootSequenceId]: {
            ...seq,
            trackIds: seq.trackIds.filter((id) => id !== trackId),
          },
        },
      };
    }

    // ── REORDER_TRACK ────────────────────────────────────────────────────────
    case "REORDER_TRACK": {
      const { trackId, newOrder } = command.payload;
      const track = state.tracks[trackId];
      if (!track) return state;

      return {
        ...state,
        tracks: {
          ...state.tracks,
          [trackId]: { ...track, order: newOrder },
        },
      };
    }

    // ── UPDATE_TRACK ─────────────────────────────────────────────────────────
    case "UPDATE_TRACK": {
      const { trackId, ...patch } = command.payload;
      const track = state.tracks[trackId];
      if (!track) return state;

      return {
        ...state,
        tracks: { ...state.tracks, [trackId]: { ...track, ...patch } },
      };
    }

    // ── ADD_KEYFRAME ─────────────────────────────────────────────────────────
    case "ADD_KEYFRAME": {
      const { keyframe } = command.payload;
      const clip = state.clips[keyframe.clipId];
      if (!clip) return state;

      return {
        ...state,
        keyframes: { ...state.keyframes, [keyframe.id]: keyframe },
        clips: {
          ...state.clips,
          [keyframe.clipId]: {
            ...clip,
            keyframeIds: [...clip.keyframeIds, keyframe.id],
          },
        },
      };
    }

    // ── REMOVE_KEYFRAME ──────────────────────────────────────────────────────
    case "REMOVE_KEYFRAME": {
      const { keyframeId } = command.payload;
      const kf = state.keyframes[keyframeId];
      if (!kf) return state;

      const clip = state.clips[kf.clipId];
      const newKeyframes = { ...state.keyframes };
      delete newKeyframes[keyframeId];

      return {
        ...state,
        keyframes: newKeyframes,
        clips: clip
          ? {
              ...state.clips,
              [kf.clipId]: {
                ...clip,
                keyframeIds: clip.keyframeIds.filter((id) => id !== keyframeId),
              },
            }
          : state.clips,
      };
    }

    // ── UPDATE_KEYFRAME ──────────────────────────────────────────────────────
    case "UPDATE_KEYFRAME": {
      const { keyframeId, ...patch } = command.payload;
      const kf = state.keyframes[keyframeId];
      if (!kf) return state;

      return {
        ...state,
        keyframes: {
          ...state.keyframes,
          [keyframeId]: { ...kf, ...patch },
        },
      };
    }

    // ── ADD_MARKER ───────────────────────────────────────────────────────────
    case "ADD_MARKER": {
      const { marker } = command.payload;
      return { ...state, markers: { ...state.markers, [marker.id]: marker } };
    }

    // ── REMOVE_MARKER ────────────────────────────────────────────────────────
    case "REMOVE_MARKER": {
      const { markerId } = command.payload;
      const newMarkers = { ...state.markers };
      delete newMarkers[markerId];
      return { ...state, markers: newMarkers };
    }

    // ── SET_SELECTION ────────────────────────────────────────────────────────
    case "SET_SELECTION": {
      return { ...state, ui: { ...state.ui, selection: command.payload.clipIds } };
    }

    case "ADD_TO_SELECTION": {
      const { clipId } = command.payload;
      if (state.ui.selection.includes(clipId)) return state;
      return {
        ...state,
        ui: { ...state.ui, selection: [...state.ui.selection, clipId] },
      };
    }

    case "CLEAR_SELECTION": {
      if (state.ui.selection.length === 0) return state;
      return { ...state, ui: { ...state.ui, selection: [] } };
    }

    // ── SET_PLAYHEAD ─────────────────────────────────────────────────────────
    case "SET_PLAYHEAD": {
      const seq = state.sequences[state.rootSequenceId];
      const clampedTime = Math.max(0, Math.min(seq?.duration ?? Infinity, command.payload.timeMs));
      if (clampedTime === state.ui.playheadTime) return state;
      return { ...state, ui: { ...state.ui, playheadTime: clampedTime } };
    }

    // ── SET_ZOOM ─────────────────────────────────────────────────────────────
    case "SET_ZOOM": {
      return { ...state, ui: { ...state.ui, zoom: Math.max(0.001, command.payload.zoom) } };
    }

    // ── SET_SCROLL ───────────────────────────────────────────────────────────
    case "SET_SCROLL": {
      const { scrollX, scrollY } = command.payload;
      return {
        ...state,
        ui: {
          ...state.ui,
          scrollX: scrollX ?? state.ui.scrollX,
          scrollY: scrollY ?? state.ui.scrollY,
        },
      };
    }

    // ── ADD_CAPTIONS ─────────────────────────────────────────────────────────
    case "ADD_CAPTIONS": {
      const { captions } = command.payload;
      if (!captions.length) return state;
      const newCaptions = { ...state.captions };
      for (const c of captions) {
        newCaptions[c.id] = c;
      }
      return { ...state, captions: newCaptions };
    }

    // ── UPDATE_CAPTION ────────────────────────────────────────────────────────
    case "UPDATE_CAPTION": {
      const { captionId, ...patch } = command.payload;
      const existing = state.captions[captionId];
      if (!existing) return state;
      return {
        ...state,
        captions: {
          ...state.captions,
          [captionId]: {
            ...existing,
            ...patch,
            style: patch.style
              ? { ...existing.style, ...patch.style }
              : existing.style,
          },
        },
      };
    }

    // ── DELETE_CAPTIONS ───────────────────────────────────────────────────────
    case "DELETE_CAPTIONS": {
      const { captionIds } = command.payload;
      if (!captionIds.length) return state;
      const newCaptions = { ...state.captions };
      for (const id of captionIds) delete newCaptions[id];
      return { ...state, captions: newCaptions };
    }

    // ── CLEAR_TRACK_CAPTIONS ──────────────────────────────────────────────────
    case "CLEAR_TRACK_CAPTIONS": {
      const { clipId, trackId } = command.payload;
      if (!clipId && !trackId) return state;
      const newCaptions: Record<string, import("../model/schema").Caption> = {};
      for (const [id, cap] of Object.entries(state.captions)) {
        if (!cap) continue;
        const keep = clipId
          ? cap.trackId !== clipId   // treating clipId field as the associated clip
          : cap.trackId !== trackId;
        if (keep) newCaptions[id] = cap;
      }
      return { ...state, captions: newCaptions };
    }

    // ── LOAD_PROJECT ─────────────────────────────────────────────────────────
    case "LOAD_PROJECT": {
      return command.payload.project;
    }

    // ── RESIZE_PROJECT ───────────────────────────────────────────────────────
    case "RESIZE_PROJECT": {
      const { width, height } = command.payload;
      const seq = state.sequences[state.rootSequenceId];
      if (!seq) return state;

      return {
        ...state,
        sequences: {
          ...state.sequences,
          [state.rootSequenceId]: {
            ...seq,
            canvas: { width, height },
          },
        },
      };
    }

    // ── UPDATE_PROJECT_NAME ──────────────────────────────────────────────────
    case "UPDATE_PROJECT_NAME": {
      return { ...state, name: command.payload.name };
    }

    default: {
      // Exhaustiveness check — TypeScript will error if a case is missing
      const _: never = command;
      return state;
    }
  }
}
