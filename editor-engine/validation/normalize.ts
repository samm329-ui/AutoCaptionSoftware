/**
 * validation/normalize.ts
 * Converts external / legacy payload shapes into the engine's canonical
 * Clip/Track/Project shapes before dispatching commands.
 *
 * This is the ONLY place where @designcombo/types shapes are translated.
 * Nothing else in the engine should import from @designcombo/types directly.
 */

import type { Clip, Track, Asset, Caption, ClipType, TrackType } from "../model/schema";
import { DEFAULT_TRANSFORM } from "../model/schema";
import { safeNumber, safeString, isRecord, safeArray } from "./guards";
import { nanoid } from "../utils/id";

// ─── Clip Normalizer ─────────────────────────────────────────────────────────

/**
 * Convert a @designcombo ITrackItem shape to an engine Clip.
 * Accepts an unknown payload — applies safe coercion throughout.
 */
export function normalizeClip(raw: unknown): Clip | null {
  if (!isRecord(raw)) return null;

  const id = safeString(raw.id) || nanoid();
  const type = normalizeClipType(raw.type as string);
  const display = normalizeDisplay(raw.display);
  const trim = normalizeTrim(raw.trim, display);

  const details: Record<string, unknown> = isRecord(raw.details) ? { ...raw.details } : {};

  // Also absorb top-level fields that legacy payloads put outside `details`
  if (raw.speed !== undefined) details.speed = safeNumber(raw.speed, 1);
  if (raw.volume !== undefined) details.volume = safeNumber(raw.volume, 1);

  return {
    id,
    type,
    trackId: safeString(raw.trackId),
    assetId: safeString(raw.assetId) || undefined,
    name: safeString(raw.name) || type,
    display,
    trim,
    transform: normalizeTransform(raw.transform),
    details,
    effectIds: safeArray<string>(raw.effectIds),
    keyframeIds: safeArray<string>(raw.keyframeIds),
    metadata: isRecord(raw.metadata) ? (raw.metadata as Record<string, unknown>) : undefined,
  };
}

function normalizeClipType(raw: unknown): ClipType {
  const valid: ClipType[] = ["video", "audio", "image", "text", "caption", "transition", "shape", "overlay"];
  const t = String(raw ?? "").toLowerCase();
  return valid.includes(t as ClipType) ? (t as ClipType) : "video";
}

function normalizeDisplay(raw: unknown): { from: number; to: number } {
  if (isRecord(raw)) {
    return {
      from: Math.max(0, safeNumber(raw.from)),
      to: Math.max(0, safeNumber(raw.to)),
    };
  }
  return { from: 0, to: 5000 };
}

function normalizeTrim(raw: unknown, display: { from: number; to: number }) {
  const duration = display.to - display.from;
  if (isRecord(raw)) {
    return {
      from: safeNumber(raw.from, 0),
      to: safeNumber(raw.to, duration),
    };
  }
  return { from: 0, to: duration };
}

function normalizeTransform(raw: unknown) {
  if (!isRecord(raw)) return { ...DEFAULT_TRANSFORM };
  return {
    ...DEFAULT_TRANSFORM,
    x: safeNumber(raw.x, 0),
    y: safeNumber(raw.y, 0),
    scaleX: safeNumber(raw.scaleX, 1),
    scaleY: safeNumber(raw.scaleY, 1),
    rotate: safeNumber(raw.rotate, 0),
    opacity: safeNumber(raw.opacity, 1),
    flipX: Boolean(raw.flipX),
    flipY: Boolean(raw.flipY),
  };
}

// ─── Track Normalizer ─────────────────────────────────────────────────────────

export function normalizeTrack(raw: unknown): Track | null {
  if (!isRecord(raw)) return null;

  const validTypes: TrackType[] = ["video", "audio", "text", "caption", "overlay"];
  const type = validTypes.includes(raw.type as TrackType)
    ? (raw.type as TrackType)
    : "video";

  return {
    id: safeString(raw.id) || nanoid(),
    type,
    name: safeString(raw.name) || type,
    order: safeNumber(raw.order, 0),
    locked: Boolean(raw.locked),
    muted: Boolean(raw.muted),
    hidden: Boolean(raw.hidden),
    // Support both `clipIds` and legacy `itemIds`/`items`
    clipIds: safeArray<string>(raw.clipIds ?? raw.itemIds ?? raw.items),
  };
}

// ─── Caption Normalizer ───────────────────────────────────────────────────────

export function normalizeCaption(raw: unknown): Caption | null {
  if (!isRecord(raw)) return null;

  return {
    id: safeString(raw.id) || nanoid(),
    trackId: safeString(raw.trackId),
    start: safeNumber(raw.start ?? raw.startMs, 0),
    end: safeNumber(raw.end ?? raw.endMs, 0),
    text: safeString(raw.text),
    words: normalizeCaptionWords(raw.words),
    style: isRecord(raw.style) ? (raw.style as Caption["style"]) : undefined,
    animationPreset: safeString(raw.animationPreset) || undefined,
  };
}

function normalizeCaptionWords(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isRecord)
    .map((w) => ({
      text: safeString(w.text),
      startMs: safeNumber(w.startMs ?? w.start, 0),
      endMs: safeNumber(w.endMs ?? w.end, 0),
      confidence: typeof w.confidence === "number" ? w.confidence : undefined,
    }));
}

// ─── Asset Normalizer ─────────────────────────────────────────────────────────

export function normalizeAsset(raw: unknown): Asset | null {
  if (!isRecord(raw)) return null;

  const validTypes = ["video", "audio", "image", "font"];
  const type = validTypes.includes(raw.type as string) ? (raw.type as Asset["type"]) : "video";

  return {
    id: safeString(raw.id) || nanoid(),
    type,
    name: safeString(raw.name ?? raw.originalName),
    url: safeString(raw.url),
    previewUrl: safeString(raw.previewUrl) || undefined,
    duration: typeof raw.duration === "number" ? raw.duration : undefined,
    width: typeof raw.width === "number" ? raw.width : undefined,
    height: typeof raw.height === "number" ? raw.height : undefined,
    mimeType: safeString(raw.mimeType) || undefined,
    fileSize: typeof raw.fileSize === "number" ? raw.fileSize : undefined,
  };
}
