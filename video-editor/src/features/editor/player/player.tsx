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
  selectNaturalEndMs,
} from "../engine/selectors";
import { registerPlayerSeek, setPlayerRef, setPlayhead, seekPlayer } from "../engine/commands";
import { useEngineDispatch } from "../engine/engine-provider";

// Fallback constants
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1920;
const DEFAULT_FPS = 30;
const DEFAULT_DURATION = 10000;

const Player = () => {
  const playerRef = useRef<PlayerRef>(null);
  const engineDispatch = useEngineDispatch();
  const [hasError, setHasError] = useState(false);

  // All project data from engine
  const duration   = useEngineSelector(selectDuration);
  const naturalEndMs = useEngineSelector(selectNaturalEndMs);
  const fps        = useEngineSelector(selectFps);
  const canvasSize = useEngineSelector(selectCanvasSize);
  const sequence   = useEngineSelector(selectRootSequence);

  // Use calculated duration from clips if available, otherwise use sequence duration
  const computedDuration = naturalEndMs > 0 ? naturalEndMs : (duration > 0 ? duration : DEFAULT_DURATION);

  // Stable values with fallbacks
  const safeDuration = useMemo(() => computedDuration, [computedDuration]);
  const safeFps = useMemo(() => fps > 0 ? fps : DEFAULT_FPS, [fps]);
  const safeWidth = useMemo(() => canvasSize?.width > 0 ? canvasSize.width : DEFAULT_WIDTH, [canvasSize?.width]);
  const safeHeight = useMemo(() => canvasSize?.height > 0 ? canvasSize.height : DEFAULT_HEIGHT, [canvasSize?.height]);
  const safeDurationInFrames = useMemo(() => Math.max(1, Math.round((safeDuration / 1000) * safeFps)), [safeDuration, safeFps]);
  const bgColor = useMemo(() => sequence?.background?.value || "#000000", [sequence?.background?.value]);
  
  // Key doesn't change on playhead - composition handles frame internally
  const playerKey = useMemo(() => `${safeWidth}x${safeHeight}@${safeFps}`, [safeWidth, safeHeight, safeFps]);

  const handleError = useCallback((error: Error) => {
    console.error("Video playback error:", error);
    setHasError(true);
  }, []);

  // Register runtime ref in engine store
  console.log("Player component mounting, registering playerRef, current:", playerRef.current);
  useEffect(() => {
    if (playerRef.current) {
      console.log("Registering playerRef to engine:", playerRef.current);
      engineDispatch(setPlayerRef(playerRef.current));
    }
    
    // Register seek function for engine playhead sync
    registerPlayerSeek((frame: number) => {
      try {
        console.log("seekPlayer called with frame:", frame);
        playerRef.current?.seekTo(frame);
      } catch (e) {
        console.warn('Player seek error:', e);
      }
    });
  }, [engineDispatch]);
  
  // Sync player frame with engine playhead
  const handlePlayerFrameChange = useCallback((newFrame: number) => {
    const newMs = (newFrame / fps) * 1000;
    // Note: This would cause infinite loop if we used it, so we don't dispatch back to engine
  }, [fps]);

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

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Player clicked", e.clientX, e.clientY);
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / safeWidth;
    const clickMs = ratio * safeDuration;
    const clickFrame = Math.floor(clickMs / 1000 * safeFps);
    console.log("Seeking to frame:", clickFrame, "ms:", clickMs);
    
    playerRef.current?.seekTo(clickFrame);
    engineDispatch(setPlayhead(clickMs));
    console.log("Playhead set to:", clickMs);
  }, [safeWidth, safeDuration, safeFps, engineDispatch]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0, left: 0,
        width: safeWidth,
        height: safeHeight,
        cursor: "pointer",
      }}
      onClick={handleClick}
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
        showPlaybackControls={false}
        autoPlay={false}
        idlePaused={true}
        loop={false}
        acknowledgeRemotionLicense
      />
    </div>
  );
};

export default Player;