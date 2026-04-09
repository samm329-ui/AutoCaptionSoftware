/**
 * runtime/interaction/drag-registry.ts
 *
 * Safe drag payload store.
 * Instead of putting raw JSON in HTML dataTransfer (which can be read by
 * any drop handler and gets wiped on some browsers), we:
 *   1. Generate a short opaque token on drag start
 *   2. Store the full payload in memory keyed by that token
 *   3. Put ONLY the token in dataTransfer
 *   4. On drop, resolve the token back to the full payload
 *   5. Validate the payload before dispatching a command
 *
 * This means even if the DOM loses the dataTransfer data, the payload
 * is safe in memory for the lifetime of the drag.
 */

import { nanoid } from "../../utils/id";
import { normalizeClip, normalizeAsset } from "../../validation/normalize";
import type { Clip, Asset } from "../../model/schema";

// ─── Payload Types ────────────────────────────────────────────────────────────

export type DragSource = "media-bin" | "timeline-clip" | "external";

export interface DragPayload {
  token: string;
  source: DragSource;
  /** If dragging an existing timeline clip */
  clip?: Clip;
  /** If dragging an asset from media bin */
  asset?: Asset;
  /** Arbitrary extra data */
  meta?: Record<string, unknown>;
}

// ─── Registry ────────────────────────────────────────────────────────────────

const TOKEN_KEY = "engine-drag-token";
const TTL_MS = 30_000; // tokens expire after 30s in case drag never fires dragend

interface StoredEntry {
  payload: DragPayload;
  createdAt: number;
}

class DragRegistry {
  private store = new Map<string, StoredEntry>();

  // ── Register ────────────────────────────────────────────────────────────

  /**
   * Register a drag payload and return the token.
   * Call this in `dragstart` / `pointerdown`.
   */
  register(raw: Omit<DragPayload, "token">): string {
    this.cleanup();

    const token = nanoid(12);
    const payload: DragPayload = { ...raw, token };
    this.store.set(token, { payload, createdAt: Date.now() });
    return token;
  }

  // ── Resolve ─────────────────────────────────────────────────────────────

  /**
   * Resolve a token back to its payload.
   * Returns null if token is unknown or expired.
   */
  resolve(token: string): DragPayload | null {
    const entry = this.store.get(token);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > TTL_MS) {
      this.store.delete(token);
      return null;
    }
    return entry.payload;
  }

  // ── Release ──────────────────────────────────────────────────────────────

  /** Remove a token after drop or cancel */
  release(token: string): void {
    this.store.delete(token);
  }

  // ── dataTransfer helpers ─────────────────────────────────────────────────

  /** Write only the token to a DragEvent's dataTransfer */
  setDataTransfer(e: DragEvent, token: string): void {
    try {
      e.dataTransfer?.setData("text/plain", `${TOKEN_KEY}:${token}`);
    } catch {
      // Browsers can throw if setData is called outside dragstart
    }
  }

  /** Extract the token from a DragEvent's dataTransfer */
  getTokenFromDataTransfer(e: DragEvent): string | null {
    try {
      const raw = e.dataTransfer?.getData("text/plain") ?? "";
      if (!raw.startsWith(`${TOKEN_KEY}:`)) return null;
      return raw.slice(TOKEN_KEY.length + 1);
    } catch {
      return null;
    }
  }

  /** Full flow: read token from dataTransfer → resolve payload */
  resolveFromDataTransfer(e: DragEvent): DragPayload | null {
    const token = this.getTokenFromDataTransfer(e);
    if (!token) return null;
    return this.resolve(token);
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.createdAt > TTL_MS) this.store.delete(key);
    }
  }
}

export const dragRegistry = new DragRegistry();

// ─── Convenience factory helpers ──────────────────────────────────────────────

/** Register a timeline clip drag */
export function registerClipDrag(clip: Clip): string {
  return dragRegistry.register({ source: "timeline-clip", clip });
}

/** Register an asset drag from the media bin */
export function registerAssetDrag(rawAsset: unknown): string {
  const asset = normalizeAsset(rawAsset);
  if (!asset) throw new Error("Invalid asset payload");
  return dragRegistry.register({ source: "media-bin", asset });
}
