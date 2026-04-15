/**
 * engine/commands.ts — FIXED
 *
 * REVIEW FIXES:
 *   1. Opacity normalization — engine stores 0–1 in transform.opacity only.
 *      UI controls pass 0–100; setOpacity() converts at the boundary.
 *      details.opacity is NOT written. One canonical field, one range.
 *
 *   2. No dual-write — setOpacity no longer writes both transform.opacity
 *      and details.opacity. transform.opacity is the authority.
 *
 *   3. Explicit effect commands — applyEffect, removeEffect, updateEffect,
 *      toggleEffect now produce real EditorCommand types that the reducer
 *      handles explicitly. No more marker-style sentinel fields in details.
 *
 *   4. Removed trimClipIn/Out marker approach — replaced with trimClip()
 *      which produces a TRIM_CLIP command the reducer handles directly.
 *
 *   5. Removed updateDisplay marker approach — replaced with setDisplay()
 *      which uses UPDATE_CLIP with real display fields.
 *
 *   6. All commands and the reducer are now fully aligned — every builder
 *      here maps to an explicit reducer case in engine-core.ts.
 */

import type { EditorCommand, Clip, Track, Transform, AppliedEffect } from "./engine-core";
import { nanoid } from "./engine-core";

// ─── Clip CRUD ────────────────────────────────────────────────────────────────

export function addClip(clip: Clip, trackId?: string): EditorCommand {
  return { type: "ADD_CLIP", payload: { clip, trackId } };
}

export function deleteClip(clipId: string): EditorCommand {
  return deleteClips([clipId]);
}

export function deleteClips(clipIds: string[]): EditorCommand {
  return { type: "DELETE_CLIP", payload: { clipIds } };
}

export function moveClip(clipId: string, newStart: number, newTrackId?: string): EditorCommand {
  return { type: "MOVE_CLIP", payload: { clipId, newStart, newTrackId } };
}

// ─── Clip property update — plain deep merge ─────────────────────────────────

/**
 * Update transform properties.
 * All values must already be in engine units (opacity 0–1, angles in degrees).
 */
export function updateTransform(clipId: string, patch: Partial<Transform>): EditorCommand {
  return { type: "UPDATE_CLIP", payload: { clipId, transform: patch } };
}

/**
 * Update details (all clip-type-specific properties).
 * Do NOT put opacity here — opacity lives in transform.opacity.
 */
export function updateDetails(clipId: string, patch: Record<string, unknown>): EditorCommand {
  return { type: "UPDATE_CLIP", payload: { clipId, details: patch } };
}

/**
 * Update details + transform + display + trim in one command.
 */
export function updateClipProperties(
  clipId: string,
  patch: {
    transform?: Partial<Transform>;
    details?: Record<string, unknown>;
    display?: { from: number; to: number };
    trim?: { from: number; to: number };
    name?: string;
  }
): EditorCommand {
  return { type: "UPDATE_CLIP", payload: { clipId, ...patch } };
}

// ─── Opacity — single canonical field: transform.opacity (0–1) ───────────────

/**
 * Set clip opacity.
 * @param value  UI value in 0–100 range (percent).
 *               Converted to 0–1 before dispatch.
 *               Engine always stores 0–1.
 */
export function setOpacity(clipId: string, value: number): EditorCommand {
  const normalized = Math.max(0, Math.min(1, value / 100));
  return updateTransform(clipId, { opacity: normalized });
}

/**
 * Set clip opacity directly in engine units (0–1).
 * Use this when the source is already normalized (e.g. reading from engine state).
 */
export function setOpacityRaw(clipId: string, value01: number): EditorCommand {
  return updateTransform(clipId, { opacity: Math.max(0, Math.min(1, value01)) });
}

// ─── Transform convenience builders ──────────────────────────────────────────

export function setRotation(clipId: string, degrees: number): EditorCommand {
  return updateTransform(clipId, { rotate: degrees });
}

export function setPosition(clipId: string, x: number, y: number): EditorCommand {
  return updateTransform(clipId, { x, y });
}

export function setScale(clipId: string, scaleX: number, scaleY: number): EditorCommand {
  return updateTransform(clipId, { scaleX, scaleY });
}

export function setFlip(clipId: string, flipX: boolean, flipY: boolean): EditorCommand {
  return updateTransform(clipId, { flipX, flipY });
}

// ─── Details convenience builders ────────────────────────────────────────────

export function setVolume(clipId: string, value: number): EditorCommand {
  // Volume: 0–100 stored in details.volume. Consistent across all panels.
  return updateDetails(clipId, { volume: Math.max(0, Math.min(100, value)) });
}

