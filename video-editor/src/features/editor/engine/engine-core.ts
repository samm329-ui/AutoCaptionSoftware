/**
 * engine-core.ts
 * Lightweight engine core that doesn't require React.
 * Provides the core store functionality for video-editor integration.
 */

// Minimal type definitions
export interface Project {
  id: string;
  name: string;
  version: number;
  rootSequenceId: string;
  sequences: Record<string, Sequence>;
  tracks: Record<string, Track>;
  clips: Record<string, Clip>;
  assets: Record<string, any>;
  effects: Record<string, any>;
  transitions: Record<string, any>;
  captions: Record<string, any>;
  keyframes: Record<string, any>;
  markers: Record<string, any>;
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
  details: Record<string, any>;
  effectIds: string[];
  keyframeIds: string[];
  metadata?: Record<string, any>;
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
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

// Generate unique IDs
let idCounter = 0;
export function nanoid(): string {
  return `id_${Date.now()}_${++idCounter}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create empty project
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
      zoom: 1 / 300,
      scrollX: 0,
      scrollY: 0,
      timelineVisible: true,
    },
    ...overrides,
  };
}

// Create a track
export function createTrack(
  type: Track["type"],
  overrides?: Partial<Track>
): Track {
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

// Command types
export type EditorCommand =
  | { type: "ADD_TRACK"; payload: { track: Track } }
  | { type: "REMOVE_TRACK"; payload: { trackId: string } }
  | { type: "ADD_CLIP"; payload: { clip: Clip; trackId?: string } }
  | { type: "MOVE_CLIP"; payload: { clipId: string; newStart: number; newTrackId?: string } }
  | { type: "DELETE_CLIP"; payload: { clipIds: string[] } }
  | { type: "UPDATE_CLIP"; payload: { clipId: string; details?: Record<string, any>; transform?: Partial<Transform> } }
  | { type: "SET_SELECTION"; payload: { clipIds: string[] } }
  | { type: "SET_PLAYHEAD"; payload: { timeMs: number } }
  | { type: "SET_ZOOM"; payload: { zoom: number } }
  | { type: "LOAD_PROJECT"; payload: { project: Project } };

// History entry
interface HistoryEntry {
  before: Project;
  command: EditorCommand;
  description?: string;
}

const MAX_HISTORY = 120;

// Simple store implementation
type StoreListener = (state: Project, command: EditorCommand | null) => void;

class EngineStore {
  private state: Project;
  private past: HistoryEntry[] = [];
  private future: EditorCommand[] = [];
  private listeners: Set<StoreListener> = new Set();

  constructor(initialState?: Project) {
    this.state = initialState ?? createEmptyProject();
  }

  getState(): Project {
    return this.state;
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(command: EditorCommand): void {
    const before = this.state;
    const next = reducer(this.state, command);
    if (next === this.state) return;

    this.recordHistory({ before, command });
    this.state = next;
    this.notify(command);
  }

  private recordHistory(entry: HistoryEntry): void {
    this.past.push(entry);
    if (this.past.length > MAX_HISTORY) this.past.shift();
    this.future = [];
  }

  private notify(command: EditorCommand | null): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state, command);
      } catch (e) {
        console.error("[EngineStore] Listener threw:", e);
      }
    }
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): void {
    if (this.past.length === 0) return;
    const entry = this.past[this.past.length - 1];
    this.future.unshift(entry.command);
    this.past.pop();
    this.state = entry.before;
    this.notify(null);
  }

  redo(): void {
    if (this.future.length === 0) return;
    const command = this.future[0];
    this.future.shift();
    const before = this.state;
    const next = reducer(this.state, command);
    this.past.push({ before, command });
    if (this.past.length > MAX_HISTORY) this.past.shift();
    this.state = next;
    this.notify(command);
  }
}

// Pure reducer
function reducer(state: Project, command: EditorCommand): Project {
  switch (command.type) {
    case "LOAD_PROJECT": {
      return command.payload.project;
    }

    case "ADD_TRACK": {
      const { track } = command.payload;
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

    case "ADD_CLIP": {
      const { clip, trackId } = command.payload;
      const targetTrackId = trackId ?? clip.trackId;
      if (!targetTrackId || !state.tracks[targetTrackId]) return state;

      const track = state.tracks[targetTrackId];
      return {
        ...state,
        clips: { ...state.clips, [clip.id]: { ...clip, trackId: targetTrackId } },
        tracks: {
          ...state.tracks,
          [targetTrackId]: { ...track, clipIds: [...track.clipIds, clip.id] },
        },
      };
    }

    case "MOVE_CLIP": {
      const { clipId, newStart, newTrackId } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;

      const duration = clip.display.to - clip.display.from;
      const updatedClip = {
        ...clip,
        display: { from: newStart, to: newStart + duration },
        trackId: newTrackId ?? clip.trackId,
      };

      return {
        ...state,
        clips: { ...state.clips, [clipId]: updatedClip },
      };
    }

    case "DELETE_CLIP": {
      const { clipIds } = command.payload;
      const idSet = new Set(clipIds);
      const newClips = { ...state.clips };
      for (const id of idSet) delete newClips[id];

      return {
        ...state,
        clips: newClips,
        ui: { ...state.ui, selection: state.ui.selection.filter((id) => !idSet.has(id)) },
      };
    }

    case "UPDATE_CLIP": {
      const { clipId, ...patch } = command.payload;
      const clip = state.clips[clipId];
      if (!clip) return state;

      const updatedClip: Clip = {
        ...clip,
        transform: patch.transform
          ? { ...clip.transform, ...patch.transform }
          : clip.transform,
        details: patch.details ? { ...clip.details, ...patch.details } : clip.details,
      };

      return {
        ...state,
        clips: {
          ...state.clips,
          [clipId]: updatedClip,
        },
      };
    }

    case "SET_SELECTION": {
      return { ...state, ui: { ...state.ui, selection: command.payload.clipIds } };
    }

    case "SET_PLAYHEAD": {
      return { ...state, ui: { ...state.ui, playheadTime: command.payload.timeMs } };
    }

    case "SET_ZOOM": {
      return { ...state, ui: { ...state.ui, zoom: Math.max(0.001, command.payload.zoom) } };
    }

    default:
      return state;
  }
}

// Export singleton
export const engineStore = new EngineStore();