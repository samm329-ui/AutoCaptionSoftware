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
  // ── Upload/Files State ─────────────────────────────────────────────────────
  uploads: UploadedFile[];
  folders: ProjectFolder[];
  mediaAssets: MediaAsset[];
  showUploadModal: boolean;
  // ── Data State (Fonts) ────────────────────────────────────────────────────
  fonts: FontData[];
  compactFonts: FontData[];
  // ── Keyframe State ────────────────────────────────────────────────────────
  keyframesByClip: Record<string, Record<string, KeyframeTrack>>;
  // ── Runtime Refs (non-serializable) ───────────────────────────────────────
  playerRef: unknown;
  sceneMoveableRef: unknown;
  background: { type: "color" | "image"; value: string };
  viewTimeline: boolean;
  // ── Markers ─────────────────────────────────────────────────────────────────
  timelineMarkers: TimelineMarker[];
}

export interface UploadedFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  type: "video" | "image" | "audio" | "adjustment" | "colormatte";
  objectUrl: string;
  file?: File;
  status: "completed" | "uploading" | "failed";
  progress: number;
  createdAt: number;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  color?: string;
  folderId?: string | null;
}

export interface ProjectFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface MediaAsset {
  id: string;
  name: string;
  kind: "video" | "image" | "audio";
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
}

export interface FontData {
  name: string;
  postScriptName: string;
  url?: string;
  category?: string;
}

export interface KeyframeTrack {
  property: string;
  keyframes: Keyframe[];
  defaultValue: number;
}

export interface Keyframe {
  id: string;
  time: number;
  value: number;
  interpolation: "linear" | "ease" | "step" | "bezier";
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
  group: "subtitle" | "text" | "video" | "audio";
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

// ─── Marker Types ───────────────────────────────────────────────────────────

export type MarkerColor = "green" | "red" | "blue" | "yellow" | "orange" | "purple" | "cyan";

export interface TimelineMarker {
  id: string;
  timeMs: number;
  endTimeMs?: number;
  label: string;
  color: MarkerColor;
  type: "sequence" | "clip";
  clipId?: string;
  notes?: string;
}

export interface UIState {
  selection: string[];
  activeTrackId?: string;
  playheadTime: number;
  zoom: number;
  scrollX: number;
  scrollY: number;
  timelineVisible: boolean;
  // ── Layout State ───────────────────────────────────────────────────────────
  activeMenuItem: string | null;
  showMenuItem: boolean;
  showControlItem: boolean;
  showToolboxItem: boolean;
  activeToolboxItem: string | null;
  floatingControl: string | null;
  drawerOpen: boolean;
  controItemDrawerOpen: boolean;
  typeControlItem: string;
  labelControlItem: string;
  // ── Crop State ──────────────────────────────────────────────────────────────
  cropTarget: string | null;
  cropArea: [number, number, number, number];
  cropSrc: string;
  cropElement: string | null;
  cropFileLoading: boolean;
  cropStep: number;
  cropScale: number;
  cropSize: { width: number; height: number };
  // ── Download State ───────────────────────────────────────────────────────────
  projectId: string;
  exporting: boolean;
  exportType: "json" | "mp4";
  exportProgress: number;
  exportOutput: { url: string; type: string } | null;
  displayProgressModal: boolean;
  // ── Folder State ───────────────────────────────────────────────────────────
  valueFolder: string;
  folderVideos: unknown[];
  // ── Tool State ───────────────────────────────────────────────────────────
  activeTool: "select" | "trackSelect" | "rippleEdit" | "razor" | "pen" | "rectangle" | "hand" | "text";
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
  
  const videoTrack = createTrack("video", { order: 2 });
  const audioTrack = createTrack("audio", { order: 3 });
  
  const seq: Sequence = {
    id: seqId,
    name: "Main",
    duration: 10000,
    fps: 30,
    canvas: { width: 1080, height: 1920 },
    trackIds: [videoTrack.id, audioTrack.id], // Video above, Audio at bottom
    background: { type: "color", value: "#000000" },
  };
  
