/**
 * commands/index.ts
 * Typed command definitions. Every mutation to the project state
 * flows through one of these command objects.
 *
 * Commands are plain data payloads — no methods.
 * The reducer in state/reducer.ts knows how to apply each one.
 *
 * Pattern:
 *   type: string literal discriminant
 *   payload: everything the reducer needs
 */

import type {
  Clip,
  ClipDetails,
  ClipDisplay,
  ClipTrim,
  ClipType,
  Effect,
  Keyframe,
  Marker,
  Milliseconds,
  Pixels,
  Track,
  TrackType,
  Transform,
  Transition,
  UIState,
  ZoomFactor,
} from "../model/schema";

// ─── Clip Commands ────────────────────────────────────────────────────────────

export interface AddClipCommand {
  type: "ADD_CLIP";
  payload: {
    clip: Omit<Clip, "effectIds" | "keyframeIds"> & {
      effectIds?: string[];
      keyframeIds?: string[];
    };
    /** Append to this track; if omitted, a new track is created */
    trackId?: string;
  };
}

export interface MoveClipCommand {
  type: "MOVE_CLIP";
  payload: {
    clipId: string;
    newStart: Milliseconds;
    /** Move to a different track */
    newTrackId?: string;
  };
}

export interface TrimClipCommand {
  type: "TRIM_CLIP";
  payload: {
    clipId: string;
    display: ClipDisplay;
    trim: ClipTrim;
  };
}

export interface SplitClipCommand {
  type: "SPLIT_CLIP";
  payload: {
    clipId: string;
    /** Timeline position in ms where the cut happens */
    splitAt: Milliseconds;
    /** Pre-generated IDs for the two resulting clips */
    leftId: string;
    rightId: string;
  };
}

export interface DeleteClipCommand {
  type: "DELETE_CLIP";
  payload: {
    clipIds: string[];
  };
}

export interface DuplicateClipCommand {
  type: "DUPLICATE_CLIP";
  payload: {
    clipId: string;
    /** Pre-generated ID for the new clip */
    newClipId: string;
    /** Offset from original start in ms. Default: 0 (same position, new track) */
    offsetMs?: Milliseconds;
  };
}

export interface UpdateClipCommand {
  type: "UPDATE_CLIP";
  payload: {
    clipId: string;
    details?: Partial<ClipDetails>;
    transform?: Partial<Transform>;
    display?: Partial<ClipDisplay>;
    trim?: Partial<ClipTrim>;
    name?: string;
  };
}

export interface RippleEditCommand {
  type: "RIPPLE_EDIT";
  payload: {
    clipId: string;
    edge: "start" | "end";
    deltaMs: Milliseconds;
  };
}

export interface RollingEditCommand {
  type: "ROLLING_EDIT";
  payload: {
    leftClipId: string;
    rightClipId: string;
    deltaMs: Milliseconds;
  };
}

export interface SlipEditCommand {
  type: "SLIP_EDIT";
  payload: {
    clipId: string;
    deltaMs: Milliseconds;
  };
}

export interface SlideEditCommand {
  type: "SLIDE_EDIT";
  payload: {
    clipId: string;
    deltaMs: Milliseconds;
  };
}

// ─── Effect Commands ──────────────────────────────────────────────────────────

export interface AddEffectCommand {
  type: "ADD_EFFECT";
  payload: {
    clipId: string;
    effect: Effect;
  };
}

export interface RemoveEffectCommand {
  type: "REMOVE_EFFECT";
  payload: {
    clipId: string;
    effectId: string;
  };
}

export interface UpdateEffectCommand {
  type: "UPDATE_EFFECT";
  payload: {
    effectId: string;
    params: Record<string, unknown>;
  };
}

// ─── Transition Commands ──────────────────────────────────────────────────────

export interface AddTransitionCommand {
  type: "ADD_TRANSITION";
  payload: {
    transition: Transition;
  };
}

export interface RemoveTransitionCommand {
  type: "REMOVE_TRANSITION";
  payload: {
    transitionId: string;
  };
}

// ─── Track Commands ───────────────────────────────────────────────────────────

export interface AddTrackCommand {
  type: "ADD_TRACK";
  payload: {
    track: Omit<Track, "clipIds"> & { clipIds?: string[] };
  };
}

export interface RemoveTrackCommand {
  type: "REMOVE_TRACK";
  payload: {
    trackId: string;
  };
}

export interface ReorderTrackCommand {
  type: "REORDER_TRACK";
  payload: {
    trackId: string;
    newOrder: number;
  };
}

export interface UpdateTrackCommand {
  type: "UPDATE_TRACK";
  payload: {
    trackId: string;
    locked?: boolean;
    muted?: boolean;
    hidden?: boolean;
    name?: string;
  };
}

