/**
 * engine/subsystems/trim-engine.ts
 * 
 * Pure engine-based trim handling for timeline clip edges.
 */

import { engineStore, type Clip } from "../engine-core";
import { trimClip } from "../commands";

export type TrimEdge = "left" | "right";

export interface TrimState {
  clipId: string;
  edge: TrimEdge;
  startX: number;
  originalDisplay: { from: number; to: number };
  originalTrim: { from: number; to: number };
}

class TrimEngine {
  private activeTrim: TrimState | null = null;

  startTrim(clipId: string, edge: TrimEdge, clientX: number): void {
    const state = engineStore.getState();
    const clip = state.clips[clipId];
    if (!clip) return;

    this.activeTrim = {
      clipId,
      edge,
      startX: clientX,
      originalDisplay: { ...clip.display },
      originalTrim: { ...clip.trim },
    };
  }

  updateTrim(clientX: number, pixelsPerMs: number): TrimState | null {
    if (!this.activeTrim) return null;
    return this.activeTrim;
  }

  endTrim(clientX: number, pixelsPerMs: number): void {
    if (!this.activeTrim) return;

    const deltaX = clientX - this.activeTrim.startX;
    const deltaMs = deltaX / pixelsPerMs;

    let newDisplay: { from: number; to: number };
    let newTrim: { from: number; to: number } | undefined;

    if (this.activeTrim.edge === "left") {
      const newFrom = Math.max(0, this.activeTrim.originalDisplay.from + deltaMs);
      newDisplay = {
        from: newFrom,
        to: this.activeTrim.originalDisplay.to,
      };
      newTrim = {
        from: this.activeTrim.originalTrim.from + deltaMs,
        to: this.activeTrim.originalTrim.to,
      };
    } else {
      newDisplay = {
        from: this.activeTrim.originalDisplay.from,
        to: Math.max(this.activeTrim.originalDisplay.from + 100, this.activeTrim.originalDisplay.to + deltaMs),
      };
    }

    engineStore.dispatch(
      trimClip(this.activeTrim.clipId, newDisplay, newTrim)
    );

    this.activeTrim = null;
  }

  cancelTrim(): void {
    this.activeTrim = null;
  }

  getActiveTrim(): TrimState | null {
    return this.activeTrim;
  }
}

export const trimEngine = new TrimEngine();
