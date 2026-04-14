/**
 * engine/engine-core.ts — FIXED
 *
 * REVIEW FIXES:
 *   - Reducer now fully aligned with command layer. Every command the builders
 *     can produce is explicitly handled. No "compiles but does nothing" gaps.
 *   - Chose the "plain deep merge" model for UPDATE_CLIP. It handles details,
 *     transform, display, trim, and name — no hidden markers.
 *   - Removed all marker-style sentinel fields (_applyEffect, _trimFrom, etc.)
 *     that the Phase 2 commands.ts was using. Those were structured noise.
 *   - Added explicit APPLY_EFFECT, REMOVE_EFFECT, SET_DISPLAY, UPDATE_TRACK
 *     commands so effect/trim/display intent is unambiguous.
 *   - Opacity is stored as 0–1 in transform.opacity. That is the single
 *     canonical location. details.opacity is not written by the engine.
 *   - beginBatch / endBatch kept for multi-step undo grouping.
 */

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  version: number;
  rootSequenceId: string;
  sequences: Record<string, Sequence>;
  tracks: Record<string, Track>;
  clips: Record<string, Clip>;
  assets: Record<string, unknown>;
  effects: Record<string, unknown>;
  transitions: Record<string, unknown>;
  captions: Record<string, unknown>;
  keyframes: Record<string, unknown>;
  markers: Record<string, unknown>;
  ui: UIState;
}

export interface Sequence {
  id: string;
  name: string;
  duration: number;
  fps: number;
  canvas: { width: number; height: number };
  trackIds: string[];
  background: { type: "color" | "image"; value: string };
}

export interface Track {
  id: string;
  type: "video" | "audio" | "text" | "caption" | "overlay";
  name: string;
  order: number;
  locked: boolean;
  muted: boolean;
  hidden: boolean;
  clipIds: string[];
}

export interface Clip {
  id: string;
  type: "video" | "audio" | "image" | "text" | "caption" | "transition" | "shape" | "overlay";
  trackId: string;
  assetId?: string;
  name: string;
  display: { from: number; to: number };
  trim: { from: number; to: number };
  transform: Transform;
  details: Record<string, unknown>;
  /** Applied effects — each effect has id, kind, params, enabled */
  appliedEffects: AppliedEffect[];
  effectIds: string[];
  keyframeIds: string[];
  metadata?: Record<string, unknown>;
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
  /** 0–1. This is the single canonical opacity location. Never write to details.opacity. */
  opacity: number;
  flipX: boolean;
  flipY: boolean;
}

export interface UIState {
  selection: string[];
  activeTrackId?: string;
  playheadTime: number;
  zoom: number;
  scrollX: number;
  scrollY: number;
  timelineVisible: boolean;
}

export interface AppliedEffect {
  id: string;
  kind: string;
  params: Record<string, unknown>;
  enabled: boolean;
}

// ─── ID generation ─────────────────────────────────────────────────────────────