// ─── Keyframe Commands ────────────────────────────────────────────────────────

export interface AddKeyframeCommand {
  type: "ADD_KEYFRAME";
  payload: {
    keyframe: Keyframe;
  };
}

export interface RemoveKeyframeCommand {
  type: "REMOVE_KEYFRAME";
  payload: {
    keyframeId: string;
  };
}

export interface UpdateKeyframeCommand {
  type: "UPDATE_KEYFRAME";
  payload: {
    keyframeId: string;
    time?: Milliseconds;
    value?: unknown;
    easing?: Keyframe["easing"];
  };
}

// ─── Marker Commands ──────────────────────────────────────────────────────────

export interface AddMarkerCommand {
  type: "ADD_MARKER";
  payload: {
    marker: Marker;
  };
}

export interface RemoveMarkerCommand {
  type: "REMOVE_MARKER";
  payload: {
    markerId: string;
  };
}

// ─── Selection Commands ───────────────────────────────────────────────────────

export interface SetSelectionCommand {
  type: "SET_SELECTION";
  payload: {
    clipIds: string[];
  };
}

export interface AddToSelectionCommand {
  type: "ADD_TO_SELECTION";
  payload: {
    clipId: string;
  };
}

export interface ClearSelectionCommand {
  type: "CLEAR_SELECTION";
}

// ─── UI / Viewport Commands ───────────────────────────────────────────────────

export interface SetPlayheadCommand {
  type: "SET_PLAYHEAD";
  payload: {
    timeMs: Milliseconds;
  };
}

export interface SetZoomCommand {
  type: "SET_ZOOM";
  payload: {
    zoom: ZoomFactor;
  };
}

export interface SetScrollCommand {
  type: "SET_SCROLL";
  payload: {
    scrollX?: Pixels;
    scrollY?: Pixels;
  };
}

// ─── Caption Commands ─────────────────────────────────────────────────────────

export interface AddCaptionsCommand {
  type: "ADD_CAPTIONS";
  payload: {
    /** All captions to insert (existing captions with same id are replaced) */
    captions: import("../model/schema").Caption[];
  };
}

export interface UpdateCaptionCommand {
  type: "UPDATE_CAPTION";
  payload: {
    captionId: string;
    text?: string;
    start?: import("../model/schema").Milliseconds;
    end?: import("../model/schema").Milliseconds;
    style?: import("../model/schema").CaptionStyle;
    animationPreset?: string;
  };
}

export interface DeleteCaptionsCommand {
  type: "DELETE_CAPTIONS";
  payload: {
    captionIds: string[];
  };
}

export interface ClearTrackCaptionsCommand {
  type: "CLEAR_TRACK_CAPTIONS";
  payload: {
    /** Delete all captions whose clipId belongs to this clip, or all for this trackId */
    clipId?: string;
    trackId?: string;
  };
}

export interface LoadProjectCommand {
  type: "LOAD_PROJECT";
  payload: {
    /** Full project snapshot to replace state with */
    project: import("../model/schema").Project;
  };
}

export interface ResizeProjectCommand {
  type: "RESIZE_PROJECT";
  payload: {
    width: number;
    height: number;
  };
}

export interface UpdateProjectNameCommand {
  type: "UPDATE_PROJECT_NAME";
  payload: {
    name: string;
  };
}

// ─── Discriminated Union ──────────────────────────────────────────────────────

export type EditorCommand =
  // Clip
  | AddClipCommand
  | MoveClipCommand
  | TrimClipCommand
  | SplitClipCommand
  | DeleteClipCommand
  | DuplicateClipCommand
  | UpdateClipCommand
  | RippleEditCommand
  | RollingEditCommand
  | SlipEditCommand
  | SlideEditCommand
  // Effects
  | AddEffectCommand
  | RemoveEffectCommand
  | UpdateEffectCommand
  // Transitions
  | AddTransitionCommand
  | RemoveTransitionCommand
  // Tracks
  | AddTrackCommand
  | RemoveTrackCommand
  | ReorderTrackCommand
  | UpdateTrackCommand
  // Keyframes
  | AddKeyframeCommand
  | RemoveKeyframeCommand
  | UpdateKeyframeCommand
  // Markers
  | AddMarkerCommand
  | RemoveMarkerCommand
  // Captions
  | AddCaptionsCommand
  | UpdateCaptionCommand
  | DeleteCaptionsCommand
  | ClearTrackCaptionsCommand
  // Selection
  | SetSelectionCommand
  | AddToSelectionCommand
  | ClearSelectionCommand
  // UI
  | SetPlayheadCommand
  | SetZoomCommand
  | SetScrollCommand
  // Project
  | LoadProjectCommand
  | ResizeProjectCommand
  | UpdateProjectNameCommand;

export type CommandType = EditorCommand["type"];
