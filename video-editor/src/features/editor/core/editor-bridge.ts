import { dispatch } from "@designcombo/events";
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
import type { ITrackItem } from "@designcombo/types";
import useStore from "../store/use-store";

type UnknownRecord = Record<string, any>;

const MUTATION_TYPES = new Set<string>([
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
]);

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function clone<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function getItemId(item: unknown): string | null {
  if (!isRecord(item)) return null;
  return typeof item.id === "string" && item.id.length > 0 ? item.id : null;
}

function mergeTrackItem(existing: ITrackItem | undefined, patch: UnknownRecord): ITrackItem {
  if (!existing) return patch as ITrackItem;

  return {
    ...(existing as UnknownRecord),
    ...patch,
    details: {
      ...(isRecord((existing as UnknownRecord).details) ? (existing as UnknownRecord).details : {}),
      ...(isRecord(patch.details) ? patch.details : {}),
    },
    display: {
      ...(isRecord((existing as UnknownRecord).display) ? (existing as UnknownRecord).display : {}),
      ...(isRecord(patch.display) ? patch.display : {}),
    },
    trim: {
      ...(isRecord((existing as UnknownRecord).trim) ? (existing as UnknownRecord).trim : {}),
      ...(isRecord(patch.trim) ? patch.trim : {}),
    },
  } as ITrackItem;
}

function mergeTrackItemsMap(
  currentMap: Record<string, ITrackItem>,
  patch: UnknownRecord,
): Record<string, ITrackItem> {
  const next: Record<string, ITrackItem> = { ...currentMap };

  for (const [key, value] of Object.entries(patch)) {
    if (key === "trackItemsMap" && isRecord(value)) {
      for (const [id, innerPatch] of Object.entries(value)) {
        if (isRecord(innerPatch)) {
          next[id] = mergeTrackItem(currentMap[id], innerPatch);
        }
      }
      continue;
    }

    if (isRecord(value)) {
      next[key] = mergeTrackItem(currentMap[key], value);
    }
  }

  return next;
}

function extractTrackItemPatch(payload: unknown): UnknownRecord {
  if (!isRecord(payload)) return {};

  if (isRecord(payload.trackItemsMap)) {
    return payload.trackItemsMap;
  }

  if (typeof payload.id === "string") {
    const { id, ...rest } = payload;
    return { [id]: rest };
  }

  return payload;
}

