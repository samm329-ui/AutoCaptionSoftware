/**
 * index.ts
 * Public API of the editor engine.
 *
 * Import from here — never import from sub-modules directly in UI code.
 * This keeps refactoring isolated to a single entry point.
 */

// ── Core store ────────────────────────────────────────────────────────────────
export { engineStore } from "./state/engine-store";
export type { EngineStore, StoreListener } from "./state/engine-store";

// ── Domain model ──────────────────────────────────────────────────────────────
export type {
  Project, Sequence, Track, Clip, Asset, Effect,
  Transition, Caption, CaptionWord, CaptionStyle,
  Keyframe, Marker, UIState, Viewport, SelectionRect,
  ClipDisplay, ClipTrim, ClipType, TrackType, Transform,
  Milliseconds, Pixels, ZoomFactor,
} from "./model/schema";
export { DEFAULT_TRANSFORM } from "./model/schema";

// ── Commands ──────────────────────────────────────────────────────────────────
export type {
  EditorCommand, CommandType,
  // Caption commands (named exports for discoverability)
  AddCaptionsCommand, UpdateCaptionCommand,
  DeleteCaptionsCommand, ClearTrackCaptionsCommand,
} from "./commands";

// ── Selectors ─────────────────────────────────────────────────────────────────
export {
  getOrderedTracks, getTrackClips, getSelectedClips,
  getActiveClip, isSingleSelection, getDuration,
  getCanvasSize, getClipsAtTime, getCaptionsAtTime,
  getSortedCaptions, computeNaturalDuration, getSnapPoints,
} from "./state/selectors";
export type { SnapPoint } from "./state/selectors";

// ── Event bus ─────────────────────────────────────────────────────────────────
export { eventBus } from "./events/event-bus";
export type { EditorEventMap } from "./events/editor-events";

// ── React hooks ───────────────────────────────────────────────────────────────
export {
  // Core
  useEngineSelector, useEngineDispatch,
  shallowArrayEqual, shallowObjectEqual,
  // Domain hooks
  useOrderedTracks, useTrackClips,
  useSelectionIds, useSelectedClips, useActiveClip,
  usePlayheadTime, useZoom, useScroll,
  useDuration, useCanvasSize, useHistory, useProjectSnapshot,
} from "./bridge/react-adapter";

// ── Bridges ───────────────────────────────────────────────────────────────────
export { applyLegacyUpdate, engineToLegacy } from "./bridge/legacy-adapter";
export type { LegacyTimelineState } from "./bridge/legacy-adapter";
export { projectToRemotionProps, timeMsToFrame, frameToTimeMs } from "./bridge/remotion-adapter";
export {
  startCaptionJob, cancelCaptionJob, cancelAllCaptionJobs,
} from "./bridge/caption-adapter";

// ── Interaction commander (event → command wiring) ────────────────────────────
export {
  mountInteractionCommander,
  getActiveDrag,
  getActiveTrim,
} from "./runtime/interaction/interaction-commander";

// ── Drag registry ─────────────────────────────────────────────────────────────
export { dragRegistry, registerClipDrag, registerAssetDrag } from "./runtime/interaction/drag-registry";
export type { DragPayload, DragSource } from "./runtime/interaction/drag-registry";

// ── Snap ──────────────────────────────────────────────────────────────────────
export { getSnapResult, snapTimeToX } from "./runtime/interaction/snap-manager";
export type { SnapResult } from "./runtime/interaction/snap-manager";

// ── Pointer ───────────────────────────────────────────────────────────────────
export {
  startPointerDrag,
  onPointerMove,
  onPointerUp,
  cancelPointerDrag,
  getActiveSession,
} from "./runtime/interaction/pointer-manager";

// ── Keyboard ─────────────────────────────────────────────────────────────────
export { mountKeyboardManager, registerShortcut } from "./runtime/interaction/keyboard-manager";

// ── Canvas renderer ───────────────────────────────────────────────────────────
export { TimelineCanvasRenderer } from "./runtime/render/timeline-canvas";
export type { RenderOptions } from "./runtime/render/timeline-canvas";

// ── Layout / coordinate converters ───────────────────────────────────────────
export {
  timeMsToX, xToTimeMs, durationToWidth, widthToDuration,
  trackIndexToY, yToTrackIndex, getRulerTicks, hitTestClip, formatTime,
  TRACK_HEIGHT_PX, TRACK_HEADER_WIDTH_PX, TIMELINE_RULER_HEIGHT_PX,
} from "./runtime/layout/time-converter";
export type { RulerTick, ClipHitArea } from "./runtime/layout/time-converter";

// ── Normalizers ───────────────────────────────────────────────────────────────
export { normalizeClip, normalizeTrack, normalizeAsset, normalizeCaption } from "./validation/normalize";
export { validateCommand } from "./validation/guards";

// ── Factory ───────────────────────────────────────────────────────────────────
export { createEmptyProject, createTrack } from "./state/factory";

// ── Utilities ─────────────────────────────────────────────────────────────────
export { nanoid } from "./utils/id";
