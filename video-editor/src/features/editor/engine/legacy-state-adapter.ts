/**
 * engine/legacy-state-adapter.ts
 *
 * Engine-backed compatibility adapter for the legacy DesignCombo timeline
 * runtime. It exposes a tolerant `state` proxy so CanvasTimeline can call
 * subscribe/get methods during initialization without crashing.
 *
 * This is a bridge only. The actual source of truth remains engineStore.
 */

import type { Project, Clip, Track } from "./engine-core";
import { createEmptyProject, engineStore } from "./engine-core";
import {
  fromTrack,
  fromTrackItem,
} from "./mappers";
import {
  selectLegacyTrackItemIds,
  selectLegacyTrackItemsMap,
} from "./migration-adapter";

export type LegacySnapshot = {
  trackItemsMap: Record<string, unknown>;
  tracks: Record<string, unknown>[];
  trackItemIds: string[];
  activeIds: string[];
  duration: number;
  fps: number;
  size: { width: number; height: number };
  background: { type: "color" | "image"; value: string };
  scroll: { left: number; top: number };
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  compositions: unknown[];
};

export type LegacyStateListener = (state: LegacySnapshot) => void;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function cloneClip(clip: Clip): Clip {
  return {
    ...clip,
    display: { ...clip.display },
    trim: { ...clip.trim },
    transform: { ...clip.transform },
    details: { ...clip.details },
    appliedEffects: [...clip.appliedEffects],
    effectIds: [...clip.effectIds],
    keyframeIds: [...clip.keyframeIds],
    metadata: clip.metadata ? { ...clip.metadata } : undefined,
  };
}

function buildProjectFromLegacyPayload(payload: Record<string, unknown>): Project {
  const current = engineStore.getState();
  const emptyProject = createEmptyProject();
  const rootSequence = current.sequences[current.rootSequenceId] ?? emptyProject.sequences[emptyProject.rootSequenceId];

  const rawTracks = Array.isArray(payload.tracks) ? payload.tracks : [];
  const rawItemsMap = isRecord(payload.trackItemsMap) ? payload.trackItemsMap : {};
  const rawTrackItemIds = Array.isArray(payload.trackItemIds) ? payload.trackItemIds : [];

  const tracks: Record<string, Track> = {};
  const clips: Record<string, Clip> = {};

  for (const raw of rawTracks) {
    const track = fromTrack(raw);
    if (!track) continue;
    tracks[track.id] = { ...track, clipIds: [...track.clipIds] };
  }

  const ids = rawTrackItemIds.length > 0
    ? rawTrackItemIds
    : Object.keys(rawItemsMap);

  for (const id of ids) {
    const raw = (isRecord(rawItemsMap) && id in rawItemsMap) ? rawItemsMap[id] : undefined;
    if (!raw) continue;
    const clip = fromTrackItem({ ...(raw as object), id }, current.clips[id]);
    if (!clip) continue;
    clips[clip.id] = cloneClip(clip);
  }

  for (const clip of Object.values(clips)) {
    if (!tracks[clip.trackId]) {
      tracks[clip.trackId] = {
        id: clip.trackId,
        type:
          clip.type === "audio"
            ? "audio"
            : clip.type === "caption"
              ? "caption"
              : clip.type === "text"
                ? "text"
                : "video",
        name: clip.trackId,
        order: Object.keys(tracks).length,
        locked: false,
        muted: false,
        hidden: false,
        clipIds: [],
      };
    }
    tracks[clip.trackId].clipIds.push(clip.id);
  }

  for (const track of Object.values(tracks)) {
    track.clipIds.sort((a, b) => {
      const ca = clips[a];
      const cb = clips[b];
      return (ca?.display.from ?? 0) - (cb?.display.from ?? 0);
    });
  }

  const orderedTrackIds = Object.values(tracks)
    .sort((a, b) => a.order - b.order)
    .map((t) => t.id);

  return {
    ...current,
    tracks,
    clips,
    sequences: {
      ...current.sequences,
      [current.rootSequenceId]: {
        ...rootSequence,
        trackIds: orderedTrackIds.length > 0 ? orderedTrackIds : rootSequence.trackIds,
        canvas: (payload.size as any) ?? rootSequence.canvas,
        duration: typeof payload.duration === "number" ? payload.duration : rootSequence.duration,
        fps: typeof payload.fps === "number" ? payload.fps : rootSequence.fps,
        background: (payload.background as any) ?? rootSequence.background,
      },
    },
    ui: {
      ...current.ui,
      playheadTime: typeof payload.playheadTime === "number" ? payload.playheadTime : current.ui.playheadTime,
      zoom: typeof payload.zoom === "number" ? payload.zoom : current.ui.zoom,
      scrollX: typeof payload.scrollX === "number" ? payload.scrollX : current.ui.scrollX,
      scrollY: typeof payload.scrollY === "number" ? payload.scrollY : current.ui.scrollY,
      selection: Array.isArray(payload.activeIds)
        ? (payload.activeIds as string[]).filter((id) => typeof id === "string")
        : current.ui.selection,
    },
  };
}

