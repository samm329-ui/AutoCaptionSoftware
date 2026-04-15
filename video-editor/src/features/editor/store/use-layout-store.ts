/**
 * useLayoutStore - Compatibility wrapper
 * Now uses engine store instead of Zustand
 */

import { useMemo, useCallback } from "react";
import { useLayoutState, engineStore } from "../engine";
import { setLayout as setLayoutCmd, setCropTarget as setCropTargetCmd } from "../engine/commands";

export function useLayoutStore() {
  const state = useLayoutState();
  
  const setCropTarget = useCallback((target: string | null) => {
    engineStore.dispatch(setCropTargetCmd(target));
  }, []);
  
  const setActiveMenuItem = useCallback((activeMenuItem: string | null) => {
    engineStore.dispatch(setLayoutCmd({ activeMenuItem }));
  }, []);
  
  const setShowMenuItem = useCallback((showMenuItem: boolean) => {
    engineStore.dispatch(setLayoutCmd({ showMenuItem }));
  }, []);
  
  const setShowControlItem = useCallback((showControlItem: boolean) => {
    engineStore.dispatch(setLayoutCmd({ showControlItem }));
  }, []);
  
  const setShowToolboxItem = useCallback((showToolboxItem: boolean) => {
    engineStore.dispatch(setLayoutCmd({ showToolboxItem }));
  }, []);
  
  const setActiveToolboxItem = useCallback((activeToolboxItem: string | null) => {
    engineStore.dispatch(setLayoutCmd({ activeToolboxItem }));
  }, []);
  
  const setFloatingControl = useCallback((floatingControl: string | null) => {
    engineStore.dispatch(setLayoutCmd({ floatingControl }));
  }, []);
  
  const setDrawerOpen = useCallback((drawerOpen: boolean) => {
    engineStore.dispatch(setLayoutCmd({ drawerOpen }));
  }, []);
  
  const setControItemDrawerOpen = useCallback((controItemDrawerOpen: boolean) => {
    engineStore.dispatch(setLayoutCmd({ controItemDrawerOpen }));
  }, []);
  
  const setTypeControlItem = useCallback((typeControlItem: string) => {
    engineStore.dispatch(setLayoutCmd({ typeControlItem }));
  }, []);
  
  const setLabelControlItem = useCallback((labelControlItem: string) => {
    engineStore.dispatch(setLayoutCmd({ labelControlItem }));
  }, []);
  
  const setTrackItem = useCallback(() => {}, []);
  
  return useMemo(() => ({
    ...state,
    trackItem: null,
    setCropTarget,
    setActiveMenuItem,
    setShowMenuItem,
    setShowControlItem,
    setShowToolboxItem,
    setActiveToolboxItem,
    setFloatingControl,
    setDrawerOpen,
    setTrackItem,
    setControItemDrawerOpen,
    setTypeControlItem,
    setLabelControlItem,
  }), [
    state,
    setCropTarget,
    setActiveMenuItem,
    setShowMenuItem,
    setShowControlItem,
    setShowToolboxItem,
    setActiveToolboxItem,
    setFloatingControl,
    setDrawerOpen,
    setTrackItem,
    setControItemDrawerOpen,
    setTypeControlItem,
    setLabelControlItem,
  ]);
}

export default useLayoutStore;