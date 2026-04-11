import { useEffect, useRef } from "react";
import { dispatch, subscribe } from "../utils/events";
import {
  ADD_AUDIO,
  ADD_CAPTIONS,
  ADD_IMAGE,
  ADD_ITEMS,
  ADD_TEXT,
  ADD_TRANSITION,
  ADD_VIDEO,
  DESIGN_LOAD,
  DESIGN_RESIZE,
  EDIT_OBJECT,
  EDIT_TRACK,
  HISTORY_REDO,
  HISTORY_UNDO,
  LAYER_CLONE,
  LAYER_DELETE,
  LAYER_SELECTION,
} from "../constants/events";
import { patchEditorState } from "./editor-bridge";

const SYNC_KEYS = [
  ADD_VIDEO,
  ADD_AUDIO,
  ADD_IMAGE,
  ADD_TEXT,
  ADD_CAPTIONS,
  ADD_ITEMS,
  ADD_TRANSITION,
  EDIT_OBJECT,
  EDIT_TRACK,
  LAYER_DELETE,
  LAYER_CLONE,
  LAYER_SELECTION,
  DESIGN_LOAD,
  DESIGN_RESIZE,
  HISTORY_UNDO,
  HISTORY_REDO,
] as const;

let hasMounted = false;

export function initEditorSync() {
  if (hasMounted) {
    return () => undefined;
  }

  hasMounted = true;

  const cleanup = subscribe((eventKey: string, data?: { payload?: unknown }) => {
    if (SYNC_KEYS.includes(eventKey as any)) {
      patchEditorState(eventKey, data?.payload);
    }
  });

  return () => {
    cleanup();
    hasMounted = false;
  };
}

export function useEditorSync() {
  const cleanupRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    cleanupRef.current = initEditorSync();
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);
}