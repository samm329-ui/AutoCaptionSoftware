import { useEffect, useRef } from "react";
import { filter, subject } from "@designcombo/events";
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
} from "@designcombo/state";
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

  const subscription = subject
    .pipe(filter(({ key }) => SYNC_KEYS.includes(key as any)))
    .subscribe((event) => {
      patchEditorState(event.key, event.value?.payload);
    });

  return () => {
    subscription.unsubscribe();
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