function patchStoreState(type: string, payload: unknown) {
  const store = useStore.getState();

  if (!MUTATION_TYPES.has(type)) return;

  const currentState = store;
  const currentTrackItemsMap = currentState.trackItemsMap ?? {};
  const currentTrackItemIds = currentState.trackItemIds ?? [];
  const currentActiveIds = currentState.activeIds ?? [];
  const currentTracks = currentState.tracks ?? [];
  const currentTransitionsMap = currentState.transitionsMap ?? {};
  const currentTransitionIds = currentState.transitionIds ?? [];

  if (type === LAYER_SELECTION) {
    const activeIds = isRecord(payload) && Array.isArray(payload.activeIds)
      ? payload.activeIds.filter((id): id is string => typeof id === "string")
      : [];

    void store.setState({ activeIds });
    return;
  }

  if (type === HISTORY_UNDO || type === HISTORY_REDO) {
    return;
  }

  if (type === DESIGN_LOAD) {
    const nextState = isRecord(payload) ? payload : {};
    void store.setState({
      ...nextState,
      trackItemsMap: isRecord(nextState.trackItemsMap) ? nextState.trackItemsMap : currentTrackItemsMap,
      trackItemIds: Array.isArray(nextState.trackItemIds) ? nextState.trackItemIds : currentTrackItemIds,
      activeIds: Array.isArray(nextState.activeIds) ? nextState.activeIds : currentActiveIds,
      tracks: Array.isArray(nextState.tracks) ? nextState.tracks : currentTracks,
      transitionsMap: isRecord(nextState.transitionsMap) ? nextState.transitionsMap : currentTransitionsMap,
      transitionIds: Array.isArray(nextState.transitionIds) ? nextState.transitionIds : currentTransitionIds,
    });
    return;
  }

  if (type === DESIGN_RESIZE) {
    const nextSize = isRecord(payload) && isRecord(payload.size) ? payload.size : null;
    if (!nextSize) return;
    void store.setState({ size: { ...store.size, ...nextSize } });
    return;
  }

  if (type === LAYER_DELETE) {
    const ids = new Set<string>();
    if (typeof payload === "string") ids.add(payload);
    if (isRecord(payload)) {
      if (typeof payload.id === "string") ids.add(payload.id);
      if (Array.isArray(payload.ids)) {
        for (const id of payload.ids) if (typeof id === "string") ids.add(id);
      }
    }

    if (ids.size === 0) return;

    const nextTrackItemsMap = { ...currentTrackItemsMap };
    for (const id of ids) delete nextTrackItemsMap[id];

    void store.setState({
      trackItemsMap: nextTrackItemsMap,
      trackItemIds: currentTrackItemIds.filter((id) => !ids.has(id)),
      activeIds: currentActiveIds.filter((id) => !ids.has(id)),
    });
    return;
  }

  if (type === LAYER_CLONE || type === ADD_VIDEO || type === ADD_AUDIO || type === ADD_IMAGE || type === ADD_TEXT || type === ADD_CAPTIONS || type === ADD_TRANSITION || type === ADD_ITEMS) {
    const items = asArray(payload);
    const nextTrackItemsMap = { ...currentTrackItemsMap };
    const nextTrackItemIds = new Set(currentTrackItemIds);

    for (const item of items) {
      if (item == null) continue;
      if (Array.isArray(item)) {
        for (const inner of item) {
          const id = getItemId(inner);
          if (!id || !isRecord(inner)) continue;
          nextTrackItemsMap[id] = mergeTrackItem(nextTrackItemsMap[id], inner);
          nextTrackItemIds.add(id);
        }
        continue;
      }

      if (!isRecord(item)) continue;

      if (type === ADD_ITEMS && Array.isArray(item.items)) {
        for (const inner of item.items) {
          const id = getItemId(inner);
          if (!id || !isRecord(inner)) continue;
          nextTrackItemsMap[id] = mergeTrackItem(nextTrackItemsMap[id], inner);
          nextTrackItemIds.add(id);
        }
        continue;
      }

      const id = getItemId(item);
      if (!id) continue;
      nextTrackItemsMap[id] = mergeTrackItem(nextTrackItemsMap[id], item);
      nextTrackItemIds.add(id);
    }

    void store.setState({
      trackItemsMap: nextTrackItemsMap,
      trackItemIds: Array.from(nextTrackItemIds),
    });
    return;
  }

  if (type === EDIT_OBJECT || type === EDIT_TRACK) {
    const patch = extractTrackItemPatch(payload);
    if (Object.keys(patch).length === 0) return;

    void store.setState({
      trackItemsMap: mergeTrackItemsMap(currentTrackItemsMap, patch),
    });
    return;
  }

  if (isRecord(payload)) {
    const updates: UnknownRecord = {};

    if (isRecord(payload.trackItemsMap)) {
      updates.trackItemsMap = mergeTrackItemsMap(currentTrackItemsMap, payload.trackItemsMap);
    }

    if (Array.isArray(payload.trackItemIds)) {
      updates.trackItemIds = payload.trackItemIds;
    }

    if (Array.isArray(payload.activeIds)) {
      updates.activeIds = payload.activeIds;
    }

    if (isRecord(payload.transitionsMap)) {
      updates.transitionsMap = { ...currentTransitionsMap, ...payload.transitionsMap };
    }

    if (Array.isArray(payload.transitionIds)) {
      updates.transitionIds = payload.transitionIds;
    }

    if (Array.isArray(payload.tracks)) {
      updates.tracks = payload.tracks;
    }

    if (Object.keys(updates).length > 0) {
      void store.setState(updates);
    }
  }
}

export function applyEditorUpdate(type: string, payload: unknown, options?: { optimistic?: boolean }) {
  dispatch(type, { payload });

  if (options?.optimistic ?? true) {
    patchStoreState(type, payload);
  }
}

export function patchEditorState(type: string, payload: unknown) {
  patchStoreState(type, payload);
}

export function normalizeTrackItemPayload(payload: unknown): UnknownRecord {
  if (!isRecord(payload)) return {};

  if (typeof payload.id === "string") {
    return { [payload.id]: clone(payload) };
  }

  if (isRecord(payload.trackItemsMap)) {
    return clone(payload.trackItemsMap);
  }

  return clone(payload);
}