function snapshotLegacyState(project: Project): LegacySnapshot {
  const seq = project.sequences[project.rootSequenceId];

  return {
    trackItemsMap: selectLegacyTrackItemsMap(project),
    tracks: Object.values(project.tracks).map((t) => ({ ...t, clipIds: [...t.clipIds] })),
    trackItemIds: selectLegacyTrackItemIds(project),
    activeIds: [...project.ui.selection],
    duration: seq?.duration ?? 0,
    fps: seq?.fps ?? 30,
    size: seq?.canvas ?? { width: 1080, height: 1920 },
    background: seq?.background ?? { type: "color", value: "#000000" },
    scroll: { left: project.ui.scrollX, top: project.ui.scrollY },
    zoom: project.ui.zoom,
    canUndo: engineStore.canUndo,
    canRedo: engineStore.canRedo,
    compositions: [],
  };
}

type CallbackSubscription = { unsubscribe: () => void };

function makeSubscription(fn: () => void): CallbackSubscription {
  return { unsubscribe: fn };
}

function snapshotForSubscribe(name: string, snapshot: LegacySnapshot): unknown {
  switch (name) {
    case "subscribeToActiveIds":
      return snapshot.activeIds;
    case "subscribeToTracks":
    case "subscribeToUpdateTracks":
      return snapshot.tracks;
    case "subscribeToTrackItems":
      return snapshot.trackItemsMap;
    case "subscribeToItems":
      return snapshot.trackItemIds;
    case "subscribeToDuration":
      return snapshot.duration;
    case "subscribeToScale":
      return { zoom: snapshot.zoom };
    case "subscribeToSize":
      return snapshot.size;
    case "subscribeToBackground":
      return snapshot.background;
    case "subscribeToPlayhead":
      return snapshot;
    case "subscribeToProject":
      return snapshot;
    case "subscribeToCanvas":
      return snapshot.size;
    case "subscribeToClip":
      return snapshot.trackItemsMap;
    case "subscribeToUpdateClip":
    case "subscribeToUpdateTrackItem":
    case "subscribeToUpdateItemDetails":
    case "subscribeToUpdateStateDetails":
    case "subscribeToAddOrRemoveItems":
    case "subscribeToRender":
    case "subscribeToRuler":
    case "subscribeToPreview":
    case "subscribeToUpdateAnimations":
    case "subscribeToAnimations":
    case "subscribeToTransitions":
    case "subscribeToUpdateTransitions":
    case "subscribeToComposition":
    case "subscribeToUpdateComposition":
    case "subscribeToTrackItemTiming":
    case "subscribeToTrackItemCache":
      return undefined;
    default:
      return snapshot;
  }
}

export class LegacyStateAdapter {
  private listeners = new Set<LegacyStateListener>();
  private engineUnsub: (() => void) | null = null;
  public state: any;

  constructor() {
    this.state = this.createStateObject();

    this.engineUnsub = engineStore.subscribe(() => {
      const snapshot = this.getState();
      for (const listener of this.listeners) {
        try {
          listener(snapshot);
        } catch {
          // ignore subscriber failures
        }
      }
    });
  }

  dispose(): void {
    this.engineUnsub?.();
    this.engineUnsub = null;
    this.listeners.clear();
  }

  getState(): LegacySnapshot {
    return snapshotLegacyState(engineStore.getState());
  }

  subscribeToState(listener: LegacyStateListener): () => void {
    this.listeners.add(listener);
    try {
      listener(this.getState());
    } catch {
      // ignore initial emit failures
    }
    return () => this.listeners.delete(listener);
  }

  toJSON(): Record<string, unknown> {
    const project = engineStore.getState();
    return {
      ...project,
      ...snapshotLegacyState(project),
    };
  }

