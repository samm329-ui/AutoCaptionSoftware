/**
 * hooks/use-player-engine-sync.ts
 * 
 * Syncs player playback state back to the engine.
 * This ensures the playhead position stays in sync during playback.
 */

import { useEffect, useRef } from "react";
import useStore from "../store/use-store";
import { engineStore } from "../engine/engine-core";
import { setPlayhead } from "../engine/commands";
import { frameToMs } from "../engine/time-scale";

const usePlayerEngineSync = (): void => {
  const { playerRef } = useStore();
  const frameRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const lastMsRef = useRef<number>(-1);

  useEffect(() => {
    const ref = playerRef?.current;
    if (!ref) return;

    let lastTime = 0;
    
    const updatePlayhead = () => {
      const currentFrame = (ref as any).getCurrentFrame?.() ?? 0;
      const fps = engineStore.getState().sequences[engineStore.getState().rootSequenceId]?.fps ?? 30;
      
      const timeMs = frameToMs(currentFrame, fps);
      
      // Only update if the time has changed
      if (timeMs !== lastMsRef.current) {
        lastMsRef.current = timeMs;
engineStore.dispatch(setPlayhead(timeMs));
      }
      
      // Continue updating if playing
      if ((ref as any).isPlaying?.()) {
        rafRef.current = requestAnimationFrame(updatePlayhead);
      }
    };

    const handlePlay = () => {
      rafRef.current = requestAnimationFrame(updatePlayhead);
    };

    const handlePause = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Update one final time to ensure sync
      const currentFrame = (ref as any).getCurrentFrame?.() ?? 0;
      const fps = engineStore.getState().sequences[engineStore.getState().rootSequenceId]?.fps ?? 30;
      const timeMs = frameToMs(currentFrame, fps);
      engineStore.dispatch(setPlayhead(timeMs), { skipHistory: true });
    };

    ref.addEventListener("play", handlePlay);
    ref.addEventListener("pause", handlePause);

    return () => {
      ref.removeEventListener("play", handlePlay);
      ref.removeEventListener("pause", handlePause);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [playerRef]);
};

export default usePlayerEngineSync;