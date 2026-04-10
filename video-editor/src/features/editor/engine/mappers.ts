/**
 * engine/mappers.ts — FIXED
 *
 * REVIEW FIXES:
 *   1. Merge-order bug — overrides no longer clobber the carefully built
 *      details object. details is merged last in a controlled way so
 *      normalized values survive.
 *
 *   2. Opacity normalization — old payloads can store opacity as 0–100.
 *      fromTrackItem() now detects this and normalizes to 0–1 at import time.
 *      This is the correct single conversion boundary.
 *
 *   3. trackId validation — a clip with no valid trackId is rejected (returns
 *      null) rather than silently producing an unusable clip.
 *
 *   4. Legacy alias support — mapToTrack / fromTrack supports every property
 *      name the old payload has ever used: clipIds, itemIds, items.
 *
 * WHEN TO DELETE:
 *   Once DesignCombo is fully removed and no payload ever arrives in the old
 *   ITrackItem shape, delete this file and all imports of it.
 */

import type { Clip, Track, Transform, AppliedEffect } from "./engine-core";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && isFinite(v) ? v : fallback;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * Normalize an opacity value to 0–1.
 * Old DesignCombo payloads stored opacity as 0–100.
 * Engine canonical range is 0–1.
 */
function normalizeOpacity(v: unknown, fallback = 1): number {
  const n = typeof v === "number" && isFinite(v) ? v : fallback;
  return n > 1 ? n / 100 : n;
}

// ─── ITrackItem → Clip ────────────────────────────────────────────────────────

const VALID_CLIP_TYPES: Clip["type"][] = [
  "video", "audio", "image", "text", "caption",
  "transition", "shape", "overlay",
];

/**
 * Convert a DesignCombo ITrackItem (or any similar payload) into an engine Clip.
 * Returns null if the result would be unusable (no id, no trackId).
 */
export function fromTrackItem(raw: unknown, existing?: Clip): Clip | null {
  const r = isRecord(raw) ? raw : {};

  const id = asString(r.id ?? existing?.id);
  if (!id) return null;

  const trackId = asString(r.trackId ?? existing?.trackId);
  if (!trackId) {
    console.warn("[mappers] fromTrackItem: clip", id, "has no trackId — skipped");
    return null;
  }

  const rawType = asString(r.type ?? existing?.type);
  const type: Clip["type"] = VALID_CLIP_TYPES.includes(rawType as Clip["type"])
    ? (rawType as Clip["type"])
    : "video";

  const displayRaw = isRecord(r.display) ? r.display : null;
  const display = displayRaw
    ? { from: asNumber(displayRaw.from), to: asNumber(displayRaw.to, 5000) }
    : existing?.display ?? { from: 0, to: 5000 };

  const clipDuration = display.to - display.from;
  const trimRaw = isRecord(r.trim) ? r.trim : null;
  const trim = trimRaw
    ? { from: asNumber(trimRaw.from), to: asNumber(trimRaw.to, clipDuration) }
    : existing?.trim ?? { from: 0, to: clipDuration };

  const rawDetails = isRecord(r.details) ? r.details : {};
  const existingDetails = existing?.details ?? {};

  const rawTransform = isRecord(r.transform) ? r.transform : null;
  const legacyX       = asNumber(rawDetails.left,   existing?.transform.x       ?? 0);
  const legacyY       = asNumber(rawDetails.top,    existing?.transform.y       ?? 0);
  const legacyRotate  = asNumber(rawDetails.rotate  ?? (rawDetails as any).rotation, existing?.transform.rotate ?? 0);
  const legacyScaleX  = asNumber((rawDetails as any).scaleX ?? (rawDetails as any).scale, existing?.transform.scaleX ?? 1);
  const legacyScaleY  = asNumber((rawDetails as any).scaleY ?? (rawDetails as any).scale, existing?.transform.scaleY ?? 1);
  const legacyFlipX   = Boolean((rawDetails as any).flipX ?? existing?.transform.flipX ?? false);
  const legacyFlipY   = Boolean((rawDetails as any).flipY ?? existing?.transform.flipY ?? false);
  const legacyOpacity = normalizeOpacity(rawDetails.opacity, existing?.transform.opacity ?? 1);

  const transform: Transform = rawTransform
    ? {
        x:       asNumber(rawTransform.x,      legacyX),
        y:       asNumber(rawTransform.y,      legacyY),
        scaleX:  asNumber(rawTransform.scaleX  ?? rawTransform.scale, legacyScaleX),
        scaleY:  asNumber(rawTransform.scaleY  ?? rawTransform.scale, legacyScaleY),
        rotate:  asNumber(rawTransform.rotate, legacyRotate),
        opacity: normalizeOpacity(rawTransform.opacity, legacyOpacity),
        flipX:   Boolean(rawTransform.flipX ?? legacyFlipX),
        flipY:   Boolean(rawTransform.flipY ?? legacyFlipY),
      }
    : {
        x:       legacyX,
        y:       legacyY,
        scaleX:  legacyScaleX,
        scaleY:  legacyScaleY,
        rotate:  legacyRotate,
        opacity: legacyOpacity,
        flipX:   legacyFlipX,
        flipY:   legacyFlipY,
      };

  const mergedDetails: Record<string, unknown> = {
    ...existingDetails,
    ...rawDetails,
  };
  for (const k of ["left", "top", "rotate", "rotation", "opacity", "scaleX", "scaleY", "scale", "flipX", "flipY"]) {
    delete mergedDetails[k];
  }

  return {
    id,
    type,
    trackId,
    assetId: r.assetId != null ? asString(r.assetId) : existing?.assetId,
    name:    asString(r.name ?? existing?.name ?? type),
    display,
    trim,
    transform,
    details: mergedDetails,
    appliedEffects: asArray<AppliedEffect>(r.appliedEffects ?? existing?.appliedEffects),
    effectIds:      asArray<string>(r.effectIds   ?? existing?.effectIds),
    keyframeIds:    asArray<string>(r.keyframeIds ?? existing?.keyframeIds),
    metadata: isRecord(r.metadata) ? (r.metadata as Record<string, unknown>) : existing?.metadata,
  };
}

