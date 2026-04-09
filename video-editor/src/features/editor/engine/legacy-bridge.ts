/**
 * legacy-bridge.ts
 * src/features/editor/engine/legacy-bridge.ts
 *
 * ─── What this file does ─────────────────────────────────────────────────────
 *
 * During migration, DesignCombo (@designcombo/state + @designcombo/events) is
 * still the runtime that drives the existing UI — the timeline canvas, the
 * scene player, the inspector panels.  The new engine (engine-core.ts) runs in
 * parallel and needs to stay in sync.
 *
 * This bridge:
 *   1. Subscribes to the @designcombo event bus
 *   2. Translates each DesignCombo event into an engine command
 *   3. Dispatches that command to the engine store
 *
 * Direction of truth during migration:
 *
 *   DesignCombo (authoritative) ──→ legacy-bridge ──→ engine (mirror)
 *
 * Once all panels have been migrated to read from the engine, the direction
 * flips: the engine becomes authoritative and DesignCombo is removed.
 *
 * ─── How to mount it ─────────────────────────────────────────────────────────
 *
 *   // In editor.tsx, after <EngineProvider>:
 *   import { useLegacyBridge } from "./engine/legacy-bridge";
 *
 *   function EditorShell() {
 *     useLegacyBridge(); // mounts in useEffect, tears down on unmount
 *     return <...rest of editor...>;
 *   }
 *
 * ─── How to remove it ────────────────────────────────────────────────────────
 *
 * When Phase 5 is complete (all panels read from engine, all mutations go
 * through engine commands):
 *   1. Delete this file
 *   2. Remove useLegacyBridge() call from editor.tsx
 *   3. Remove @designcombo/* from package.json
 *   4. Remove the "engine is a mirror" comment blocks
 *
 * ─── What is NOT translated ──────────────────────────────────────────────────
 *
 * HISTORY_UNDO / HISTORY_REDO are handled by DesignCombo's own history stack
 * during migration.  The engine's undo/redo is separate.  When the engine
 * becomes authoritative, switch to engine.undo() / engine.redo() and remove
 * the DesignCombo history calls.
 */

import { useEffect } from "react";
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
  LAYER_CLONE,
  LAYER_DELETE,
  LAYER_SELECTION,
} from "@designcombo/state";
import { engineStore, type Project, type Clip, type Track } from "./engine-core";

// ─── Event keys to intercept ─────────────────────────────────────────────────

const BRIDGE_KEYS = [
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
] as const;

type BridgeKey = typeof BRIDGE_KEYS[number];

// ─── Type guards ──────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && isFinite(v) ? v : fallback;
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

// ─── Payload normalisation ────────────────────────────────────────────────────

/**
 * Convert a DesignCombo ITrackItem-shaped object to an engine Clip.
 * Uses safe coercion throughout — never throws on malformed input.
 */
function toEngineClip(raw: unknown, existingClip?: Clip): Clip {
  if (!isRecord(raw)) return existingClip ?? ({} as Clip);

  const display = isRecord(raw.display)
    ? {
        from: asNumber(raw.display.from, 0),
        to: asNumber(raw.display.to, 5000),
      }
    : existingClip?.display ?? { from: 0, to: 5000 };

  const duration = display.to - display.from;
  const trim = isRecord(raw.trim)
    ? { from: asNumber(raw.trim.from, 0), to: asNumber(raw.trim.to, duration) }
    : existingClip?.trim ?? { from: 0, to: duration };

  const rawType = asString(raw.type || existingClip?.type);
  const validTypes: Clip["type"][] = [
    "video", "audio", "image", "text", "caption",
    "transition", "shape", "overlay",
  ];
  const type: Clip["type"] = validTypes.includes(rawType as Clip["type"])
    ? (rawType as Clip["type"])
    : "video";

  return {
    id: asString(raw.id || existingClip?.id),
    type,
    trackId: asString(raw.trackId || existingClip?.trackId),
    assetId: raw.assetId != null ? asString(raw.assetId) : existingClip?.assetId,
    name: asString(raw.name || existingClip?.name || type),
    display,
    trim,
    transform: {
      x: asNumber(isRecord(raw.transform) ? raw.transform.x : undefined, existingClip?.transform.x ?? 0),
      y: asNumber(isRecord(raw.transform) ? raw.transform.y : undefined, existingClip?.transform.y ?? 0),
      scaleX: asNumber(isRecord(raw.transform) ? (raw.transform.scaleX ?? raw.transform.scale) : undefined, 1),
      scaleY: asNumber(isRecord(raw.transform) ? (raw.transform.scaleY ?? raw.transform.scale) : undefined, 1),
      rotate: asNumber(isRecord(raw.transform) ? raw.transform.rotate : undefined, 0),
      opacity: asNumber(isRecord(raw.transform) ? raw.transform.opacity : undefined, 1),
      flipX: Boolean(isRecord(raw.transform) ? raw.transform.flipX : false),
      flipY: Boolean(isRecord(raw.transform) ? raw.transform.flipY : false),
    },
    details: isRecord(raw.details)
      ? { ...(existingClip?.details ?? {}), ...raw.details }
      : existingClip?.details ?? {},
    effectIds: asArray(raw.effectIds),
    keyframeIds: asArray(raw.keyframeIds),
    metadata: isRecord(raw.metadata) ? raw.metadata as Record<string, unknown> : undefined,
  };
}

