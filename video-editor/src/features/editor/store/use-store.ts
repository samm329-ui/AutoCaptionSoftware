/**
 * useStore - Pure React implementation
 * No Zustand - uses useState only
 */

import { useState, useCallback } from "react";
import type { PlayerRef } from "@remotion/player";
import type { Moveable } from "@interactify/toolkit";
import { useBackground, useViewTimeline, engineStore } from "../engine";
import { setBackground as setBackgroundCmd, setViewTimeline as setViewTimelineCmd } from "../engine/commands";

export const EDIT_OBJECT   = "EDIT_OBJECT";
export const ADD_ANIMATION = "ADD_ANIMATION";
export const ADD_ITEMS     = "ADD_ITEMS";
export const LAYER_DELETE  = "LAYER_DELETE";
export const ADD_TRACK     = "ADD_TRACK";

let idCounter = 0;
export const generateId = () => `id-${Date.now()}-${++idCounter}`;

export interface ITrackItem {
  id: string;
  type: string;
  name?: string;
  display: { from: number; to: number };
  trim: { from: number; to: number };
  details: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface IScrollState {
  left?: number;
  top?: number;
}

interface ScaleState {
  index: number;
  unit: number;
  zoom: number;
  segments: number;
}

const defaultScale: ScaleState = { index: 7, unit: 300, zoom: 1 / 300, segments: 5 };
const defaultScroll: IScrollState = { left: 0, top: 0 };

export function useStore() {
  const [playerRef, setPlayerRef] = useState<React.RefObject<PlayerRef> | null>(null);
  const [sceneMoveableRef, setSceneMoveableRef] = useState<React.RefObject<Moveable> | null>(null);
  const [scroll, setScroll] = useState<IScrollState>(defaultScroll);
  
  const background = useBackground();
  const viewTimeline = useViewTimeline();
  
  const setPlayerRefWrapper = useCallback((ref: React.RefObject<PlayerRef> | null) => {
    setPlayerRef(ref);
  }, []);
  
  const setSceneMoveableRefWrapper = useCallback((ref: React.RefObject<Moveable>) => {
    setSceneMoveableRef(ref);
  }, []);
  
  const setScrollWrapper = useCallback((newScroll: IScrollState) => {
    setScroll(newScroll);
  }, []);
  
  const setBackgroundWrapper = useCallback((bg: { type: "color" | "image"; value: string }) => {
    engineStore.dispatch(setBackgroundCmd(bg));
  }, []);
  
  const setViewTimelineWrapper = useCallback((visible: boolean) => {
    engineStore.dispatch(setViewTimelineCmd(visible));
  }, []);

  return {
    playerRef,
    sceneMoveableRef,
    scroll,
    scale: defaultScale,
    setPlayerRef: setPlayerRefWrapper,
    setSceneMoveableRef: setSceneMoveableRefWrapper,
    setScroll: setScrollWrapper,
    background,
    viewTimeline,
    setBackground: setBackgroundWrapper,
    setViewTimeline: setViewTimelineWrapper,
  };
}

export default useStore;