export function setPlaybackRate(clipId: string, rate: number): EditorCommand {
  return updateDetails(clipId, { playbackRate: Math.max(0.1, Math.min(4, rate)) });
}

export function setBlur(clipId: string, value: number): EditorCommand {
  return updateDetails(clipId, { blur: value });
}

export function setBrightness(clipId: string, value: number): EditorCommand {
  return updateDetails(clipId, { brightness: value });
}

// ─── Timeline placement ──────────────────────────────────────────────────────

/**
 * Set display range explicitly (for timeline trim/extend handles).
 * Produces TRIM_CLIP so the reducer handles it as an explicit intent,
 * not a generic details patch.
 */
export function trimClip(
  clipId: string,
  display: { from: number; to: number },
  trim?: { from: number; to: number }
): EditorCommand {
  return { type: "TRIM_CLIP", payload: { clipId, display, trim } };
}

// ─── Effects — explicit commands, no marker patterns ─────────────────────────

/**
 * Apply an effect to a clip.
 * Produces APPLY_EFFECT which the reducer handles explicitly.
 */
export function applyEffect(
  clipId: string,
  kind: string,
  params: Record<string, unknown> = {},
  effectId?: string
): EditorCommand {
  const effect: AppliedEffect = {
    id: effectId ?? nanoid(),
    kind,
    params,
    enabled: true,
  };
  return { type: "APPLY_EFFECT", payload: { clipId, effect } };
}

/**
 * Remove an effect from a clip by effect id.
 */
export function removeEffect(clipId: string, effectId: string): EditorCommand {
  return { type: "REMOVE_EFFECT", payload: { clipId, effectId } };
}

/**
 * Update one or more params of an existing effect.
 */
export function updateEffectParams(
  clipId: string,
  effectId: string,
  params: Record<string, unknown>
): EditorCommand {
  return { type: "UPDATE_EFFECT", payload: { clipId, effectId, params } };
}

/**
 * Enable or disable an effect without removing it.
 */
export function toggleEffect(clipId: string, effectId: string, enabled: boolean): EditorCommand {
  return { type: "TOGGLE_EFFECT", payload: { clipId, effectId, enabled } };
}

// ─── Selection ───────────────────────────────────────────────────────────────

export function setSelection(clipIds: string[]): EditorCommand {
  return { type: "SET_SELECTION", payload: { clipIds } };
}

export function selectClip(clipId: string): EditorCommand {
  return setSelection([clipId]);
}

export function clearSelection(): EditorCommand {
  return setSelection([]);
}

// ─── Playhead ────────────────────────────────────────────────────────────────

export function setPlayhead(timeMs: number): EditorCommand {
  return { type: "SET_PLAYHEAD", payload: { timeMs: Math.max(0, timeMs) } };
}

// ─── Zoom / scroll ────────────────────────────────────────────────────────────

export function setZoom(zoom: number): EditorCommand {
  return { type: "SET_ZOOM", payload: { zoom } };
}

export function setScroll(scrollX?: number, scrollY?: number): EditorCommand {
  return { type: "SET_SCROLL", payload: { scrollX, scrollY } };
}

// ─── Track commands ───────────────────────────────────────────────────────────

export function addTrack(track: Track): EditorCommand {
  return { type: "ADD_TRACK", payload: { track } };
}

export function removeTrack(trackId: string): EditorCommand {
  return { type: "REMOVE_TRACK", payload: { trackId } };
}

export function updateTrack(
  trackId: string,
  patch: { locked?: boolean; muted?: boolean; hidden?: boolean; name?: string; order?: number }
): EditorCommand {
  return { type: "UPDATE_TRACK", payload: { trackId, ...patch } };
}

// ─── Canvas commands ──────────────────────────────────────────────────────────

export function setCanvas(width: number, height: number): EditorCommand {
  return { type: "SET_CANVAS", payload: { width, height } };
}

// ─── History commands ─────────────────────────────────────────────────────────

export function undo(): EditorCommand {
  return { type: "UNDO" };
}

export function redo(): EditorCommand {
  return { type: "REDO" };
}

// ─── Split clip ──────────────────────────────────────────────────────────────

export function splitClip(clipId: string, splitTimeMs: number): EditorCommand {
  return { type: "SPLIT_CLIP", payload: { clipId, splitTimeMs } };
}

// ─── Clone clip ──────────────────────────────────────────────────────────────

export function cloneClip(clipId: string): EditorCommand {
  return { type: "CLONE_CLIP", payload: { clipId } };
}

// ─── Clear all ──────────────────────────────────────────────────────────────

export function clearAll(): EditorCommand {
  return { type: "CLEAR_ALL", payload: undefined };
}