  return {
    id: nanoid(),
    name: "Untitled Project",
    version: 1,
    rootSequenceId: seqId,
    sequences: { [seqId]: seq },
    tracks: { [videoTrack.id]: videoTrack, [audioTrack.id]: audioTrack },
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
      zoom: 0.1,
      scrollX: 0,
      scrollY: 0,
      timelineVisible: true,
      activeMenuItem: null,
      showMenuItem: false,
      showControlItem: false,
      showToolboxItem: false,
      activeToolboxItem: null,
      floatingControl: null,
      drawerOpen: false,
      controItemDrawerOpen: false,
      typeControlItem: "",
      labelControlItem: "",
      cropTarget: null,
      cropArea: [0, 0, 0, 0],
      cropSrc: "",
      cropElement: null,
      cropFileLoading: false,
      cropStep: 0,
      cropScale: 1,
      cropSize: { width: 0, height: 0 },
      projectId: "",
      exporting: false,
      exportType: "mp4",
      exportProgress: 0,
      exportOutput: null,
      displayProgressModal: false,
      valueFolder: "",
      folderVideos: [],
    },
    uploads: [],
    folders: [],
    mediaAssets: [],
    showUploadModal: false,
    fonts: [],
    compactFonts: [],
    keyframesByClip: {},
    playerRef: null,
    sceneMoveableRef: null,
    background: { type: "color", value: "transparent" },
    viewTimeline: true,
    timelineMarkers: [],
    ...overrides,
  };
}

