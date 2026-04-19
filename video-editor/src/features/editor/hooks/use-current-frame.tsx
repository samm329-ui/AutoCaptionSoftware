import { CallbackListener, PlayerRef } from "@remotion/player";
import { useCallback, useSyncExternalStore } from "react";
import { getSafeCurrentFrame } from "../utils/time";

export const useCurrentPlayerFrame = (
  ref: React.RefObject<PlayerRef> | null
) => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!ref || !ref.current) {
        return () => undefined;
      }
      const current = ref.current;
      const updater: CallbackListener<"frameupdate"> = () => {
        onStoreChange();
      };
      current.addEventListener("frameupdate", updater);
      return () => {
        if (current) {
          current.removeEventListener("frameupdate", updater);
        }
      };
    },
    [ref]
  );
  const data = useSyncExternalStore<number>(
    subscribe,
    () => getSafeCurrentFrame(ref),
    () => 0
  );
  return data;
};
