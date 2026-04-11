/**
 * engine/subsystems/drag-engine.ts
 * 
 * Pure engine-based drag handling for timeline clips.
 * No state management - just dispatches MOVE_CLIP commands.
 */

import { engineStore, type Clip } from "../engine-core";
import { moveClip } from "../commands";

export interface DragState {
  clipId: string;
  startX: number;
  originalDisplay: { from: number; to: number };
  trackId: string;
}

class DragEngine {
  private activeDrag: DragState | null = null;

  startDrag(clipId: string, clientX: number): void {
    const state = engineStore.getState();
    const clip = state.clips[clipId];
    if (!clip) return;

    this.activeDrag = {
      clipId,
      startX: clientX,
      originalDisplay: { ...clip.display },
      trackId: clip.trackId,
    };
  }

  updateDrag(clientX: number): DragState | null {
    if (!this.activeDrag) return null;
    return this.activeDrag;
  }

  endDrag(clientX: number, pixelsPerMs: number): void {
    if (!this.activeDrag) return;

    const deltaX = clientX - this.activeDrag.startX;
    const deltaMs = deltaX / pixelsPerMs;
    const newFrom = Math.max(0, this.activeDrag.originalDisplay.from + deltaMs);

    engineStore.dispatch(
      moveClip(this.activeDrag.clipId, newFrom, this.activeDrag.trackId)
    );

    this.activeDrag = null;
  }

  cancelDrag(): void {
    this.activeDrag = null;
  }

  getActiveDrag(): DragState | null {
    return this.activeDrag;
  }
}

export const dragEngine = new DragEngine();