export function createTrack(type: Track["type"], overrides?: Partial<Track>): Track {
  const group = type === "caption" ? "subtitle" 
    : type === "text" ? "text" 
    : type === "video" || type === "overlay" ? "video" 
    : "audio";
  return {
    id: nanoid(),
    type,
    group,
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
  | { type: "INSERT_TRACK_ABOVE"; payload: { sourceTrackId: string } }
  | { type: "INSERT_TRACK_BELOW"; payload: { sourceTrackId: string } }
  | { type: "CLONE_CLIP_TO_NEW_LANE"; payload: { clipId: string; position: "above" | "below" } }

  // Clip CRUD
  | { type: "ADD_CLIP";    payload: { clip: Clip; trackId?: string } }
  | { type: "DELETE_CLIP"; payload: { clipIds: string[] } }
  | { type: "MOVE_CLIP";   payload: { clipId: string; newStart: number; newTrackId?: string } }
  | { type: "CLEAR_ALL";  payload?: undefined }

  // Split and clone
  | { type: "SPLIT_CLIP"; payload: { clipId: string; splitTimeMs: number } }
  | { type: "CLONE_CLIP"; payload: { clipId: string } }

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
  | { type: "SET_FPS"; payload: { fps: number } }

  // History
  | { type: "UNDO" }
  | { type: "REDO" }

  // Bulk load
  | { type: "LOAD_PROJECT";  payload: { project: Project } }

  // ── Layout State Commands ─────────────────────────────────────────────────
  | { type: "SET_LAYOUT"; payload: {
      activeMenuItem?: string | null;
      showMenuItem?: boolean;
      showControlItem?: boolean;
      showToolboxItem?: boolean;
      activeToolboxItem?: string | null;
      floatingControl?: string | null;
      drawerOpen?: boolean;
      controItemDrawerOpen?: boolean;
      typeControlItem?: string;
      labelControlItem?: string;
    }}

  // ── Crop State Commands ────────────────────────────────────────────────────
  | { type: "SET_CROP_TARGET"; payload: { target: string | null } }
  | { type: "SET_CROP_AREA"; payload: { area: [number, number, number, number] } }
  | { type: "SET_CROP_SRC"; payload: { src: string } }
  | { type: "SET_CROP_ELEMENT"; payload: { element: string | null } }
  | { type: "SET_CROP_STATE"; payload: {
      fileLoading?: boolean;
      step?: number;
      scale?: number;
      size?: { width: number; height: number };
    }}
  | { type: "CLEAR_CROP"; payload?: undefined }

  // ── Download State Commands ───────────────────────────────────────────────
  | { type: "SET_EXPORT_STATE"; payload: {
      projectId?: string;
      exporting?: boolean;
      exportType?: "json" | "mp4";
      exportProgress?: number;
      exportOutput?: { url: string; type: string } | null;
      displayProgressModal?: boolean;
    }}

  // ── Folder State Commands ─────────────────────────────────────────────────
  | { type: "SET_FOLDER_STATE"; payload: {
      valueFolder?: string;
      folderVideos?: unknown[];
    }}

  // ── Tool Commands ─────────────────────────────────────────────────────────
  | { type: "SET_TOOL"; payload: { tool: "select" | "trackSelect" | "rippleEdit" | "razor" | "pen" | "rectangle" | "hand" | "text" } }

  // ── Upload/Files Commands ────────────────────────────────────────────────
  | { type: "ADD_UPLOAD"; payload: { upload: UploadedFile } }
  | { type: "REMOVE_UPLOAD"; payload: { id: string } }
  | { type: "CLEAR_UPLOADS"; payload?: undefined }
  | { type: "ADD_FOLDER"; payload: { folder: ProjectFolder } }
  | { type: "REMOVE_FOLDER"; payload: { id: string } }
  | { type: "RENAME_FOLDER"; payload: { id: string; name: string } }
  | { type: "MOVE_FILE_TO_FOLDER"; payload: { fileId: string; folderId: string | null } }
  | { type: "ADD_MEDIA_ASSET"; payload: { asset: MediaAsset } }
  | { type: "SET_UPLOAD_MODAL"; payload: { show: boolean } }

  // ── Data State (Fonts) Commands ───────────────────────────────────────────
  | { type: "SET_FONTS"; payload: { fonts: FontData[] } }
  | { type: "SET_COMPACT_FONTS"; payload: { compactFonts: FontData[] } }

  // ── Keyframe State Commands ───────────────────────────────────────────────
  | { type: "SET_KEYFRAME_TRACK"; payload: { clipId: string; property: string; track: KeyframeTrack } }
  | { type: "REMOVE_KEYFRAME_TRACK"; payload: { clipId: string; property: string } }
  | { type: "CLEAR_KEYFRAMES_FOR_CLIP"; payload: { clipId: string } }

  // ── Runtime Refs Commands ────────────────────────────────────────────────
  | { type: "SET_PLAYER_REF"; payload: { ref: unknown } }
  | { type: "SET_SCENE_MOVEABLE_REF"; payload: { ref: unknown } }
  | { type: "SET_BACKGROUND"; payload: { background: { type: "color" | "image"; value: string } } }
  | { type: "SET_VIEW_TIMELINE"; payload: { visible: boolean } }

  // ── Marker Commands ─────────────────────────────────────────────────────────
  | { type: "ADD_MARKER"; payload: { marker: TimelineMarker } }
  | { type: "REMOVE_MARKER"; payload: { id: string } }
  | { type: "UPDATE_MARKER"; payload: { id: string; updates: Partial<TimelineMarker> } }
  | { type: "MOVE_MARKER"; payload: { id: string; timeMs: number } }
  | { type: "CLEAR_MARKERS"; payload?: undefined };

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

    case "INSERT_TRACK_ABOVE": {
      const { sourceTrackId } = command.payload;
      const sourceTrack = state.tracks[sourceTrackId];
      if (!sourceTrack) return state;
      
      const seq = state.sequences[state.rootSequenceId];
      if (!seq) return state;
      
      const sourceIndex = seq.trackIds.indexOf(sourceTrack.id);
      
      const newTrack: Track = {
        id: nanoid(),
        type: sourceTrack.type,
        group: sourceTrack.group,
        name: sourceTrack.type === "video" || sourceTrack.type === "overlay" 
          ? `V${sourceTrack.order}` 
          : sourceTrack.type === "text"
          ? `T${sourceTrack.order}`
          : sourceTrack.type === "caption"
          ? `S${sourceTrack.order}`
          : `A${sourceTrack.order}`,
        order: sourceTrack.order - 1,
        locked: false,
        muted: false,
        hidden: false,
        clipIds: [],
      };
      
      return {
        ...state,
        tracks: {
          ...state.tracks,
          [newTrack.id]: newTrack,
        },
        sequences: {
          ...state.sequences,
          [state.rootSequenceId]: {
            ...seq,
            trackIds: [
              ...seq.trackIds.slice(0, sourceIndex),
              newTrack.id,
              ...seq.trackIds.slice(sourceIndex),
            ],
          },
        },
      };
    }

    case "INSERT_TRACK_BELOW": {
      const { sourceTrackId } = command.payload;
      const sourceTrack = state.tracks[sourceTrackId];
      if (!sourceTrack) return state;
      
      const seq = state.sequences[state.rootSequenceId];
      if (!seq) return state;
      
      const sourceIndex = seq.trackIds.indexOf(sourceTrack.id);
      const insertIndex = sourceIndex + 1;
      
      const newTrack: Track = {
        id: nanoid(),
        type: sourceTrack.type,
        group: sourceTrack.group,
        name: sourceTrack.type === "video" || sourceTrack.type === "overlay" 
          ? `V${sourceTrack.order + 2}` 
          : sourceTrack.type === "text"
          ? `T${sourceTrack.order + 2}`
          : sourceTrack.type === "caption"
          ? `S${sourceTrack.order + 2}`
          : `A${sourceTrack.order + 2}`,
        order: sourceTrack.order + 1,
        locked: false,
        muted: false,
        hidden: false,
        clipIds: [],
      };
      
      return {
        ...state,
        tracks: {
          ...state.tracks,
          [newTrack.id]: newTrack,
        },
        sequences: {
          ...state.sequences,
          [state.rootSequenceId]: {
            ...seq,
            trackIds: [
              ...seq.trackIds.slice(0, insertIndex),
              newTrack.id,
              ...seq.trackIds.slice(insertIndex),
            ],
          },
        },
      };
    }

    case "CLONE_CLIP_TO_NEW_LANE": {
      const { clipId, position } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;
      
      const sourceTrack = state.tracks[clip.trackId];
      if (!sourceTrack) return state;
      
      const seq = state.sequences[state.rootSequenceId];
      if (!seq) return state;
      
      const sourceIndex = seq.trackIds.indexOf(sourceTrack.id);
      const insertIndex = position === "above" ? sourceIndex : sourceIndex + 1;
      
      const newTrack: Track = {
        id: nanoid(),
        type: sourceTrack.type,
        group: sourceTrack.group,
        name: sourceTrack.type === "video" || sourceTrack.type === "overlay" 
          ? `V${sourceTrack.order + (position === "above" ? 0 : 2)}` 
          : sourceTrack.type === "text"
          ? `T${sourceTrack.order + (position === "above" ? 0 : 2)}`
          : sourceTrack.type === "caption"
          ? `S${sourceTrack.order + (position === "above" ? 0 : 2)}`
          : `A${sourceTrack.order + (position === "above" ? 0 : 2)}`,
        order: position === "above" ? sourceTrack.order - 1 : sourceTrack.order + 1,
        locked: false,
        muted: false,
        hidden: false,
        clipIds: [],
      };
      
      const clonedClip: Clip = {
        ...clip,
        id: nanoid(),
        name: `${clip.name} (copy)`,
        trackId: newTrack.id,
        display: { 
          from: clip.display.from, 
          to: clip.display.to 
        },
      };
      
      newTrack.clipIds.push(clonedClip.id);
      
      return {
        ...state,
        clips: {
          ...state.clips,
          [clonedClip.id]: clonedClip,
        },
        tracks: {
          ...state.tracks,
          [newTrack.id]: newTrack,
        },
        sequences: {
          ...state.sequences,
          [state.rootSequenceId]: {
            ...seq,
            trackIds: [
              ...seq.trackIds.slice(0, insertIndex),
              newTrack.id,
              ...seq.trackIds.slice(insertIndex),
            ],
          },
        },
        ui: { ...state.ui, selection: [clonedClip.id] },
      };
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

    // ── Split clip — creates two clips from one ──────────────────────────────
    case "SPLIT_CLIP": {
      const { clipId, splitTimeMs } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;
      
      const splitPoint = splitTimeMs;
      if (splitPoint <= clip.display.from || splitPoint >= clip.display.to) {
        return state;
      }
      
      const firstClip: Clip = {
        ...clip,
        id: nanoid(),
        display: { from: clip.display.from, to: splitPoint },
        trim: { 
          from: clip.trim.from, 
          to: clip.trim.from + (splitPoint - clip.display.from) 
        },
        name: `${clip.name} (1)`,
      };
      
      const secondClip: Clip = {
        ...clip,
        id: nanoid(),
        display: { from: splitPoint, to: clip.display.to },
        trim: { 
          from: clip.trim.from + (splitPoint - clip.display.from), 
          to: clip.trim.to 
        },
        name: `${clip.name} (2)`,
      };
      
      const track = state.tracks[clip.trackId];
      if (!track) return state;
      
      // Create a new clips object without the original clip
      const { [clipId]: deleted, ...remainingClips } = state.clips;
      
      return {
        ...state,
        clips: {
          ...remainingClips,
          [firstClip.id]: firstClip,
          [secondClip.id]: secondClip,
        },
        tracks: {
          ...state.tracks,
          [clip.trackId]: {
            ...track,
            clipIds: [...track.clipIds.filter(id => id !== clipId), firstClip.id, secondClip.id],
          },
        },
        ui: { ...state.ui, selection: [firstClip.id, secondClip.id] },
      };
    }

    // ── Clone clip — creates a copy in a NEW track below original ──────────────
    case "CLONE_CLIP": {
      const { clipId } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;
      
      const sourceTrack = state.tracks[clip.trackId];
      if (!sourceTrack) return state;
      
      const seq = state.sequences[state.rootSequenceId];
      if (!seq) return state;
      
      const sourceIndex = seq.trackIds.indexOf(sourceTrack.id);
      const insertIndex = sourceIndex + 1;
      
      const newTrack: Track = {
        id: nanoid(),
        type: sourceTrack.type,
        group: sourceTrack.group,
        name: sourceTrack.type === "video" || sourceTrack.type === "overlay" 
          ? `V${sourceTrack.order + 2}` 
          : sourceTrack.type === "text"
          ? `T${sourceTrack.order + 2}`
          : sourceTrack.type === "caption"
          ? `S${sourceTrack.order + 2}`
          : `A${sourceTrack.order + 2}`,
        order: sourceTrack.order + 1,
        locked: false,
        muted: false,
        hidden: false,
        clipIds: [],
      };
      
      const clonedClip: Clip = {
        ...clip,
        id: nanoid(),
        name: `${clip.name} (copy)`,
        trackId: newTrack.id,
        display: { 
          from: clip.display.from, 
          to: clip.display.to 
        },
      };
      
      newTrack.clipIds.push(clonedClip.id);
      
      return {
        ...state,
        clips: {
          ...state.clips,
          [clonedClip.id]: clonedClip,
        },
        tracks: {
          ...state.tracks,
          [newTrack.id]: newTrack,
        },
        sequences: {
          ...state.sequences,
          [state.rootSequenceId]: {
            ...seq,
            trackIds: [
              ...seq.trackIds.slice(0, insertIndex),
              newTrack.id,
              ...seq.trackIds.slice(insertIndex),
            ],
          },
        },
        ui: { ...state.ui, selection: [clonedClip.id] },
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
      // Always update (no comparison to force re-render)
      return { ...state, ui: { ...state.ui, playheadTime: clamped, _tick: Date.now() } };
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

    case "SET_TOOL":
      return { ...state, ui: { ...state.ui, activeTool: command.payload.tool } };

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

    case "SET_FPS": {
      const seq = state.sequences[state.rootSequenceId];
      if (!seq) return state;
      return {
        ...state,
        sequences: {
          ...state.sequences,
          [state.rootSequenceId]: {
            ...seq,
            fps: command.payload.fps,
          },
        },
      };
    }

    // ── History (handled by store, not reducer) ─────────────────────────────────
    case "UNDO":
    case "REDO":
      return state;

    // ── Layout State ───────────────────────────────────────────────────────────
    case "SET_LAYOUT": {
      const { payload } = command;
      return {
        ...state,
        ui: {
          ...state.ui,
          activeMenuItem: payload.activeMenuItem ?? state.ui.activeMenuItem,
          showMenuItem: payload.showMenuItem ?? state.ui.showMenuItem,
          showControlItem: payload.showControlItem ?? state.ui.showControlItem,
          showToolboxItem: payload.showToolboxItem ?? state.ui.showToolboxItem,
          activeToolboxItem: payload.activeToolboxItem ?? state.ui.activeToolboxItem,
          floatingControl: payload.floatingControl ?? state.ui.floatingControl,
          drawerOpen: payload.drawerOpen ?? state.ui.drawerOpen,
          controItemDrawerOpen: payload.controItemDrawerOpen ?? state.ui.controItemDrawerOpen,
          typeControlItem: payload.typeControlItem ?? state.ui.typeControlItem,
          labelControlItem: payload.labelControlItem ?? state.ui.labelControlItem,
        },
      };
    }

    // ── Crop State ─────────────────────────────────────────────────────────────
    case "SET_CROP_TARGET":
      return { ...state, ui: { ...state.ui, cropTarget: command.payload.target } };

    case "SET_CROP_AREA":
      return { ...state, ui: { ...state.ui, cropArea: command.payload.area } };

    case "SET_CROP_SRC":
      return { ...state, ui: { ...state.ui, cropSrc: command.payload.src } };

    case "SET_CROP_ELEMENT":
      return { ...state, ui: { ...state.ui, cropElement: command.payload.element } };

    case "SET_CROP_STATE": {
      const { payload } = command;
      return {
        ...state,
        ui: {
          ...state.ui,
          cropFileLoading: payload.fileLoading ?? state.ui.cropFileLoading,
          cropStep: payload.step ?? state.ui.cropStep,
          cropScale: payload.scale ?? state.ui.cropScale,
          cropSize: payload.size ?? state.ui.cropSize,
        },
      };
    }

    case "CLEAR_CROP":
      return {
        ...state,
        ui: {
          ...state.ui,
          cropTarget: null,
          cropArea: [0, 0, 0, 0],
          cropSrc: "",
          cropElement: null,
          cropFileLoading: false,
          cropStep: 0,
          cropScale: 1,
          cropSize: { width: 0, height: 0 },
        },
      };

    // ── Download State ───────────────────────────────────────────────────────
    case "SET_EXPORT_STATE": {
      const { payload } = command;
      return {
        ...state,
        ui: {
          ...state.ui,
          projectId: payload.projectId ?? state.ui.projectId,
          exporting: payload.exporting ?? state.ui.exporting,
          exportType: payload.exportType ?? state.ui.exportType,
          exportProgress: payload.exportProgress ?? state.ui.exportProgress,
          exportOutput: payload.exportOutput !== undefined ? payload.exportOutput : state.ui.exportOutput,
          displayProgressModal: payload.displayProgressModal ?? state.ui.displayProgressModal,
        },
      };
    }

    // ── Folder State ───────────────────────────────────────────────────────────
    case "SET_FOLDER_STATE": {
      const { payload } = command;
      return {
        ...state,
        ui: {
          ...state.ui,
          valueFolder: payload.valueFolder ?? state.ui.valueFolder,
          folderVideos: payload.folderVideos ?? state.ui.folderVideos,
        },
      };
    }

    // ── Upload/Files State ────────────────────────────────────────────────────
    case "ADD_UPLOAD":
      return { ...state, uploads: [command.payload.upload, ...(state.uploads ?? [])] };

    case "REMOVE_UPLOAD":
      return { ...state, uploads: (state.uploads ?? []).filter((u) => u.id !== command.payload.id) };

    case "CLEAR_UPLOADS":
      return { ...state, uploads: [], folders: [], mediaAssets: [] };

    case "ADD_FOLDER":
      return { ...state, folders: [...(state.folders ?? []), command.payload.folder] };

    case "REMOVE_FOLDER": {
      const { id } = command.payload;
      return {
        ...state,
        folders: (state.folders ?? []).filter((f) => f.id !== id),
        uploads: (state.uploads ?? []).map((u) => (u.folderId === id ? { ...u, folderId: undefined } : u)),
      };
    }

    case "RENAME_FOLDER": {
      const { id, name } = command.payload;
      return {
        ...state,
        folders: (state.folders ?? []).map((f) => (f.id === id ? { ...f, name } : f)),
      };
    }

    case "MOVE_FILE_TO_FOLDER": {
      const { fileId, folderId } = command.payload;
      return {
        ...state,
        uploads: (state.uploads ?? []).map((u) => (u.id === fileId ? { ...u, folderId } : u)),
      };
    }

    case "ADD_MEDIA_ASSET":
      return { ...state, mediaAssets: [command.payload.asset, ...(state.mediaAssets ?? [])] };

    case "SET_UPLOAD_MODAL":
      return { ...state, showUploadModal: command.payload.show };

    // ── Data State (Fonts) ────────────────────────────────────────────────────
    case "SET_FONTS":
      return { ...state, fonts: command.payload.fonts };

    case "SET_COMPACT_FONTS":
      return { ...state, compactFonts: command.payload.compactFonts };

    // ── Keyframe State ─────────────────────────────────────────────────────────
    case "SET_KEYFRAME_TRACK": {
      const { clipId, property, track } = command.payload;
      return {
        ...state,
        keyframesByClip: {
          ...state.keyframesByClip,
          [clipId]: {
            ...(state.keyframesByClip[clipId] || {}),
            [property]: track,
          },
        },
      };
    }

    case "REMOVE_KEYFRAME_TRACK": {
      const { clipId, property } = command.payload;
      const clipKeyframes = state.keyframesByClip[clipId];
      if (!clipKeyframes) return state;
      const { [property]: _, ...rest } = clipKeyframes;
      return {
        ...state,
        keyframesByClip: {
          ...state.keyframesByClip,
          [clipId]: rest,
        },
      };
    }

    case "CLEAR_KEYFRAMES_FOR_CLIP": {
      const { clipId } = command.payload;
      const { [clipId]: _, ...rest } = state.keyframesByClip;
      return { ...state, keyframesByClip: rest };
    }

    // ── Runtime Refs ──────────────────────────────────────────────────────────
    case "SET_PLAYER_REF":
      return { ...state, playerRef: command.payload.ref };

    case "SET_SCENE_MOVEABLE_REF":
      return { ...state, sceneMoveableRef: command.payload.ref };

    case "SET_BACKGROUND":
      return { ...state, background: command.payload.background };

    case "SET_VIEW_TIMELINE":
      return { ...state, viewTimeline: command.payload.visible };

    // ── Markers ────────────────────────────────────────────────────────────────
    case "ADD_MARKER":
      return { ...state, timelineMarkers: [...(state.timelineMarkers ?? []), command.payload.marker] };

    case "REMOVE_MARKER":
      return { ...state, timelineMarkers: (state.timelineMarkers ?? []).filter((m) => m.id !== command.payload.id) };

    case "UPDATE_MARKER": {
      const { id, updates } = command.payload;
      return {
        ...state,
        timelineMarkers: (state.timelineMarkers ?? []).map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      };
    }

    case "MOVE_MARKER": {
      const { id, timeMs } = command.payload;
      return {
        ...state,
        timelineMarkers: (state.timelineMarkers ?? []).map((m) =>
          m.id === id ? { ...m, timeMs } : m
        ),
      };
    }

    case "CLEAR_MARKERS":
      return { ...state, timelineMarkers: [] };

    default: {
      const _exhaustive: never = command;
      return state;
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const engineStore = new EngineStore();
export type { EngineStore };
