/**
 * player/player.tsx — ENGINE-FIRST
 *
 * Reads duration / fps / canvas size from the engine.
 * playerRef is runtime-only and stored in Zustand (not project data).
 * background comes from the root sequence (engine).
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Composition from "./composition";
import { Player as RemotionPlayer, PlayerRef } from "@remotion/player";
import {
  useEngineSelector,
} from "../engine/engine-provider";
import {
  selectDuration,
  selectFps,
  selectCanvasSize,
  selectRootSequence,
} from "../engine/selectors";
import useStore from "../store/use-store";

// Fallback constants
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1920;
const DEFAULT_FPS = 30;
const DEFAULT_DURATION = 10000;

const Player = () => {
  const playerRef = useRef<PlayerRef>(null);
  const { setPlayerRef } = useStore();
  const [hasError, setHasError] = useState(false);

  // All project data from engine
  const duration   = useEngineSelector(selectDuration);
  const fps        = useEngineSelector(selectFps);
  const canvasSize = useEngineSelector(selectCanvasSize);
  const sequence   = useEngineSelector(selectRootSequence);

  // Stable values with fallbacks
  const safeDuration = useMemo(() => duration > 0 ? duration : DEFAULT_DURATION, [duration]);
  const safeFps = useMemo(() => fps > 0 ? fps : DEFAULT_FPS, [fps]);
  const safeWidth = useMemo(() => canvasSize?.width > 0 ? canvasSize.width : DEFAULT_WIDTH, [canvasSize?.width]);
  const safeHeight = useMemo(() => canvasSize?.height > 0 ? canvasSize.height : DEFAULT_HEIGHT, [canvasSize?.height]);
  const safeDurationInFrames = useMemo(() => Math.max(1, Math.round((safeDuration / 1000) * safeFps)), [safeDuration, safeFps]);
  const bgColor = useMemo(() => sequence?.background?.value || "#000000", [sequence?.background?.value]);

  // Stable key for RemotionPlayer
  const playerKey = useMemo(() => `${safeWidth}x${safeHeight}@${safeFps}`, [safeWidth, safeHeight, safeFps]);

  const handleError = useCallback((error: Error) => {
    console.error("Video playback error:", error);
    setHasError(true);
  }, []);

  // Register runtime ref in Zustand (UI-only state, not project data)
  useEffect(() => {
    if (setPlayerRef && playerRef.current) {
      setPlayerRef(playerRef as React.RefObject<PlayerRef>);
    }
  }, [setPlayerRef]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const element = player as unknown as HTMLElement;
    const errorHandler = (e: Event) => {
      const error = (e as CustomEvent).detail?.error || new Error("Video playback error");
      handleError(error);
    };
    element.addEventListener("error", errorHandler);
    return () => element.removeEventListener("error", errorHandler);
  }, [handleError]);

  if (hasError) {
    return (
      <div
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: safeWidth,
          height: safeHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bgColor,
          color: "#fff",
          fontSize: "14px",
        }}
      >
        Video playback error. Please try a different video format.
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0, left: 0,
        width: safeWidth,
        height: safeHeight,
      }}
    >
      <RemotionPlayer
        key={playerKey}
        ref={playerRef}
        component={Composition}
        durationInFrames={safeDurationInFrames}
        compositionWidth={safeWidth}
        compositionHeight={safeHeight}
        className="bg-transparent"
        style={{ width: safeWidth, height: safeHeight }}
        fps={safeFps}
        overflowVisible
      />
    </div>
  );
};

export default Player;