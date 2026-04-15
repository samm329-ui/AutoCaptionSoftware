/**
 * useKeyframeStore - Pure React implementation
 * No Zustand - uses React hooks with engine as backing store
 */

import { useState, useCallback, useMemo } from "react";
import {
  KeyframeTrack,
  Keyframe,
  InterpolationType,
  addKeyframe as addKf,
  removeKeyframe as removeKf,
  moveKeyframe as moveKf,
  updateKeyframeValue as updateKfValue,
  updateKeyframeInterpolation as updateKfInterp,
  sampleKeyframeTrack,
} from "../engine/keyframe-engine";
import { useKeyframesByClip, engineStore } from "../engine";
import { setKeyframeTrack, removeKeyframeTrack, clearKeyframesForClip } from "../engine/commands";

export type { KeyframeTrack, Keyframe, InterpolationType };
export { sampleKeyframeTrack };

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

export function useKeyframeStore() {
  const [keyframesByClip, setKeyframesByClip] = useState<Record<string, ClipKeyframes>>({});
  
  const engineKeyframes = useKeyframesByClip();

  const addKeyframe = useCallback((
    clipId: string,
    property: AnimatableProperty,
    timeMs: number,
    value: number,
    interpolation: InterpolationType = "linear"
  ) => {
    setKeyframesByClip((prev) => {
      const clipKFs = prev[clipId] ?? {};
      const track = getOrCreateTrack(clipKFs, property);
      const updated = addKf(track, { time: timeMs, value, interpolation });
      return {
        ...prev,
        [clipId]: { ...clipKFs, [property]: updated },
      };
    });
    
    const clipKFs = keyframesByClip[clipId];
    if (clipKFs && clipKFs[property]) {
      engineStore.dispatch(setKeyframeTrack(clipId, property, clipKFs[property]));
    }
  }, [keyframesByClip]);

  const removeKeyframe = useCallback((
    clipId: string,
    property: AnimatableProperty,
    keyframeId: string
  ) => {
    setKeyframesByClip((prev) => {
      const clipKFs = prev[clipId];
      if (!clipKFs) return prev;
      const track = clipKFs[property];
      if (!track) return prev;
      const updated = removeKf(track, keyframeId);
      return {
        ...prev,
        [clipId]: { ...clipKFs, [property]: updated },
      };
    });
    
    const clipKFs = keyframesByClip[clipId];
    if (clipKFs && clipKFs[property]) {
      engineStore.dispatch(setKeyframeTrack(clipId, property, clipKFs[property]));
    }
  }, [keyframesByClip]);

  const moveKeyframe = useCallback((
    clipId: string,
    property: AnimatableProperty,
    keyframeId: string,
    newTimeMs: number
  ) => {
    setKeyframesByClip((prev) => {
      const clipKFs = prev[clipId];
      if (!clipKFs) return prev;
      const track = clipKFs[property];
      if (!track) return prev;
      const updated = moveKf(track, keyframeId, newTimeMs);
      return {
        ...prev,
        [clipId]: { ...clipKFs, [property]: updated },
      };
    });
    
    const clipKFs = keyframesByClip[clipId];
    if (clipKFs && clipKFs[property]) {
      engineStore.dispatch(setKeyframeTrack(clipId, property, clipKFs[property]));
    }
  }, [keyframesByClip]);

  const updateKeyframeValue = useCallback((
    clipId: string,
    property: AnimatableProperty,
    keyframeId: string,
    value: number
  ) => {
    setKeyframesByClip((prev) => {
      const clipKFs = prev[clipId];
      if (!clipKFs) return prev;
      const track = clipKFs[property];
      if (!track) return prev;
      const updated = updateKfValue(track, keyframeId, value);
      return {
        ...prev,
        [clipId]: { ...clipKFs, [property]: updated },
      };
    });
    
    const clipKFs = keyframesByClip[clipId];
    if (clipKFs && clipKFs[property]) {
      engineStore.dispatch(setKeyframeTrack(clipId, property, clipKFs[property]));
    }
  }, [keyframesByClip]);

  const updateInterpolation = useCallback((
    clipId: string,
    property: AnimatableProperty,
    keyframeId: string,
    interpolation: InterpolationType
  ) => {
    setKeyframesByClip((prev) => {
      const clipKFs = prev[clipId];
      if (!clipKFs) return prev;
      const track = clipKFs[property];
      if (!track) return prev;
      const updated = updateKfInterp(track, keyframeId, interpolation);
      return {
        ...prev,
        [clipId]: { ...clipKFs, [property]: updated },
      };
    });
    
    const clipKFs = keyframesByClip[clipId];
    if (clipKFs && clipKFs[property]) {
      engineStore.dispatch(setKeyframeTrack(clipId, property, clipKFs[property]));
    }
  }, [keyframesByClip]);

  const getValue = useCallback((
    clipId: string,
    property: AnimatableProperty,
    timeMs: number
  ) => {
    const clipKFs = keyframesByClip[clipId];
    if (!clipKFs) return PROPERTY_DEFAULTS[property];
    const track = clipKFs[property];
    if (!track) return PROPERTY_DEFAULTS[property];
    return sampleKeyframeTrack(track, timeMs);
  }, [keyframesByClip]);

  const hasKeyframes = useCallback((
    clipId: string,
    property: AnimatableProperty
  ) => {
    const clipKFs = keyframesByClip[clipId];
    if (!clipKFs) return false;
    const track = clipKFs[property];
    return !!(track && track.keyframes.length > 0);
  }, [keyframesByClip]);

  const getClipKeyframes = useCallback((clipId: string) => {
    return keyframesByClip[clipId] ?? {};
  }, [keyframesByClip]);

  const getTrack = useCallback((clipId: string, property: AnimatableProperty) => {
    return keyframesByClip[clipId]?.[property];
  }, [keyframesByClip]);

  const enableProperty = useCallback((clipId: string, property: AnimatableProperty) => {
    setKeyframesByClip((prev) => {
      const clipKFs = prev[clipId] ?? {};
      if (clipKFs[property]) return prev;
      return {
        ...prev,
        [clipId]: {
          ...clipKFs,
          [property]: {
            property,
            keyframes: [],
            defaultValue: PROPERTY_DEFAULTS[property],
          },
        },
      };
    });
    
    const clipKFs = keyframesByClip[clipId];
    if (clipKFs && clipKFs[property]) {
      engineStore.dispatch(setKeyframeTrack(clipId, property, clipKFs[property]));
    }
  }, [keyframesByClip]);

  const disableProperty = useCallback((clipId: string, property: AnimatableProperty) => {
    setKeyframesByClip((prev) => {
      const clipKFs = prev[clipId];
      if (!clipKFs) return prev;
      const { [property]: _, ...rest } = clipKFs;
      return {
        ...prev,
        [clipId]: rest,
      };
    });
    engineStore.dispatch(removeKeyframeTrack(clipId, property));
  }, []);

  const removeClip = useCallback((clipId: string) => {
    setKeyframesByClip((prev) => {
      const { [clipId]: _, ...rest } = prev;
      return rest;
    });
    engineStore.dispatch(clearKeyframesForClip(clipId));
  }, []);

  return useMemo(() => ({
    keyframesByClip,
    addKeyframe,
    removeKeyframe,
    moveKeyframe,
    updateKeyframeValue,
    updateInterpolation,
    getValue,
    hasKeyframes,
    getClipKeyframes,
    getTrack,
    enableProperty,
    disableProperty,
    removeClip,
  }), [
    keyframesByClip,
    addKeyframe,
    removeKeyframe,
    moveKeyframe,
    updateKeyframeValue,
    updateInterpolation,
    getValue,
    hasKeyframes,
    getClipKeyframes,
    getTrack,
    enableProperty,
    disableProperty,
    removeClip,
  ]);
}

export default useKeyframeStore;