/**
 * Deep-merge a partial DesignCombo EDIT_OBJECT patch into an existing engine clip.
 * Handles the nested details / display / trim merge that DesignCombo expects.
 */
function mergeClipPatch(existing: Clip, patch: Record<string, unknown>): Clip {
  return {
    ...existing,
    details: isRecord(patch.details)
      ? { ...existing.details, ...patch.details }
      : existing.details,
    display: isRecord(patch.display)
      ? { ...existing.display, ...patch.display }
      : existing.display,
    trim: isRecord(patch.trim)
      ? { ...existing.trim, ...patch.trim }
      : existing.trim,
    transform: isRecord(patch.transform)
      ? { ...existing.transform, ...patch.transform }
      : existing.transform,
  };
}

// ─── Translation layer ────────────────────────────────────────────────────────

/**
 * Translate one DesignCombo event into zero or more engine store mutations.
 * Returns true if any dispatch was made.
 */
function translateEvent(key: BridgeKey, payload: unknown): boolean {
  const state = engineStore.getState();

  // ── Selection ──────────────────────────────────────────────────────────────
  if (key === LAYER_SELECTION) {
    const ids = isRecord(payload) && Array.isArray(payload.activeIds)
      ? (payload.activeIds as string[]).filter((id) => typeof id === "string")
      : [];
    engineStore.dispatch({ type: "SET_SELECTION", payload: { clipIds: ids } });
    return true;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  if (key === LAYER_DELETE) {
    const ids: string[] = [];
    if (typeof payload === "string") ids.push(payload);
    if (isRecord(payload)) {
      if (typeof payload.id === "string") ids.push(payload.id);
      if (Array.isArray(payload.ids)) {
        for (const id of payload.ids) {
          if (typeof id === "string") ids.push(id);
        }
      }
    }
    if (ids.length === 0) return false;
    engineStore.dispatch({ type: "DELETE_CLIP", payload: { clipIds: ids } });
    return true;
  }

  // ── Edit object (move, resize, property change) ────────────────────────────
  if (key === EDIT_OBJECT || key === EDIT_TRACK) {
    if (!isRecord(payload)) return false;

    // Payload shape: { [clipId]: { details?, display?, trim?, ... } }
    // OR:           { trackItemsMap: { [clipId]: {...} } }
    const patches: Record<string, Record<string, unknown>> = {};

    if (isRecord(payload.trackItemsMap)) {
      for (const [id, p] of Object.entries(payload.trackItemsMap as Record<string, unknown>)) {
        if (isRecord(p)) patches[id] = p;
      }
    } else {
      // Each top-level key that is an existing clip id
      for (const [id, p] of Object.entries(payload)) {
        if (state.clips[id] && isRecord(p)) patches[id] = p;
      }
    }

    if (Object.keys(patches).length === 0) return false;

    const newClips = { ...state.clips };
    for (const [id, patch] of Object.entries(patches)) {
      const existing = state.clips[id];
      if (!existing) continue;
      newClips[id] = mergeClipPatch(existing, patch);
    }

    // Dispatch a LOAD_PROJECT snapshot update for this batch of clip edits.
    // This is intentionally coarse during migration — once the engine is
    // authoritative, these will become individual UPDATE_CLIP commands.
    engineStore.dispatch({
      type: "LOAD_PROJECT",
      payload: { project: { ...state, clips: newClips } },
    });
    return true;
  }

  // ── Add clip(s) ────────────────────────────────────────────────────────────
  if (
    key === ADD_VIDEO ||
    key === ADD_AUDIO ||
    key === ADD_IMAGE ||
    key === ADD_TEXT ||
    key === ADD_CAPTIONS ||
    key === ADD_TRANSITION ||
    key === ADD_ITEMS ||
    key === LAYER_CLONE
  ) {
    const items = Array.isArray(payload) ? payload : [payload];
    let dispatched = false;

    for (const raw of items) {
      if (!isRecord(raw)) continue;

      // ADD_ITEMS wraps items in an `items` array
      const innerItems: unknown[] =
        key === ADD_ITEMS && Array.isArray(raw.items) ? raw.items : [raw];

      for (const innerRaw of innerItems) {
        if (!isRecord(innerRaw) || !innerRaw.id) continue;

        const clip = toEngineClip(innerRaw);
        if (!clip.id) continue;

        let trackId = clip.trackId;

        // Auto-create a track if none exists for this clip
        if (!trackId || !state.tracks[trackId]) {
          const trackType =
            clip.type === "audio" ? "audio"
            : clip.type === "text" || clip.type === "caption" ? "text"
            : "video";
          trackId = `bridge_track_${clip.id}`;
          engineStore.dispatch({
            type: "ADD_TRACK",
            payload: {
              track: {
                id: trackId,
                type: trackType,
                name: trackType,
                order: Object.keys(state.tracks).length,
                locked: false,
                muted: false,
                hidden: false,
                clipIds: [],
              },
            },
          });
        }

        engineStore.dispatch({
          type: "ADD_CLIP",
          payload: { clip: { ...clip, trackId }, trackId },
        });
        dispatched = true;
      }
    }
    return dispatched;
  }

  // ── Load full design ────────────────────────────────────────────────────────
  if (key === DESIGN_LOAD) {
    if (!isRecord(payload)) return false;
    _loadDesignPayload(payload, state);
    return true;
  }

  // ── Resize canvas ──────────────────────────────────────────────────────────
  if (key === DESIGN_RESIZE) {
    if (!isRecord(payload) || !isRecord(payload.size)) return false;
    const seq = state.sequences[state.rootSequenceId];
    if (!seq) return false;
    engineStore.dispatch({
      type: "LOAD_PROJECT",
      payload: {
        project: {
          ...state,
          sequences: {
            ...state.sequences,
            [state.rootSequenceId]: {
              ...seq,
              canvas: {
                width: asNumber(payload.size.width, seq.canvas.width),
                height: asNumber(payload.size.height, seq.canvas.height),
              },
            },
          },
        },
      },
    });
    return true;
  }

  return false;
}

/**
 * Reconstruct a minimal Project from a DesignCombo DESIGN_LOAD payload.
 * Handles both `trackItemsMap` (new) and flat item arrays (legacy).
 */
function _loadDesignPayload(
  payload: Record<string, unknown>,
  currentState: Project
): void {
  const seq = currentState.sequences[currentState.rootSequenceId];

  // ── Tracks ───────────────────────────────────────────────────────────────
  const newTracks: Record<string, Track> = {};
  const seqTrackIds: string[] = [];

  const rawTracks = asArray(payload.tracks);
  for (const rt of rawTracks) {
    if (!isRecord(rt) || !rt.id) continue;
    const validTypes: Track["type"][] = ["video", "audio", "text", "caption", "overlay"];
    const type: Track["type"] = validTypes.includes(rt.type as Track["type"])
      ? (rt.type as Track["type"])
      : "video";
    const id = asString(rt.id);
    newTracks[id] = {
      id,
      type,
      name: asString(rt.name || type),
      order: asNumber(rt.order),
      locked: Boolean(rt.locked),
      muted: Boolean(rt.muted),
      hidden: Boolean(rt.hidden),
      // Support both clipIds (engine) and itemIds/items (DesignCombo legacy)
      clipIds: asArray<string>(rt.clipIds ?? rt.itemIds ?? rt.items),
    };
    seqTrackIds.push(id);
  }

  // ── Clips ────────────────────────────────────────────────────────────────
  const newClips: Record<string, Clip> = {};
  const rawItemsMap = isRecord(payload.trackItemsMap) ? payload.trackItemsMap : {};

  for (const [id, rawItem] of Object.entries(rawItemsMap)) {
    if (!isRecord(rawItem)) continue;
    const clip = toEngineClip({ ...rawItem, id });
    if (!clip.id) continue;
    newClips[clip.id] = clip;
    // Ensure clip appears in its track's clipIds
    if (clip.trackId && newTracks[clip.trackId]) {
      if (!newTracks[clip.trackId].clipIds.includes(clip.id)) {
        newTracks[clip.trackId].clipIds.push(clip.id);
      }
    }
  }

  // ── Transitions ───────────────────────────────────────────────────────────
  const rawTransitions = isRecord(payload.transitionsMap)
    ? (payload.transitionsMap as Record<string, unknown>)
    : {};

  // ── Sequence metadata ─────────────────────────────────────────────────────
  const size = isRecord(payload.size)
    ? { width: asNumber(payload.size.width, 1080), height: asNumber(payload.size.height, 1920) }
    : seq?.canvas;
  const duration = asNumber(payload.duration, seq?.duration ?? 10000);
  const fps = asNumber(payload.fps, seq?.fps ?? 30);

  engineStore.dispatch({
    type: "LOAD_PROJECT",
    payload: {
      project: {
        ...currentState,
        tracks: newTracks,
        clips: newClips,
        transitions: rawTransitions as any,
        sequences: {
          ...currentState.sequences,
          [currentState.rootSequenceId]: {
            ...seq,
            trackIds: seqTrackIds,
            canvas: size ?? { width: 1080, height: 1920 },
            duration,
            fps,
          },
        },
        ui: {
          ...currentState.ui,
          selection: asArray<string>(payload.activeIds),
        },
      },
    },
  });
}

// ─── Bridge lifecycle ─────────────────────────────────────────────────────────

let bridgeMounted = false;

/**
 * Mount the bridge once.
 * Returns a cleanup function.
 *
 * This is called by useLegacyBridge() — do not call directly.
 */
function mountLegacyBridge(): () => void {
  if (bridgeMounted) {
    return () => {}; // no-op if already mounted (strict-mode guard)
  }
  bridgeMounted = true;

  const subscription = subject
    .pipe(filter(({ key }: { key: string }) => (BRIDGE_KEYS as readonly string[]).includes(key)))
    .subscribe((event: { key: string; value?: { payload?: unknown } }) => {
      try {
        translateEvent(event.key as BridgeKey, event.value?.payload);
      } catch (err) {
        console.error("[LegacyBridge] Translation error for event", event.key, err);
      }
    });

  return () => {
    subscription.unsubscribe();
    bridgeMounted = false;
  };
}

// ─── React hook ───────────────────────────────────────────────────────────────

/**
 * Mount the legacy DesignCombo → engine bridge.
 *
 * Call this hook once inside the editor shell component (inside EngineProvider).
 * It sets up the subscription in useEffect and tears it down on unmount.
 *
 * @example
 *   function EditorShell() {
 *     useLegacyBridge();
 *     return <div>...</div>;
 *   }
 */
export function useLegacyBridge(): void {
  useEffect(() => {
    const cleanup = mountLegacyBridge();
    return cleanup;
  }, []); // empty deps — mount once for the lifetime of the editor
}

// ─── Direct API (for use outside React, e.g. event handlers) ─────────────────

/**
 * Manually push a DesignCombo-shaped payload into the engine.
 * Use this in non-React code paths (e.g. page-level data loading)
 * when the bridge hook isn't available.
 *
 * @example
 *   // In a server-component data loader:
 *   bridgePush(DESIGN_LOAD, savedDesignPayload);
 */
export function bridgePush(key: string, payload: unknown): void {
  if (!(BRIDGE_KEYS as readonly string[]).includes(key)) {
    console.warn("[LegacyBridge] bridgePush: unknown key", key);
    return;
  }
  try {
    translateEvent(key as BridgeKey, payload);
  } catch (err) {
    console.error("[LegacyBridge] bridgePush error for key", key, err);
  }
}
