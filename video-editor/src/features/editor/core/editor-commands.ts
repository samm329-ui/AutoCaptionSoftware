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
import { applyEditorUpdate } from "./editor-bridge";

export type EditorSelectionPayload = {
  activeIds: string[];
};

export type EditorResizePayload = {
  size: {
    width: number;
    height: number;
  };
};

export function setSelection(activeIds: string[]) {
  applyEditorUpdate(LAYER_SELECTION, { activeIds });
}

export function addVideo(payload: unknown) {
  applyEditorUpdate(ADD_VIDEO, payload);
}

export function addAudio(payload: unknown) {
  applyEditorUpdate(ADD_AUDIO, payload);
}

export function addImage(payload: unknown) {
  applyEditorUpdate(ADD_IMAGE, payload);
}

export function addText(payload: unknown) {
  applyEditorUpdate(ADD_TEXT, payload);
}

export function addCaptions(payload: unknown) {
  applyEditorUpdate(ADD_CAPTIONS, payload);
}

export function addTransition(payload: unknown) {
  applyEditorUpdate(ADD_TRANSITION, payload);
}

export function addItems(payload: unknown) {
  applyEditorUpdate(ADD_ITEMS, payload);
}

export function updateItem(id: string, changes: Record<string, unknown>) {
  applyEditorUpdate(EDIT_OBJECT, { [id]: changes });
}

export function updateItems(patches: Record<string, unknown>) {
  applyEditorUpdate(EDIT_OBJECT, patches);
}

export function updateTrack(payload: unknown) {
  applyEditorUpdate(EDIT_TRACK, payload);
}

export function deleteItem(id: string) {
  applyEditorUpdate(LAYER_DELETE, { id });
}

export function cloneItem(id: string) {
  applyEditorUpdate(LAYER_CLONE, { id });
}

export function loadDesign(payload: unknown) {
  applyEditorUpdate(DESIGN_LOAD, payload, { optimistic: false });
}

export function resizeDesign(size: EditorResizePayload["size"]) {
  applyEditorUpdate(DESIGN_RESIZE, { size }, { optimistic: true });
}

export function undo() {
  applyEditorUpdate(HISTORY_UNDO, {}, { optimistic: false });
}

export function redo() {
  applyEditorUpdate(HISTORY_REDO, {}, { optimistic: false });
}