  private createStateObject() {
    const self = this;

    const subscribeFactory = (methodName: string) => {
      return (callback?: (...args: any[]) => void): CallbackSubscription => {
        if (typeof callback !== "function") {
          return makeSubscription(() => {});
        }

        const listener = () => {
          const snapshot = self.getState();
          const value = snapshotForSubscribe(methodName, snapshot);
          try {
            if (value === undefined && methodName.startsWith("subscribeToUpdate")) {
              callback();
            } else if (value === undefined && methodName.startsWith("subscribeToAddOrRemove")) {
              callback();
            } else if (value === undefined) {
              callback(snapshot);
            } else {
              callback(value);
            }
          } catch {
            // ignore per-listener callback failures
          }
        };

        self.listeners.add(listener);
        try {
          listener();
        } catch {
          // ignore initial emit failures
        }

        return makeSubscription(() => self.listeners.delete(listener));
      };
    };

    const values = {
      get activeIds() { return self.getState().activeIds; },
      get tracks() { return self.getState().tracks; },
      get trackItemsMap() { return self.getState().trackItemsMap; },
      get trackItemIds() { return self.getState().trackItemIds; },
      get duration() { return self.getState().duration; },
      get fps() { return self.getState().fps; },
      get size() { return self.getState().size; },
      get background() { return self.getState().background; },
      get scroll() { return self.getState().scroll; },
      get zoom() { return self.getState().zoom; },
      get canUndo() { return self.getState().canUndo; },
      get canRedo() { return self.getState().canRedo; },
      get compositions() { return self.getState().compositions; },
      get selection() { return self.getState().activeIds; },
      getState: () => self.getState(),
      toJSON: () => self.toJSON(),
      subscribeToState: (listener: LegacyStateListener) => self.subscribeToState(listener),
      setState: (patch: Record<string, unknown>, opts?: { updateHistory?: boolean; skipHistory?: boolean }) =>
        self.updateState(patch, opts),
      updateState: (patch: Record<string, unknown>, opts?: { updateHistory?: boolean; skipHistory?: boolean }) =>
        self.updateState(patch, opts),
      dispatch: (action: Record<string, unknown>, opts?: { updateHistory?: boolean; skipHistory?: boolean }) =>
        self.dispatch(action, opts),
    } as const;

    return new Proxy(values as Record<string, unknown>, {
      get(target, prop) {
        if (typeof prop === "string") {
          if (prop in target) return target[prop];

          if (prop.startsWith("subscribeTo")) {
            return subscribeFactory(prop);
          }

          if (prop === "state") return self.state;
        }

        return Reflect.get(target, prop);
      },
      has(target, prop) {
        if (typeof prop === "string") {
          return prop in target || prop.startsWith("subscribeTo");
        }
        return prop in target;
      },
    });
  }

  updateState(
    patch: Record<string, unknown>,
    opts?: { updateHistory?: boolean; skipHistory?: boolean }
  ): void {
    if (!patch || typeof patch !== "object") return;

    const state = engineStore.getState();

    if (Array.isArray((patch as any).activeIds)) {
      engineStore.dispatch(
        { type: "SET_SELECTION", payload: { clipIds: (patch as any).activeIds as string[] } },
        { skipHistory: !!opts?.skipHistory }
      );
    }

    if (Array.isArray((patch as any).selection)) {
      engineStore.dispatch(
        { type: "SET_SELECTION", payload: { clipIds: (patch as any).selection as string[] } },
        { skipHistory: !!opts?.skipHistory }
      );
    }

    if (typeof (patch as any).scrollX === "number" || typeof (patch as any).scrollY === "number") {
      engineStore.dispatch(
        {
          type: "SET_SCROLL",
          payload: {
            scrollX: typeof (patch as any).scrollX === "number" ? (patch as any).scrollX : state.ui.scrollX,
            scrollY: typeof (patch as any).scrollY === "number" ? (patch as any).scrollY : state.ui.scrollY,
          },
        },
        { skipHistory: !!opts?.skipHistory }
      );
    }

    if (typeof (patch as any).zoom === "number") {
      engineStore.dispatch(
        { type: "SET_ZOOM", payload: { zoom: (patch as any).zoom } },
        { skipHistory: !!opts?.skipHistory }
      );
    }

    if (typeof (patch as any).playheadTime === "number") {
      engineStore.dispatch(
        { type: "SET_PLAYHEAD", payload: { timeMs: (patch as any).playheadTime } },
        { skipHistory: !!opts?.skipHistory }
      );
    }

    if (
      (patch as any).trackItemsMap != null ||
      (patch as any).tracks != null ||
      (patch as any).duration != null ||
      (patch as any).fps != null ||
      (patch as any).size != null ||
      (patch as any).background != null ||
      (patch as any).trackItemIds != null
    ) {
      const next = buildProjectFromLegacyPayload({
        trackItemsMap: (patch as any).trackItemsMap ?? selectLegacyTrackItemsMap(state),
        tracks: (patch as any).tracks ?? Object.values(state.tracks),
        trackItemIds: (patch as any).trackItemIds ?? selectLegacyTrackItemIds(state),
        duration: (patch as any).duration ?? state.sequences[state.rootSequenceId]?.duration,
        fps: (patch as any).fps ?? state.sequences[state.rootSequenceId]?.fps,
        size: (patch as any).size ?? state.sequences[state.rootSequenceId]?.canvas,
        background: (patch as any).background ?? state.sequences[state.rootSequenceId]?.background,
        scrollX: (patch as any).scrollX ?? state.ui.scrollX,
        scrollY: (patch as any).scrollY ?? state.ui.scrollY,
        zoom: (patch as any).zoom ?? state.ui.zoom,
        playheadTime: (patch as any).playheadTime ?? state.ui.playheadTime,
        activeIds: (patch as any).activeIds ?? state.ui.selection,
      });

      engineStore.dispatch(
        { type: "LOAD_PROJECT", payload: { project: next } },
        { skipHistory: !!opts?.skipHistory }
      );
    }
  }

  setState(patch: Record<string, unknown>, opts?: { updateHistory?: boolean; skipHistory?: boolean }): void {
    this.updateState(patch, opts);
  }

  dispatch(action: Record<string, unknown>, opts?: { updateHistory?: boolean; skipHistory?: boolean }): void {
    this.updateState(action, opts);
  }
}

export const legacyStateAdapter = new LegacyStateAdapter();
