/**
 * hooks/use-timeline-events.ts — FIXED
 *
 * WATCHES: engine ui.playheadTime → player.seekTo() when it changes.
 * LISTENS: player-bus events → call player methods.
 */

import { useEffect, useRef } from "react";
import useStore from "../store/use-store";
import { engineStore } from "../engine/engine-core";
import { onPlayerEvent } from "./player-bus";
import { setPlayhead } from "../engine/commands";

const useTimelineEvents = (): void => {
  const { playerRef } = useStore();
  const fpsRef = useRef<number>(30);

  useEffect(() => {
    const unsub = engineStore.subscribe((state) => {
      const fps = state.sequences[state.rootSequenceId]?.fps ?? 30;
      fpsRef.current = fps;
    });
    return unsub;
  }, []);

  useEffect(() => {
    let lastMs = -1;

    const unsub = engineStore.subscribe((state) => {
      const timeMs = state.ui.playheadTime;
      if (timeMs === lastMs) return;
      lastMs = timeMs;

      const ref = playerRef?.current;
      if (!ref) return;

      const frame = Math.round((timeMs / 1000) * fpsRef.current);
      try {
        ref.seekTo(frame);
      } catch { /* ignore if player not ready */ }
    });

    return unsub;
  }, [playerRef]);

  useEffect(() => {
    const unsub = onPlayerEvent((event) => {
      const ref = playerRef?.current;

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
