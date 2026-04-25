import { CallbackListener, PlayerRef } from "@remotion/player";
import { useCallback, useSyncExternalStore, useMemo, useRef, useEffect } from "react";
import { getSafeCurrentFrame } from "../utils/time";

// Normalize input: accepts direct PlayerRef or React.RefObject<PlayerRef>
export const useCurrentPlayerFrame = (
  input: PlayerRef | React.RefObject<PlayerRef> | null
) => {
  // Track the actual PlayerRef
  const playerRef = useRef<PlayerRef | null>(null);
  
  useEffect(() => {
    if (!input) {
      playerRef.current = null;
      return;
    }
    
    // If input is direct PlayerRef
    if ('addEventListener' in input) {
      playerRef.current = input;
    } 
    // If input is React.RefObject with current
    else if (input.current) {
      playerRef.current = input.current;
    }
  }, [input]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const player = playerRef.current;
      if (!player) {
        return () => undefined;
      }
      const updater: CallbackListener<"frameupdate"> = () => {
        onStoreChange();
      };
      player.addEventListener("frameupdate", updater);
      return () => {
        player.removeEventListener("frameupdate", updater);
      };
    },
    []
  );
  
  const data = useSyncExternalStore<number>(
    subscribe,
    () => getSafeCurrentFrame(playerRef.current),
    () => 0
  );
  
  return data;
};
