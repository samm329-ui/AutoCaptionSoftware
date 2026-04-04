/**
 * useTrackOrdering
 * ─────────────────
 * Keeps visual track order in sync with a Premiere Pro-style layout:
 *
 *   Canvas top ──────────────────────────────
 *     V3  (highest video track)
 *     V2
 *     V1  (lowest video track, just above divider)
 *   ──── divider ────
 *     A1  (lowest audio track, just below divider)
 *     A2
 *     A3  (highest audio track)
 *   Canvas bottom ───────────────────────────
 *
 * Only reorders Zustand + canvas. Does NOT write back to StateManager.
 * StateManager stays as the authoritative source; Zustand is its visual mirror.
 */

import { useEffect, useRef, useCallback } from "react";
import useStore from "../store/use-store";
import { ITrack } from "@designcombo/types";

const VIDEO_TYPES = new Set(["video", "image", "main", "customTrack", "customTrack2"]);
const AUDIO_TYPES = new Set(["audio", "linealAudioBars", "radialAudioBars", "waveAudioBars", "hillAudioBars"]);

function isVideoTrack(t: ITrack) {
  return VIDEO_TYPES.has(t.type);
}

function isAudioTrack(t: ITrack) {
  return AUDIO_TYPES.has(t.type);
}

export function useTrackOrdering(canvasRef: React.RefObject<any>) {
  const { tracks } = useStore();
  const prevOrderRef = useRef<string>("");
  const isReorderingRef = useRef(false);

  const reorderTracks = useCallback(() => {
    const currentTracks = useStore.getState().tracks;
    if (!currentTracks || currentTracks.length === 0) return;

    const currentOrder = currentTracks.map((t) => t.id).join("|");
    if (currentOrder === prevOrderRef.current) return;

    const videoTracks = currentTracks.filter(isVideoTrack);
    const audioTracks = currentTracks.filter(isAudioTrack);
    const otherTracks = currentTracks.filter(
      (t) => !isVideoTrack(t) && !isAudioTrack(t)
    );

    // Video: newest (last added) renders at canvas top = V3, V2, V1 (reversed)
    const orderedVideo = [...videoTracks].reverse();
    // Audio: keep chronological so first added = A1 (just below divider)
    const orderedAudio = [...audioTracks];

    // Final order: [V3, V2, V1, A1, A2, A3, ...others]
    const sorted = [...orderedVideo, ...orderedAudio, ...otherTracks];
    const sortedOrder = sorted.map((t) => t.id).join("|");

    if (currentOrder === sortedOrder) {
      prevOrderRef.current = currentOrder;
      return;
    }

    isReorderingRef.current = true;

    // Only update Zustand — canvas reads from Zustand tracks
    useStore.getState().setState({ tracks: sorted });

    const canvas = canvasRef.current;
    if (canvas) {
      requestAnimationFrame(() => {
        canvas.renderTracks();
        canvas.refreshTrackLayout();
        canvas.alignItemsToTrack();
        canvas.requestRenderAll();
        isReorderingRef.current = false;
      });
    } else {
      isReorderingRef.current = false;
    }

    prevOrderRef.current = sortedOrder;
  }, [canvasRef]);

  useEffect(() => {
    if (isReorderingRef.current) return;
    reorderTracks();
  }, [tracks, reorderTracks]);
}
