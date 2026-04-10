/**
 * hooks/use-player-events.ts — FIXED
 *
 * Alternative player control hook.
 * If useTimelineEvents is mounted, you don't need this separately.
 */

import { useEffect, useRef } from "react";
import useStore from "../store/use-store";
import { engineStore } from "../engine/engine-core";
import { onPlayerEvent } from "./player-bus";
import { setPlayhead } from "../engine/commands";

const usePlayerEvents = (): void => {
  const { playerRef } = useStore();
  const fpsRef = useRef<number>(30);

  useEffect(() => {
    const unsub = engineStore.subscribe((state) => {
      fpsRef.current = state.sequences[state.rootSequenceId]?.fps ?? 30;
    });
    return unsub;
  }, []);

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

export default usePlayerEvents;
