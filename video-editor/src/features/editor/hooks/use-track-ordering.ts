/**
 * hooks/use-track-ordering.ts — FIXED
 *
 * Track ordering is now derived purely from engine state.
 * Reorder decisions are persisted back to the engine via UPDATE_TRACK commands.
 */

import { useEffect, useRef, useState } from "react";
import { useEngineDispatch, useEngineStore } from "../engine/engine-provider";
import { updateTrack } from "../engine/commands";
import type { Track, Project } from "../engine/engine-core";

const VIDEO_TYPES = new Set<Track["type"]>(["video", "overlay"]);
const AUDIO_TYPES = new Set<Track["type"]>(["audio"]);

function isVideoTrack(t: Track): boolean { return VIDEO_TYPES.has(t.type); }
function isAudioTrack(t: Track): boolean { return AUDIO_TYPES.has(t.type); }

function selectOrderedTracksArray(p: Project): Track[] {
  const seq = p.sequences[p.rootSequenceId];
  if (!seq) return [];
  return seq.trackIds
    .map((id) => p.tracks[id])
    .filter((t): t is Track => !!t)
    .sort((a, b) => a.order - b.order);
}

export function useTrackOrdering(canvasRef?: React.RefObject<any>): void {
  const store = useEngineStore();
  const dispatch = useEngineDispatch();
  const [tracks, setTracks] = useState<Track[]>([]);
  const prevSignatureRef = useRef("");
  const isSyncingRef = useRef(false);
  const initializedRef = useRef(false);

  // Subscribe to track changes
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const unsubscribe = store.subscribe((state) => {
      const orderedTracks = selectOrderedTracksArray(state);
      setTracks(orderedTracks);
    });
    
    // Initial load
    setTracks(selectOrderedTracksArray(store.getState()));
    
    return unsubscribe;
  }, [store]);

  useEffect(() => {
    if (!tracks || tracks.length === 0) return;
    if (isSyncingRef.current) return;

    const signature = tracks.map((t) => `${t.id}:${t.order}`).join("|");
    if (signature === prevSignatureRef.current) return;

    const videoTracks = tracks.filter(isVideoTrack);
    const audioTracks = tracks.filter(isAudioTrack);
    const otherTracks = tracks.filter((t) => !isVideoTrack(t) && !isAudioTrack(t));

    const sorted = [
      ...[...videoTracks].sort((a, b) => b.order - a.order),
      ...[...audioTracks].sort((a, b) => a.order - b.order),
      ...otherTracks,
    ];

    isSyncingRef.current = true;
    let changed = false;

    sorted.forEach((t, idx) => {
      if (t.order !== idx) {
        dispatch(updateTrack(t.id, { order: idx }));
        changed = true;
      }
    });

    if (changed) {
      prevSignatureRef.current = sorted.map((t, i) => `${t.id}:${i}`).join("|");
    } else {
      prevSignatureRef.current = signature;
    }

    const canvas = canvasRef?.current;
    if (canvas && changed) {
      requestAnimationFrame(() => {
        try {
          canvas.renderTracks?.();
          canvas.refreshTrackLayout?.();
          canvas.alignItemsToTrack?.();
          canvas.requestRenderAll?.();
        } catch { /* ignore canvas errors */ }
        isSyncingRef.current = false;
      });
    } else {
      isSyncingRef.current = false;
    }
  }, [tracks, dispatch, canvasRef]);
}