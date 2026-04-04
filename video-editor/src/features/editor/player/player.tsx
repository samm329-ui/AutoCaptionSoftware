import { useEffect, useRef } from "react";
import Composition from "./composition";
import { Player as RemotionPlayer, PlayerRef } from "@remotion/player";
import useStore from "../store/use-store";

const Player = () => {
  const playerRef = useRef<PlayerRef>(null);
  const { setPlayerRef, duration, fps, size, background } = useStore();

  useEffect(() => {
    setPlayerRef(playerRef as React.RefObject<PlayerRef>);
  }, []);

  const safeDuration = duration || 1000;
  const safeFps = fps || 30;
  const safeSize = size || { width: 1080, height: 1920 };
  const safeDurationInFrames = Math.max(1, Math.round((safeDuration / 1000) * safeFps));

  return (
    <RemotionPlayer
      ref={playerRef}
      component={Composition}
      durationInFrames={safeDurationInFrames}
      compositionWidth={safeSize.width}
      compositionHeight={safeSize.height}
      className={`h-full w-full bg-[${background.value}]`}
      fps={safeFps}
      overflowVisible
    />
  );
};
export default Player;
