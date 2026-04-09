/**
 * bridge/legacy-adapter.ts
 *
 * Compatibility bridge between the OLD @designcombo-based useStore and the NEW engine.
 *
 * MIGRATION PHASES:
 *  Phase 1  — This adapter is the ONLY thing that talks to both stores.
 *             Old React components keep calling useStore() and it works.
 *  Phase 2  — As each panel is migrated to useEngineSelector(), delete
 *             the corresponding compatibility shim below.
 *  Phase 3  — Once all panels are migrated, delete this file entirely.
 *
 * Pattern:
 *   - legacyToEngine()  converts an old ITrackItem payload into an engine command
 *   - engineToLegacy()  converts engine project state back to the old ITimelineStore shape
 *     so un-migrated panels keep receiving data in the shape they expect
 */

import { engineStore } from "../state/engine-store";
import { normalizeClip, normalizeTrack } from "../validation/normalize";
import { isRecord } from "../validation/guards";
import type { Project, Clip, Track } from "../model/schema";
import type { EditorCommand } from "../commands";
import { nanoid } from "../utils/id";

// ─── Legacy shape (mirrors @designcombo ITrackItem) ───────────────────────────

export interface LegacyTrackItem {
  id: string;
  type: string;
  name?: string;
  display?: { from: number; to: number };
  trim?: { from: number; to: number };
  details?: Record<string, unknown>;
  transform?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LegacyTimelineState {
  duration: number;
  fps: number;
  tracks: Array<{ id: string; type: string; name: string; order: number; locked?: boolean; muted?: boolean; hidden?: boolean; items?: string[] }>;
  trackItemIds: string[];
  trackItemsMap: Record<string, LegacyTrackItem>;
  transitionIds: string[];
  transitionsMap: Record<string, unknown>;
  activeIds: string[];
  size: { width: number; height: number };
}

// ─── Engine → Legacy ──────────────────────────────────────────────────────────

/**
 * Convert current engine project state into the legacy ITimelineStore shape.
 * Un-migrated React components subscribe to this.
 */
export function engineToLegacy(project: Project): LegacyTimelineState {
  const seq = project.sequences[project.rootSequenceId];

  const legacyTracks = Object.values(project.tracks)
    .filter(Boolean)
    .map((t) => ({
      id: t!.id,
      type: t!.type,
      name: t!.name,
      order: t!.order,
      locked: t!.locked,
      muted: t!.muted,
      hidden: t!.hidden,
      items: t!.clipIds,
    })) as LegacyTimelineState["tracks"];

  const trackItemsMap: Record<string, LegacyTrackItem> = {};
  for (const [id, clip] of Object.entries(project.clips)) {
    if (!clip) continue;
    trackItemsMap[id] = clipToLegacy(clip);
  }

  return {
    duration: seq?.duration ?? 10000,
    fps: seq?.fps ?? 30,
    tracks: legacyTracks,
    trackItemIds: Object.keys(trackItemsMap),
    trackItemsMap,
    transitionIds: Object.keys(project.transitions),
    transitionsMap: project.transitions as Record<string, unknown>,
    activeIds: project.ui.selection,
    size: seq?.canvas ?? { width: 1080, height: 1920 },
  };
}

function clipToLegacy(clip: Clip): LegacyTrackItem {
  return {
    id: clip.id,
    type: clip.type,
    name: clip.name,
    display: clip.display,
    trim: clip.trim,
    details: clip.details as Record<string, unknown>,
    transform: {
      x: clip.transform.x,
      y: clip.transform.y,
      scale: clip.transform.scaleX,
      rotate: clip.transform.rotate,
      opacity: clip.transform.opacity,
    },
    assetId: clip.assetId,
  };
}

// ─── Legacy → Engine ─────────────────────────────────────────────────────────

/**
 * Convert a legacy applyEditorUpdate call (type + payload) into an
 * engine EditorCommand and dispatch it.
 *
 * This is the drop-in replacement for applyEditorUpdate() in editor-bridge.ts.
 * Call this from editor-commands.ts wrappers during migration.
 */
export function applyLegacyUpdate(
  type: string,
  payload: unknown,
  options?: { skipHistory?: boolean }
): void {
  const command = legacyToEngineCommand(type, payload);
  if (!command) return;
  engineStore.dispatch(command, { skipHistory: options?.skipHistory });
}

function legacyToEngineCommand(type: string, payload: unknown): EditorCommand | null {
  switch (type) {
    case "LAYER_SELECTION": {
      const ids = isRecord(payload) && Array.isArray(payload.activeIds)
        ? (payload.activeIds as string[])
        : [];
      return { type: "SET_SELECTION", payload: { clipIds: ids } };
    }

    case "LAYER_DELETE": {
      const id = isRecord(payload) ? String(payload.id ?? "") : String(payload ?? "");
      const ids = isRecord(payload) && Array.isArray(payload.ids)
        ? (payload.ids as string[])
        : id ? [id] : [];
      if (ids.length === 0) return null;
      return { type: "DELETE_CLIP", payload: { clipIds: ids } };
    }

    case "EDIT_OBJECT": {
      if (!isRecord(payload)) return null;
      // Multi-clip batch — dispatch individually inside a batch
      engineStore.beginBatch();
      for (const [clipId, patch] of Object.entries(payload)) {
        if (!isRecord(patch)) continue;
        const cmd: EditorCommand = {
          type: "UPDATE_CLIP",
          payload: {
            clipId,
            details: isRecord(patch.details) ? patch.details : undefined,
            display: isRecord(patch.display) ? patch.display as any : undefined,
            trim: isRecord(patch.trim) ? patch.trim as any : undefined,
          },
        };
        engineStore.dispatch(cmd, { skipHistory: true });
      }
      engineStore.endBatch("Edit clips");
      return null; // already dispatched inside batch
    }

    case "DESIGN_LOAD": {
      if (!isRecord(payload)) return null;
      // Attempt to reconstruct a minimal engine project from legacy state
      const project = engineStore.getState();
      const { tracks = [], trackItemsMap = {}, transitionsMap = {}, size, duration, fps } = payload as any;

      const seq = project.sequences[project.rootSequenceId];

      const newTracks: Record<string, Track> = {};
      const newClips: Record<string, Clip> = {};
      const seqTrackIds: string[] = [];

      for (const lt of (Array.isArray(tracks) ? tracks : [])) {
        const t = normalizeTrack(lt);
        if (!t) continue;
        newTracks[t.id] = t;
        seqTrackIds.push(t.id);
      }

      for (const [id, raw] of Object.entries(isRecord(trackItemsMap) ? trackItemsMap : {})) {
        const c = normalizeClip({ ...(isRecord(raw) ? raw : {}), id });
        if (!c) continue;
        // Assign to correct track
        if (c.trackId && newTracks[c.trackId]) {
          if (!newTracks[c.trackId].clipIds.includes(c.id)) {
            newTracks[c.trackId].clipIds.push(c.id);
          }
        }
        newClips[c.id] = c;
      }

      const newProject: Project = {
        ...project,
        tracks: newTracks,
        clips: newClips,
        transitions: isRecord(transitionsMap) ? transitionsMap as any : {},
        sequences: {
          ...project.sequences,
          [project.rootSequenceId]: {
            ...seq,
            trackIds: seqTrackIds,
            canvas: isRecord(size) ? { width: Number(size.width ?? 1080), height: Number(size.height ?? 1920) } : seq.canvas,
            duration: typeof duration === "number" ? duration : seq.duration,
            fps: typeof fps === "number" ? fps : seq.fps,
          },
        },
      };

      return { type: "LOAD_PROJECT", payload: { project: newProject } };
    }

    case "DESIGN_RESIZE": {
      if (!isRecord(payload) || !isRecord(payload.size)) return null;
      return {
        type: "RESIZE_PROJECT",
        payload: {
          width: Number(payload.size.width),
          height: Number(payload.size.height),
        },
      };
    }

    case "ADD_VIDEO":
    case "ADD_AUDIO":
    case "ADD_IMAGE":
    case "ADD_TEXT":
    case "ADD_CAPTIONS":
    case "ADD_ITEMS":
    case "LAYER_CLONE": {
      // Normalise the item(s) and add them
      const items = Array.isArray(payload) ? payload : [payload];
      engineStore.beginBatch();
      for (const raw of items) {
        const clip = normalizeClip(isRecord(raw) ? raw : {});
        if (!clip) continue;
        const state = engineStore.getState();
        // Auto-create a track if needed
        let trackId = clip.trackId;
        if (!trackId || !state.tracks[trackId]) {
          trackId = nanoid();
          engineStore.dispatch({
            type: "ADD_TRACK",
            payload: {
              track: {
                id: trackId,
                type: clip.type === "audio" ? "audio" : clip.type === "text" ? "text" : "video",
                name: clip.type,
                order: Object.keys(state.tracks).length,
                locked: false, muted: false, hidden: false,
              },
            },
          }, { skipHistory: true });
        }
        engineStore.dispatch({
          type: "ADD_CLIP",
          payload: { clip: { ...clip, trackId }, trackId },
        }, { skipHistory: true });
      }
      engineStore.endBatch(`Add ${type.replace("ADD_", "").toLowerCase()}`);
      return null;
    }

    default:
      return null;
  }
}
