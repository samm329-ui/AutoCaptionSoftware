/**
 * hooks/use-timeline-events.ts
 *
 * Listen for player-bus events and sync player state
 * Only sync player → engine during playback (not engine → player constantly)
 */

import { useEffect, useRef } from "react";
import { usePlayerRef } from "../engine/engine-hooks";
import { engineStore } from "../engine/engine-core";
import { onPlayerEvent } from "./player-bus";
import { setPlayhead } from "../engine/commands";

const useTimelineEvents = (): void => {
  const playerRef = usePlayerRef();
  const fpsRef = useRef<number>(30);
  const isPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    const unsub = engineStore.subscribe((state) => {
      const fps = state.sequences[state.rootSequenceId]?.fps ?? 30;
      fpsRef.current = fps;
    });
    return unsub;
  }, []);

  // Sync player frame → engine playhead when playing
  useEffect(() => {
    if (!playerRef) return;
    
    const player = playerRef as any;
    if (!player?.addEventListener) return;
    
    let isSyncing = false;
    
    const handleFrameUpdate = () => {
      // Skip if we're already seeking (to avoid loops)
      if (isSyncing || !isPlayingRef.current) return;
      
      try {
        isSyncing = true;
        const frame = player.getCurrentFrame?.() ?? 0;
        const timeMs = (frame / fpsRef.current) * 1000;
        engineStore.dispatch(setPlayhead(timeMs), { skipHistory: true });
      } catch {
        // ignore
      } finally {
        isSyncing = false;
      }
    };
    
    const handlePlay = () => {
      isPlayingRef.current = true;
    };
    
    const handlePause = () => {
      isPlayingRef.current = false;
    };
    
    player.addEventListener("frameupdate", handleFrameUpdate);
    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    
    return () => {
      player.removeEventListener("frameupdate", handleFrameUpdate);
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
    };
  }, [playerRef]);

  useEffect(() => {
    const unsub = onPlayerEvent((event) => {
      const ref = playerRef;

      switch (event.type) {
        case "SEEK": {
          engineStore.dispatch(setPlayhead(event.timeMs), { skipHistory: true });
          if (!ref) return;
          const frame = Math.round((event.timeMs / 1000) * fpsRef.current);
          try { ref.seekTo(frame); } catch {}
          break;
        }
        case "PLAY":
          try { ref?.play(); } catch {}
          break;
        case "PAUSE":
          try { ref?.pause(); } catch {}
          break;
        case "TOGGLE_PLAY":
          try {
            if (ref?.isPlaying()) { ref.pause(); } else { ref?.play(); }
          } catch {}
          break;
        case "SEEK_BY_FRAMES": {
          if (!ref) return;
          try {
            const currentFrame = (ref as any).getCurrentFrame?.() ?? 0;
            ref.seekTo(Math.round(currentFrame) + event.frames);
          } catch {}
          break;
        }
      }
    });
    return unsub;
  }, [playerRef]);
};

export default useTimelineEvents;