let idCounter = 0;
export function nanoid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 21);
  }
  return `id_${Date.now()}_${++idCounter}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Factories ────────────────────────────────────────────────────────────────

export function createEmptyProject(overrides?: Partial<Project>): Project {
  const seqId = nanoid();
  const seq: Sequence = {
    id: seqId,
    name: "Main",
    duration: 10000,
    fps: 30,
    canvas: { width: 1080, height: 1920 },
    trackIds: [],
    background: { type: "color", value: "#000000" },
  };
  return {
    id: nanoid(),
    name: "Untitled Project",
    version: 1,
    rootSequenceId: seqId,
    sequences: { [seqId]: seq },
    tracks: {},
    clips: {},
    assets: {},
    effects: {},
    transitions: {},
    captions: {},
    keyframes: {},
    markers: {},
    ui: {
      selection: [],
      playheadTime: 0,
      zoom: 0.1,  // 100 pixels per second - reasonable for editing
      scrollX: 0,
      scrollY: 0,
      timelineVisible: true,
    },
    ...overrides,
  };
}

export function createTrack(type: Track["type"], overrides?: Partial<Track>): Track {
  return {
    id: nanoid(),
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    order: 0,
    locked: false,
    muted: false,
    hidden: false,
    clipIds: [],
    ...overrides,
  };
}

// ─── Commands ─────────────────────────────────────────────────────────────────
// Every command must be explicitly handled in the reducer below.
// No command may rely on sentinel/marker fields in details.

export type EditorCommand =
  // Track commands
  | { type: "ADD_TRACK";    payload: { track: Track } }
  | { type: "REMOVE_TRACK"; payload: { trackId: string } }
  | { type: "UPDATE_TRACK"; payload: { trackId: string; locked?: boolean; muted?: boolean; hidden?: boolean; name?: string; order?: number } }

  // Clip CRUD
  | { type: "ADD_CLIP";    payload: { clip: Clip; trackId?: string } }
  | { type: "DELETE_CLIP"; payload: { clipIds: string[] } }
  | { type: "MOVE_CLIP";   payload: { clipId: string; newStart: number; newTrackId?: string } }
  | { type: "CLEAR_ALL";  payload?: undefined }

  // Clip property updates — plain deep merge, no markers
  | {
      type: "UPDATE_CLIP";
      payload: {
        clipId: string;
        details?: Record<string, unknown>;
        transform?: Partial<Transform>;
        display?: { from?: number; to?: number };
        trim?: { from?: number; to?: number };
        name?: string;
      };
    }

  // Explicit trim command (timeline drag handles)
  | { type: "TRIM_CLIP"; payload: { clipId: string; display: { from: number; to: number }; trim?: { from: number; to: number } } }

  // Explicit effect commands
  | { type: "APPLY_EFFECT";  payload: { clipId: string; effect: AppliedEffect } }
  | { type: "REMOVE_EFFECT"; payload: { clipId: string; effectId: string } }
  | { type: "UPDATE_EFFECT"; payload: { clipId: string; effectId: string; params: Record<string, unknown> } }
  | { type: "TOGGLE_EFFECT"; payload: { clipId: string; effectId: string; enabled: boolean } }

  // UI state
  | { type: "SET_SELECTION"; payload: { clipIds: string[] } }
  | { type: "SET_PLAYHEAD";  payload: { timeMs: number } }
  | { type: "SET_ZOOM";      payload: { zoom: number } }
  | { type: "SET_SCROLL";    payload: { scrollX?: number; scrollY?: number } }

  // Canvas
  | { type: "SET_CANVAS"; payload: { width: number; height: number } }

  // History
  | { type: "UNDO" }
  | { type: "REDO" }

  // Bulk load
  | { type: "LOAD_PROJECT";  payload: { project: Project } };

// ─── History ──────────────────────────────────────────────────────────────────

interface HistoryEntry {
  before: Project;
  command: EditorCommand;
  description?: string;
}

const MAX_HISTORY = 120;

// ─── Store ────────────────────────────────────────────────────────────────────

type StoreListener = (state: Project, command: EditorCommand | null) => void;

class EngineStore {
  private state: Project;
  private past: HistoryEntry[] = [];
  private future: EditorCommand[] = [];
  private listeners = new Set<StoreListener>();
  private batchDepth = 0;
  private batchBefore: Project | null = null;

  constructor(initialState?: Project) {
    this.state = initialState ?? createEmptyProject();
  }

  getState(): Project { return this.state; }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(command: EditorCommand, opts?: { skipHistory?: boolean }): void {
    const before = this.state;
    const next = reducer(this.state, command);
    if (next === this.state) return;

    if (!opts?.skipHistory && this.batchDepth === 0) {
      this.past.push({ before, command });
      if (this.past.length > MAX_HISTORY) this.past.shift();
      this.future = [];
    }

    this.state = next;
    for (const l of this.listeners) {
      try { l(this.state, command); } catch (e) { console.error("[EngineStore]", e); }
    }
  }

  beginBatch(): void {
    if (this.batchDepth === 0) this.batchBefore = this.state;
    this.batchDepth++;
  }

  endBatch(description?: string): void {
    if (this.batchDepth <= 0) return;
    this.batchDepth--;
    if (this.batchDepth === 0 && this.batchBefore && this.batchBefore !== this.state) {
      this.past.push({ before: this.batchBefore, command: { type: "LOAD_PROJECT", payload: { project: this.state } }, description });
      if (this.past.length > MAX_HISTORY) this.past.shift();
      this.future = [];
      this.batchBefore = null;
    }
  }

  get canUndo(): boolean { return this.past.length > 0; }
  get canRedo(): boolean { return this.future.length > 0; }

  undo(): void {
    if (!this.past.length) return;
    const entry = this.past[this.past.length - 1];
    this.future.unshift(entry.command);
    this.past.pop();
    this.state = entry.before;
    for (const l of this.listeners) { try { l(this.state, null); } catch {} }
  }

  redo(): void {
    if (!this.future.length) return;
    const command = this.future[0];
    this.future.shift();
    const before = this.state;
    const next = reducer(this.state, command);
    this.past.push({ before, command });
    if (this.past.length > MAX_HISTORY) this.past.shift();
    this.state = next;
    for (const l of this.listeners) { try { l(this.state, command); } catch {} }
  }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
// Every case in EditorCommand must appear here. TypeScript's never check
// at the bottom enforces exhaustiveness.

function reducer(state: Project, command: EditorCommand): Project {
  switch (command.type) {

    // ── Bulk load ───────────────────────────────────────────────────────────
    case "LOAD_PROJECT":
      return command.payload.project;

    // ── Track commands ───────────────────────────────────────────────────────
    case "ADD_TRACK": {
      const { track } = command.payload;
      const seq = state.sequences[state.rootSequenceId];
      if (!seq) return state;
      return {
        ...state,
        tracks: { ...state.tracks, [track.id]: track },
        sequences: {
          ...state.sequences,
          [state.rootSequenceId]: { ...seq, trackIds: [...seq.trackIds, track.id] },
        },
      };
    }

    case "REMOVE_TRACK": {
      const { trackId } = command.payload;
      const track = state.tracks[trackId];
      if (!track) return state;
      const newTracks = { ...state.tracks };
      delete newTracks[trackId];
      const newClips = { ...state.clips };
      for (const cid of track.clipIds) delete newClips[cid];
      const seq = state.sequences[state.rootSequenceId];
      return {
        ...state,
        tracks: newTracks,
        clips: newClips,
        sequences: {
          ...state.sequences,
          [state.rootSequenceId]: { ...seq, trackIds: seq.trackIds.filter((id) => id !== trackId) },
        },
      };
    }

    case "UPDATE_TRACK": {
      const { trackId, ...patch } = command.payload;
      const track = state.tracks[trackId];
      if (!track) return state;
      return { ...state, tracks: { ...state.tracks, [trackId]: { ...track, ...patch } } };
    }

    // ── Clip CRUD ────────────────────────────────────────────────────────────
    case "ADD_CLIP": {
      const { clip, trackId } = command.payload;
      const tid = trackId ?? clip.trackId;
      const track = state.tracks[tid];
      if (!tid || !track) return state;
      const newClip: Clip = {
        appliedEffects: [],
        ...clip,
        trackId: tid,
      };
      return {
        ...state,
        clips: { ...state.clips, [newClip.id]: newClip },
        tracks: { ...state.tracks, [tid]: { ...track, clipIds: [...track.clipIds, newClip.id] } },
      };
    }

    case "DELETE_CLIP": {
      const idSet = new Set(command.payload.clipIds);
      const newClips = { ...state.clips };
      const affectedTracks = new Set<string>();
      for (const id of idSet) {
        const c = state.clips[id];
        if (c) affectedTracks.add(c.trackId);
        delete newClips[id];
      }
      const newTracks = { ...state.tracks };
      for (const tid of affectedTracks) {
        const t = state.tracks[tid];
        if (t) newTracks[tid] = { ...t, clipIds: t.clipIds.filter((id) => !idSet.has(id)) };
      }
      return {
        ...state,
        clips: newClips,
        tracks: newTracks,
        ui: { ...state.ui, selection: state.ui.selection.filter((id) => !idSet.has(id)) },
      };
    }

    case "CLEAR_ALL": {
      return {
        ...state,
        clips: {},
        tracks: {},
        sequences: {},
        markers: {},
        ui: { 
          ...state.ui, 
          selection: [],
          playheadTime: 0,
        },
      };
    }

    case "MOVE_CLIP": {
      const { clipId, newStart, newTrackId } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;
      const dur = clip.display.to - clip.display.from;
      const updated: Clip = {
        ...clip,
        display: { from: newStart, to: newStart + dur },
        trackId: newTrackId ?? clip.trackId,
      };
      let tracks = state.tracks;
      if (newTrackId && newTrackId !== clip.trackId) {
        const oldT = state.tracks[clip.trackId];
        const newT = state.tracks[newTrackId];
        if (oldT && newT) {
          tracks = {
            ...tracks,
            [clip.trackId]: { ...oldT, clipIds: oldT.clipIds.filter((id) => id !== clipId) },
            [newTrackId]:   { ...newT, clipIds: [...newT.clipIds, clipId] },
          };
        }
      }
      return { ...state, clips: { ...state.clips, [clipId]: updated }, tracks };
    }

    // ── Clip property update — plain deep merge, no markers ──────────────────
    case "UPDATE_CLIP": {
      const { clipId, details, transform, display, trim, name } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;
      return {
        ...state,
        clips: {
          ...state.clips,
          [clipId]: {
            ...clip,
            ...(name !== undefined ? { name } : {}),
            display:   display   ? { ...clip.display,   ...display   } : clip.display,
            trim:      trim      ? { ...clip.trim,      ...trim      } : clip.trim,
            transform: transform ? { ...clip.transform, ...transform } : clip.transform,
            details:   details   ? { ...clip.details,   ...details   } : clip.details,
          },
        },
      };
    }

    // ── Explicit trim (timeline drag) ────────────────────────────────────────
    case "TRIM_CLIP": {
      const { clipId, display, trim } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;
      return {
        ...state,
        clips: {
          ...state.clips,
          [clipId]: { ...clip, display, trim: trim ?? clip.trim },
        },
      };
    }

    // ── Effect commands ──────────────────────────────────────────────────────
    case "APPLY_EFFECT": {
      const { clipId, effect } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;
      const already = clip.appliedEffects.some((e) => e.id === effect.id);
      if (already) return state;
      return {
        ...state,
        clips: {
          ...state.clips,
          [clipId]: { ...clip, appliedEffects: [...clip.appliedEffects, effect] },
        },
      };
    }

    case "REMOVE_EFFECT": {
      const { clipId, effectId } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;
      return {
        ...state,
        clips: {
          ...state.clips,
          [clipId]: {
            ...clip,
            appliedEffects: clip.appliedEffects.filter((e) => e.id !== effectId),
          },
        },
      };
    }

    case "UPDATE_EFFECT": {
      const { clipId, effectId, params } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;
      return {
        ...state,
        clips: {
          ...state.clips,
          [clipId]: {
            ...clip,
            appliedEffects: clip.appliedEffects.map((e) =>
              e.id === effectId ? { ...e, params: { ...e.params, ...params } } : e
            ),
          },
        },
      };
    }

    case "TOGGLE_EFFECT": {
      const { clipId, effectId, enabled } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;
      return {
        ...state,
        clips: {
          ...state.clips,
          [clipId]: {
            ...clip,
            appliedEffects: clip.appliedEffects.map((e) =>
              e.id === effectId ? { ...e, enabled } : e
            ),
          },
        },
      };
    }

    // ── UI state ─────────────────────────────────────────────────────────────
    case "SET_SELECTION":
      return { ...state, ui: { ...state.ui, selection: command.payload.clipIds } };

    case "SET_PLAYHEAD": {
      const seq = state.sequences[state.rootSequenceId];
      const clamped = Math.max(0, Math.min(seq?.duration ?? Infinity, command.payload.timeMs));
      return clamped === state.ui.playheadTime
        ? state
        : { ...state, ui: { ...state.ui, playheadTime: clamped } };
    }

    case "SET_ZOOM":
      return { ...state, ui: { ...state.ui, zoom: Math.max(0.00005, command.payload.zoom) } };

    case "SET_SCROLL":
      return {
        ...state,
        ui: {
          ...state.ui,
          scrollX: command.payload.scrollX ?? state.ui.scrollX,
          scrollY: command.payload.scrollY ?? state.ui.scrollY,
        },
      };

    // ── Canvas ─────────────────────────────────────────────────────────────────
    case "SET_CANVAS": {
      const seq = state.sequences[state.rootSequenceId];
      if (!seq) return state;
      return {
        ...state,
        sequences: {
          ...state.sequences,
          [state.rootSequenceId]: {
            ...seq,
            canvas: { width: command.payload.width, height: command.payload.height },
          },
        },
      };
    }

    // ── History (handled by store, not reducer) ─────────────────────────────────
    case "UNDO":
    case "REDO":
      return state;

    default: {
      const _exhaustive: never = command;
      return state;
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const engineStore = new EngineStore();
export type { EngineStore };
