/**
 * validation/guards.ts
 * Validates incoming commands before they are applied to the store.
 * Returns a non-empty string (error reason) or null if valid.
 */

import type { EditorCommand } from "../commands";

export function validateCommand(command: EditorCommand): string | null {
  switch (command.type) {
    case "ADD_CLIP": {
      const { clip } = command.payload;
      if (!clip.id || typeof clip.id !== "string") return "clip.id is required";
      if (!clip.type) return "clip.type is required";
      if (clip.display.from < 0) return "clip.display.from must be >= 0";
      if (clip.display.to <= clip.display.from) return "clip.display.to must be > from";
      return null;
    }

    case "MOVE_CLIP": {
      const { clipId, newStart } = command.payload;
      if (!clipId) return "clipId is required";
      if (typeof newStart !== "number" || newStart < 0) return "newStart must be >= 0";
      return null;
    }

    case "TRIM_CLIP": {
      const { clipId, display, trim } = command.payload;
      if (!clipId) return "clipId is required";
      if (display.to <= display.from) return "display.to must be > from";
      if (trim.to < trim.from) return "trim.to must be >= from";
      return null;
    }

    case "SPLIT_CLIP": {
      const { clipId, splitAt } = command.payload;
      if (!clipId) return "clipId is required";
      if (typeof splitAt !== "number") return "splitAt must be a number";
      return null;
    }

    case "DELETE_CLIP": {
      if (!Array.isArray(command.payload.clipIds) || command.payload.clipIds.length === 0) {
        return "clipIds must be a non-empty array";
      }
      return null;
    }

    case "UPDATE_CLIP": {
      if (!command.payload.clipId) return "clipId is required";
      return null;
    }

    case "ADD_TRACK": {
      const { track } = command.payload;
      if (!track.id) return "track.id is required";
      if (!track.type) return "track.type is required";
      return null;
    }

    case "ADD_EFFECT": {
      if (!command.payload.clipId) return "clipId is required";
      if (!command.payload.effect?.id) return "effect.id is required";
      return null;
    }

    case "SET_PLAYHEAD": {
      if (typeof command.payload.timeMs !== "number") return "timeMs must be a number";
      return null;
    }

    case "SET_ZOOM": {
      if (typeof command.payload.zoom !== "number" || command.payload.zoom <= 0) {
        return "zoom must be a positive number";
      }
      return null;
    }

    case "ADD_CAPTIONS": {
      if (!Array.isArray(command.payload.captions)) return "captions must be an array";
      return null;
    }

    case "UPDATE_CAPTION": {
      if (!command.payload.captionId) return "captionId is required";
      return null;
    }

    case "DELETE_CAPTIONS": {
      if (!Array.isArray(command.payload.captionIds) || command.payload.captionIds.length === 0) {
        return "captionIds must be a non-empty array";
      }
      return null;
    }

    case "CLEAR_TRACK_CAPTIONS": {
      if (!command.payload.clipId && !command.payload.trackId) {
        return "clipId or trackId is required";
      }
      return null;
    }

    case "LOAD_PROJECT": {
      if (!command.payload.project?.id) return "project.id is required";
      if (!command.payload.project?.rootSequenceId) return "project.rootSequenceId is required";
      return null;
    }

    case "RESIZE_PROJECT": {
      const { width, height } = command.payload;
      if (width < 1 || height < 1) return "width and height must be >= 1";
      return null;
    }

    default:
      return null;
  }
}

/**
 * Normalise an unknown external payload into a safe shape
 * before constructing a command from it.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function safeString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function safeNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && isFinite(v) ? v : fallback;
}

export function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
