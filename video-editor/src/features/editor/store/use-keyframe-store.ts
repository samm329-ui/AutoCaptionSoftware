/**
 * Keyframe Store
 * Manages all keyframe tracks for all clips.
 * Each clip can have multiple property tracks (opacity, positionX, positionY, scale, rotation, etc.)
 *
 * Structure:
 *   keyframesByClip: {
 *     [clipId]: {
 *       [property]: KeyframeTrack
 *     }
 *   }
 */

import { create } from "zustand";
import {
  KeyframeTrack,
  Keyframe,
  InterpolationType,
  addKeyframe,
  removeKeyframe,
  moveKeyframe,
  updateKeyframeValue,
  updateKeyframeInterpolation,
  sampleKeyframeTrack,
} from "../engine/keyframe-engine";

// Re-export for convenience
export type { KeyframeTrack, Keyframe, InterpolationType };
export { sampleKeyframeTrack };

// ─── Types ────────────────────────────────────────────────────────────────────

/** All animatable properties */
export type AnimatableProperty =
  | "opacity"
  | "positionX"
  | "positionY"
  | "scale"
  | "scaleX"
  | "scaleY"
  | "rotation"
  | "volume"
  | "blur"
  | "brightness"
  | "contrast"
  | "saturation"
  | "cropLeft"
  | "cropRight"
  | "cropTop"
  | "cropBottom";

export const PROPERTY_DEFAULTS: Record<AnimatableProperty, number> = {
  opacity: 100,
  positionX: 0,
  positionY: 0,
  scale: 100,
  scaleX: 100,
  scaleY: 100,
  rotation: 0,
  volume: 100,
  blur: 0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  cropLeft: 0,
  cropRight: 0,
  cropTop: 0,
  cropBottom: 0,
};

export const PROPERTY_RANGES: Record<AnimatableProperty, [number, number]> = {
  opacity: [0, 100],
  positionX: [-4000, 4000],
  positionY: [-4000, 4000],
  scale: [1, 500],
  scaleX: [1, 500],
  scaleY: [1, 500],
  rotation: [-360, 360],
  volume: [0, 200],
  blur: [0, 100],
  brightness: [0, 200],
  contrast: [0, 200],
  saturation: [0, 200],
  cropLeft: [0, 100],
  cropRight: [0, 100],
  cropTop: [0, 100],
  cropBottom: [0, 100],
};

export const PROPERTY_LABELS: Record<AnimatableProperty, string> = {
  opacity: "Opacity",
  positionX: "Position X",
  positionY: "Position Y",
  scale: "Scale",
  scaleX: "Scale X",
  scaleY: "Scale Y",
  rotation: "Rotation",
  volume: "Volume",
  blur: "Blur",
  brightness: "Brightness",
  contrast: "Contrast",
  saturation: "Saturation",
  cropLeft: "Crop Left",
  cropRight: "Crop Right",
  cropTop: "Crop Top",
  cropBottom: "Crop Bottom",
};

type ClipKeyframes = Partial<Record<AnimatableProperty, KeyframeTrack>>;

// ─── Store ────────────────────────────────────────────────────────────────────

interface IKeyframeStore {
  /** { clipId → { property → KeyframeTrack } } */
  keyframesByClip: Record<string, ClipKeyframes>;

  /** Add a keyframe for a clip property at a given time */
  addKeyframe: (
    clipId: string,
    property: AnimatableProperty,
    timeMs: number,
    value: number,
    interpolation?: InterpolationType
  ) => void;

  /** Remove a specific keyframe */
  removeKeyframe: (clipId: string, property: AnimatableProperty, keyframeId: string) => void;

  /** Move a keyframe to a new time */
  moveKeyframe: (clipId: string, property: AnimatableProperty, keyframeId: string, newTimeMs: number) => void;

  /** Update a keyframe's value */
  updateKeyframeValue: (clipId: string, property: AnimatableProperty, keyframeId: string, value: number) => void;

  /** Update a keyframe's interpolation type */
  updateInterpolation: (
    clipId: string,
    property: AnimatableProperty,
    keyframeId: string,
    interpolation: InterpolationType
  ) => void;

  /** Get the value of a property at a given time (interpolated) */
  getValue: (clipId: string, property: AnimatableProperty, timeMs: number) => number;

  /** Check if a property has any keyframes */
  hasKeyframes: (clipId: string, property: AnimatableProperty) => boolean;

  /** Get all keyframes for a clip */
  getClipKeyframes: (clipId: string) => ClipKeyframes;

  /** Get track for a specific property */
  getTrack: (clipId: string, property: AnimatableProperty) => KeyframeTrack | undefined;

  /** Enable keyframing for a property (creates empty track) */
  enableProperty: (clipId: string, property: AnimatableProperty) => void;

