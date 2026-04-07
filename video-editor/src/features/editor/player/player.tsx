import { useEffect, useRef, useState, useCallback } from "react";
import Composition from "./composition";
import { Player as RemotionPlayer, PlayerRef } from "@remotion/player";
import useStore from "../store/use-store";

const Player = () => {
  const playerRef = useRef<PlayerRef>(null);
  const { setPlayerRef, duration, fps, size, background } = useStore();
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback((error: Error) => {
    console.error("Video playback error:", error);
    setHasError(true);
  }, []);

  useEffect(() => {
    setPlayerRef(playerRef as React.RefObject<PlayerRef>);
  }, []);

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

  const safeDuration = duration || 1000;
  const safeFps = fps || 30;
  const safeSize = size || { width: 1080, height: 1920 };
  const safeDurationInFrames = Math.max(1, Math.round((safeDuration / 1000) * safeFps));

  if (hasError) {
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: safeSize.width,
          height: safeSize.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: (background as any)?.value || background || "#000",
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
        top: 0,
        left: 0,
        width: safeSize.width,
        height: safeSize.height,
      }}
    >
      <RemotionPlayer
        key={`${safeSize.width}x${safeSize.height}@${safeFps}`}
        ref={playerRef}
        component={Composition}
        durationInFrames={safeDurationInFrames}
        compositionWidth={safeSize.width}
        compositionHeight={safeSize.height}
        className="bg-transparent"
        style={{
          width: safeSize.width,
          height: safeSize.height,
        }}
        fps={safeFps}
        overflowVisible
      />
    </div>
  );
};
export default Player;
