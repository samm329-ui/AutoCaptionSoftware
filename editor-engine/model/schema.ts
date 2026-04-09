/**
 * schema.ts
 * Master type definitions for the entire editor domain model.
 * All entities are plain data — no methods, no side-effects.
 *
 * Design rules:
 *  - Every record is normalised (flat, keyed by id)
 *  - No circular references
 *  - All times are in milliseconds
 *  - All positions/sizes are in pixels at 1x zoom unless noted
 */

// ─── Primitives ───────────────────────────────────────────────────────────────

export type Milliseconds = number;
export type Pixels = number;
/**
 * ZoomFactor — pixels per millisecond (px/ms).
 *
 * Convention (enforced everywhere in the engine):
 *   px  = timeMs * zoom          (time → screen position)
 *   ms  = px / zoom              (screen position → time)
 *
 * Default: 1/300 ≈ 0.00333 px/ms  (1px represents ~300ms at rest)
 * Zoomed in: higher value (e.g. 1/50 → 1px = 50ms)
 * Zoomed out: lower value (e.g. 1/3000 → 1px = 3s)
 */
export type ZoomFactor = number; // px/ms — NOT ms/px
export type FrameNumber = number;

export type ClipType =
  | "video"
  | "audio"
  | "image"
  | "text"
  | "caption"
  | "transition"
  | "shape"
  | "overlay";

export type TrackType = "video" | "audio" | "text" | "caption" | "overlay";

export type AssetType = "video" | "audio" | "image" | "font";

// ─── Transform ────────────────────────────────────────────────────────────────

export interface Transform {
  x: Pixels;
  y: Pixels;
  scaleX: number;
  scaleY: number;
  rotate: number; // degrees
  opacity: number; // 0-1
  flipX: boolean;
  flipY: boolean;
}

export const DEFAULT_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  opacity: 1,
  flipX: false,
  flipY: false,
};

// ─── Display (timeline footprint) ────────────────────────────────────────────

export interface ClipDisplay {
  /** Clip start on the timeline in ms */
  from: Milliseconds;
  /** Clip end on the timeline in ms */
  to: Milliseconds;
}

// ─── Trim (source media window) ───────────────────────────────────────────────

export interface ClipTrim {
  /** Source media start offset in ms */
  from: Milliseconds;
  /** Source media end offset in ms */
  to: Milliseconds;
}

// ─── Asset ────────────────────────────────────────────────────────────────────

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  url: string;
  previewUrl?: string;
  /** Duration in ms (for video/audio) */
  duration?: Milliseconds;
  /** Native width in px */
  width?: Pixels;
  /** Native height in px */
  height?: Pixels;
  mimeType?: string;
  fileSize?: number;
  metadata?: Record<string, unknown>;
}

// ─── Keyframe ────────────────────────────────────────────────────────────────

export type EasingType =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "spring"
  | "step";

export interface Keyframe {
  id: string;
  clipId: string;
  /** Time relative to clip start in ms */
  time: Milliseconds;
  property: string;
  value: unknown;
  easing: EasingType;
}

// ─── Effect ───────────────────────────────────────────────────────────────────

export interface Effect {
  id: string;
  type: string;
  name: string;
  params: Record<string, unknown>;
}

// ─── Transition ───────────────────────────────────────────────────────────────

export interface Transition {
  id: string;
  type: string;
  name: string;
  /** Duration in ms */
  duration: Milliseconds;
  /** ID of the clip BEFORE this transition */
  fromClipId: string;
  /** ID of the clip AFTER this transition */
  toClipId: string;
  params?: Record<string, unknown>;
}

// ─── Caption / Word ───────────────────────────────────────────────────────────

export interface CaptionWord {
  text: string;
  startMs: Milliseconds;
  endMs: Milliseconds;
  confidence?: number;
}

export interface Caption {
  id: string;
  trackId: string;
  /** Start time on timeline in ms */
  start: Milliseconds;
  /** End time on timeline in ms */
  end: Milliseconds;
  text: string;
  words: CaptionWord[];
  style?: CaptionStyle;
  animationPreset?: string;
}

export interface CaptionStyle {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  highlightColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  position?: "top" | "center" | "bottom";
  textAlign?: "left" | "center" | "right";
}

// ─── Marker ───────────────────────────────────────────────────────────────────

export interface Marker {
  id: string;
  time: Milliseconds;
  label: string;
  color?: string;
}

// ─── Clip ────────────────────────────────────────────────────────────────────

export interface ClipDetails {
  /** Plain text content (text clips) */
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontUrl?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: string;
  wordWrap?: string;
  borderWidth?: number;
  borderColor?: string;
  boxShadow?: { color: string; x: number; y: number; blur: number };
  width?: number;
  height?: number;
  /** Playback speed multiplier */
  speed?: number;
  volume?: number;
  muted?: boolean;
  blur?: number;
  brightness?: number;
  /** Native media duration for video/audio clips */
  duration?: Milliseconds;
  [key: string]: unknown;
}

export interface Clip {
  id: string;
  type: ClipType;
  trackId: string;
  assetId?: string;
  name: string;
  display: ClipDisplay;
  trim: ClipTrim;
  transform: Transform;
  details: ClipDetails;
  effectIds: string[];
  keyframeIds: string[];
  metadata?: Record<string, unknown>;
}

// ─── Track ───────────────────────────────────────────────────────────────────

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  /** Visual order (lower = closer to top in timeline) */
  order: number;
  locked: boolean;
  muted: boolean;
  hidden: boolean;
  /** Ordered list of clip IDs on this track */
  clipIds: string[];
}

// ─── Sequence ────────────────────────────────────────────────────────────────

export interface Sequence {
  id: string;
  name: string;
  /** Total sequence duration in ms */
  duration: Milliseconds;
  fps: number;
  canvas: { width: number; height: number };
  trackIds: string[];
  background: { type: "color" | "image"; value: string };
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface UIState {
  /** Currently selected clip IDs */
  selection: string[];
  /** The track receiving keyboard/focus ops */
  activeTrackId?: string;
  /** Playhead position in ms */
  playheadTime: Milliseconds;
  /** Timeline zoom: pixels per millisecond (px/ms). Default 1/300. */
  zoom: ZoomFactor;
  /** Timeline scroll offset in px */
  scrollX: Pixels;
  /** Timeline vertical scroll offset in px */
  scrollY: Pixels;
  /** Is the timeline panel visible */
  timelineVisible: boolean;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  /** Schema version for migration */
  version: number;
  /** The root sequence */
  rootSequenceId: string;

  sequences: Record<string, Sequence>;
  tracks: Record<string, Track>;
  clips: Record<string, Clip>;
  assets: Record<string, Asset>;
  effects: Record<string, Effect>;
  transitions: Record<string, Transition>;
  captions: Record<string, Caption>;
  keyframes: Record<string, Keyframe>;
  markers: Record<string, Marker>;

  ui: UIState;
}

// ─── Viewport ────────────────────────────────────────────────────────────────

export interface Viewport {
  width: Pixels;
  height: Pixels;
  dpr: number; // devicePixelRatio
}

// ─── Selection ───────────────────────────────────────────────────────────────

export interface SelectionRect {
  x: Pixels;
  y: Pixels;
  width: Pixels;
  height: Pixels;
}