  /** Disable keyframing for a property (removes all keyframes) */
  disableProperty: (clipId: string, property: AnimatableProperty) => void;

  /** Remove all keyframes for a clip (when clip is deleted) */
  removeClip: (clipId: string) => void;
}

function getOrCreateTrack(
  clipKeyframes: ClipKeyframes,
  property: AnimatableProperty
): KeyframeTrack {
  return (
    clipKeyframes[property] ?? {
      property,
      keyframes: [],
      defaultValue: PROPERTY_DEFAULTS[property],
    }
  );
}

export const useKeyframeStore = create<IKeyframeStore>((set, get) => ({
  keyframesByClip: {},

  addKeyframe: (clipId, property, timeMs, value, interpolation = "linear") => {
    set((state) => {
      const clipKFs = state.keyframesByClip[clipId] ?? {};
      const track = getOrCreateTrack(clipKFs, property);
      const updated = addKeyframe(track, { time: timeMs, value, interpolation });
      return {
        keyframesByClip: {
          ...state.keyframesByClip,
          [clipId]: { ...clipKFs, [property]: updated },
        },
      };
    });
  },

  removeKeyframe: (clipId, property, keyframeId) => {
    set((state) => {
      const clipKFs = state.keyframesByClip[clipId];
      if (!clipKFs) return state;
      const track = clipKFs[property];
      if (!track) return state;
      const updated = removeKeyframe(track, keyframeId);
      return {
        keyframesByClip: {
          ...state.keyframesByClip,
          [clipId]: { ...clipKFs, [property]: updated },
        },
      };
    });
  },

  moveKeyframe: (clipId, property, keyframeId, newTimeMs) => {
    set((state) => {
      const clipKFs = state.keyframesByClip[clipId];
      if (!clipKFs) return state;
      const track = clipKFs[property];
      if (!track) return state;
      const updated = moveKeyframe(track, keyframeId, newTimeMs);
      return {
        keyframesByClip: {
          ...state.keyframesByClip,
          [clipId]: { ...clipKFs, [property]: updated },
        },
      };
    });
  },

  updateKeyframeValue: (clipId, property, keyframeId, value) => {
    set((state) => {
      const clipKFs = state.keyframesByClip[clipId];
      if (!clipKFs) return state;
      const track = clipKFs[property];
      if (!track) return state;
      const updated = updateKeyframeValue(track, keyframeId, value);
      return {
        keyframesByClip: {
          ...state.keyframesByClip,
          [clipId]: { ...clipKFs, [property]: updated },
        },
      };
    });
  },

  updateInterpolation: (clipId, property, keyframeId, interpolation) => {
    set((state) => {
      const clipKFs = state.keyframesByClip[clipId];
      if (!clipKFs) return state;
      const track = clipKFs[property];
      if (!track) return state;
      const updated = updateKeyframeInterpolation(track, keyframeId, interpolation);
      return {
        keyframesByClip: {
          ...state.keyframesByClip,
          [clipId]: { ...clipKFs, [property]: updated },
        },
      };
    });
  },

  getValue: (clipId, property, timeMs) => {
    const clipKFs = get().keyframesByClip[clipId];
    if (!clipKFs) return PROPERTY_DEFAULTS[property];
    const track = clipKFs[property];
    if (!track) return PROPERTY_DEFAULTS[property];
    return sampleKeyframeTrack(track, timeMs);
  },

  hasKeyframes: (clipId, property) => {
    const clipKFs = get().keyframesByClip[clipId];
    if (!clipKFs) return false;
    const track = clipKFs[property];
    return !!(track && track.keyframes.length > 0);
  },

  getClipKeyframes: (clipId) => {
    return get().keyframesByClip[clipId] ?? {};
  },

  getTrack: (clipId, property) => {
    return get().keyframesByClip[clipId]?.[property];
  },

  enableProperty: (clipId, property) => {
    set((state) => {
      const clipKFs = state.keyframesByClip[clipId] ?? {};
      if (clipKFs[property]) return state; // already exists
      return {
        keyframesByClip: {
          ...state.keyframesByClip,
          [clipId]: {
            ...clipKFs,
            [property]: {
              property,
              keyframes: [],
              defaultValue: PROPERTY_DEFAULTS[property],
            },
          },
        },
      };
    });
  },

  disableProperty: (clipId, property) => {
    set((state) => {
      const clipKFs = state.keyframesByClip[clipId];
      if (!clipKFs) return state;
      const { [property]: _, ...rest } = clipKFs;
      return {
        keyframesByClip: {
          ...state.keyframesByClip,
          [clipId]: rest,
        },
      };
    });
  },

  removeClip: (clipId) => {
    set((state) => {
      const { [clipId]: _, ...rest } = state.keyframesByClip;
      return { keyframesByClip: rest };
    });
  },
}));