// ─── ITrack → Track ───────────────────────────────────────────────────────────

const VALID_TRACK_TYPES: Track["type"][] = [
  "video", "audio", "text", "caption", "overlay",
];

/**
 * Convert a DesignCombo ITrack to an engine Track.
 */
export function fromTrack(raw: unknown, existing?: Track): Track | null {
  const r = isRecord(raw) ? raw : {};

  const id = asString(r.id ?? existing?.id);
  if (!id) return null;

  const rawType = asString(r.type ?? existing?.type);
  const type: Track["type"] = VALID_TRACK_TYPES.includes(rawType as Track["type"])
    ? (rawType as Track["type"])
    : "video";

  const clipIds: string[] =
    Array.isArray(r.clipIds)    ? (r.clipIds    as string[]) :
    Array.isArray(r.itemIds)    ? (r.itemIds    as string[]) :
    Array.isArray(r.items)      ? (r.items      as string[]) :
    Array.isArray(r.trackItems) ? (r.trackItems as string[]) :
    (existing?.clipIds ?? []);

  return {
    id,
    type,
    name:    asString(r.name    ?? existing?.name ?? type),
    order:   asNumber(r.order   ?? existing?.order),
    locked:  Boolean(r.locked  ?? existing?.locked  ?? false),
    muted:   Boolean(r.muted   ?? existing?.muted   ?? false),
    hidden:  Boolean(r.hidden  ?? existing?.hidden  ?? false),
    clipIds,
  };
}

/**
 * Merge a DesignCombo EDIT_OBJECT partial patch into an existing engine Clip.
 */
export function mergeClipPatch(existing: Clip, patch: Record<string, unknown>): Clip {
  const patchDetails  = isRecord(patch.details)   ? patch.details   : {};
  const patchDisplay  = isRecord(patch.display)   ? patch.display   : null;
  const patchTrim     = isRecord(patch.trim)       ? patch.trim       : null;
  const patchTr       = isRecord(patch.transform)  ? patch.transform  : null;

  const topLevelPlaybackRate = typeof patch.playbackRate === "number"
    ? { playbackRate: patch.playbackRate }
    : {};

  const opacityPatch: Partial<Transform> = {};
  if (patchTr && "opacity" in patchTr) {
    opacityPatch.opacity = normalizeOpacity(patchTr.opacity, existing.transform.opacity);
  }

  return {
    ...existing,
    display:   patchDisplay ? { ...existing.display, ...patchDisplay } : existing.display,
    trim:      patchTrim    ? { ...existing.trim,    ...patchTrim    } : existing.trim,
    transform: patchTr
      ? { ...existing.transform, ...patchTr, ...opacityPatch }
      : existing.transform,
    details: {
      ...existing.details,
      ...topLevelPlaybackRate,
      ...patchDetails,
    },
  };
}
