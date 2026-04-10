import { useEffect, useCallback, useRef } from "react";
import useStore from "../store/use-store";
import { engineStore } from "../engine/engine-core";

export const useStateManagerEvents = (stateManager: any) => {
  const { setState } = useStore();
  const isSubscribedRef = useRef(false);

  const handleTrackItemUpdate = useCallback(() => {
    const currentState = engineStore.getState();
    setState({
      duration: currentState.sequences[currentState.rootSequenceId]?.duration ?? 1000,
      trackItemsMap: {} as any
    });
  }, [setState]);

  const handleAddRemoveItems = useCallback(() => {
    const currentState = engineStore.getState();
    setState({
      trackItemsMap: {} as any,
      trackItemIds: [] as any,
      tracks: [] as any
    });
  }, [setState]);

  const handleUpdateItemDetails = useCallback(() => {
    const currentState = engineStore.getState();
    setState({
      trackItemsMap: {} as any
    });
  }, [setState]);

  useEffect(() => {
    if (isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    let resizeSub: (() => void) | undefined;
    let scaleSub: (() => void) | undefined;
    let tracksSub: (() => void) | undefined;
    let durationSub: (() => void) | undefined;
    let updateTrackItemSub: (() => void) | undefined;
    let addRemoveSub: (() => void) | undefined;
    let updateItemDetailsSub: (() => void) | undefined;

    if (stateManager && stateManager.subscribeToState) {
      // Use our adapter's subscribeToState method
      tracksSub = stateManager.subscribeToState((newState: any) => {
        setState(newState);
      });
    }

    // Also subscribe to engine store for additional sync
    const engineSub = engineStore.subscribe((state) => {
      // Sync relevant engine state to Zustand for legacy components
      setState({
        duration: state.sequences[state.rootSequenceId]?.duration ?? 1000,
        fps: state.sequences[state.rootSequenceId]?.fps ?? 30,
      });
    });

    return () => {
      isSubscribedRef.current = false;
      if (tracksSub) tracksSub();
      if (resizeSub) resizeSub();
      if (scaleSub) scaleSub();
      if (durationSub) durationSub();
      if (updateTrackItemSub) updateTrackItemSub();
      if (addRemoveSub) addRemoveSub();
      if (updateItemDetailsSub) updateItemDetailsSub();
      engineSub();
    };
  }, [stateManager, setState, handleTrackItemUpdate, handleAddRemoveItems, handleUpdateItemDetails]);
};
