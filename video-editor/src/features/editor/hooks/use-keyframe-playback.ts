"use client";

/**
 * useKeyframePlayback
 * ────────────────────
 * Runs on every animation frame during playback.
 * For each clip that has keyframe tracks, it samples the correct value
 * at the current playhead position and dispatches EDIT_OBJECT to update
 * the live property.
 *
 * This is what makes keyframe animation actually PLAY in the preview.
 *
 * Usage: Call once in your editor root or Scene component.
 *   useKeyframePlayback();
 */

import { useEffect, useRef } from "react";
import useStore from "../store/use-store";
import { useKeyframeStore, AnimatableProperty } from "../store/use-keyframe-store";

const EDIT_OBJECT = "EDIT_OBJECT";

const dispatch = (key: string, payload: { payload?: unknown }) => {
  console.log("dispatch", key, payload);
};

const PROPERTY_TO_DETAILS_KEY: Partial<Record<AnimatableProperty, string>> = {
  opacity: "opacity",
  volume: "volume",
  positionX: "left",
  positionY: "top",
  rotation: "rotate",
  scale: "width",
};

export function useKeyframePlayback() {
  const { playerRef, fps, trackItemsMap } = useStore();
  const { keyframesByClip, getValue } = useKeyframeStore();
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(-1);

  useEffect(() => {
    if (!playerRef) return;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);

      const player = playerRef.current;
      if (!player) return;

      let currentFrame: number;
      try {
        currentFrame = player.getCurrentFrame?.() ?? 0;
      } catch {
        return;
      }

      if (currentFrame === lastFrameRef.current) return;
      lastFrameRef.current = currentFrame;

      const timelineMs = (currentFrame / fps) * 1000;

      // Group by clipId
      const byClip: Record<string, Array<[AnimatableProperty, number]>> = {};

      for (const [clipId, clipKFs] of Object.entries(keyframesByClip)) {
        if (!clipKFs) continue;
        const clip = trackItemsMap[clipId];
        if (!clip) continue;

        const clipStart = (clip as any).display?.from ?? 0;
        const clipEnd = (clip as any).display?.to ?? 0;

        if (timelineMs < clipStart || timelineMs > clipEnd) continue;

        const clipTimeMs = timelineMs - clipStart;

        for (const [propKey, kfTrack] of Object.entries(clipKFs)) {
          if (!kfTrack || kfTrack.keyframes.length === 0) continue;
          const prop = propKey as AnimatableProperty;
          const value = getValue(clipId, prop, clipTimeMs);
          
          if (!byClip[clipId]) byClip[clipId] = [];
          byClip[clipId].push([prop, value]);
        }
      }

      // Dispatch batch updates
      if (Object.keys(byClip).length === 0) return;

      const payload: Record<string, { details: Record<string, number> }> = {};

      for (const [clipId, propValues] of Object.entries(byClip)) {
        const details: Record<string, number> = {};
        for (const [prop, value] of propValues) {
          const detailsKey = PROPERTY_TO_DETAILS_KEY[prop];
          if (detailsKey) details[detailsKey] = value;
        }
        if (Object.keys(details).length > 0) {
          payload[clipId] = { details };
        }
      }

      if (Object.keys(payload).length > 0) {
        dispatch(EDIT_OBJECT, { payload });
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playerRef, fps, trackItemsMap, keyframesByClip, getValue]);
}
