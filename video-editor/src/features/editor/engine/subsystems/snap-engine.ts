/**
 * engine/subsystems/snap-engine.ts
 * 
 * Handles clip-to-clip, playhead, and grid snapping for timeline.
 */

import { engineStore, type Clip } from "../engine-core";

export interface SnapPoint {
  position: number; // in ms
  type: "clip-start" | "clip-end" | "playhead" | "grid";
  clipId?: string;
}

export interface SnapResult {
  position: number;
  snapped: boolean;
  snapType?: SnapPoint["type"];
}

export const SNAP_THRESHOLD_PX = 8;

class SnapEngine {
  private enabled: boolean = true;
  private snapToGrid: boolean = true;
  private snapToPlayhead: boolean = true;
  private snapToClips: boolean = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setSnapToGrid(enabled: boolean): void {
    this.snapToGrid = enabled;
  }

  setSnapToPlayhead(enabled: boolean): void {
    this.snapToPlayhead = enabled;
  }

  setSnapToClips(enabled: boolean): void {
    this.snapToClips = enabled;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  get snapToGrid(): boolean {
    return this.snapToGrid;
  }

  get snapToPlayhead(): boolean {
    return this.snapToPlayhead;
  }

  get snapToClips(): boolean {
    return this.snapToClips;
  }

  getSnapPoints(excludeClipId?: string): SnapPoint[] {
    const state = engineStore.getState();
    const points: SnapPoint[] = [];

    if (this.snapToPlayhead) {
      points.push({
        position: state.ui.playheadTime,
        type: "playhead",
      });
    }

    if (this.snapToClips) {
      for (const clip of Object.values(state.clips)) {
        if (clip.id === excludeClipId) continue;
        points.push({
          position: clip.display.from,
          type: "clip-start",
          clipId: clip.id,
        });
        points.push({
          position: clip.display.to,
          type: "clip-end",
          clipId: clip.id,
        });
      }
    }

    return points;
  }

  snap(position: number, pixelsPerMs: number, excludeClipId?: string): SnapResult {
    if (!this.enabled) {
      return { position, snapped: false };
    }

    const thresholdMs = SNAP_THRESHOLD_PX / pixelsPerMs;
    const snapPoints = this.getSnapPoints(excludeClipId);

    for (const point of snapPoints) {
      if (Math.abs(position - point.position) <= thresholdMs) {
        return {
          position: point.position,
          snapped: true,
          snapType: point.type,
        };
      }
    }

    if (this.snapToGrid) {
      const state = engineStore.getState();
      const fps = state.sequences[state.rootSequenceId]?.fps ?? 30;
      const frameMs = 1000 / fps;
      const gridMs = frameMs * 5;
      const snappedPosition = Math.round(position / gridMs) * gridMs;
      
      if (Math.abs(position - snappedPosition) <= thresholdMs) {
        return {
          position: snappedPosition,
          snapped: true,
          snapType: "grid",
        };
      }
    }

    return { position, snapped: false };
  }

  snapRange(from: number, to: number, pixelsPerMs: number, excludeClipId?: string): SnapResult {
    if (!this.enabled) {
      return { position: from, snapped: false };
    }

    const thresholdMs = SNAP_THRESHOLD_PX / pixelsPerMs;
    const snapPoints = this.getSnapPoints(excludeClipId);

    for (const point of snapPoints) {
      if (Math.abs(from - point.position) <= thresholdMs) {
        return { position: point.position, snapped: true, snapType: point.type };
      }
      if (Math.abs(to - point.position) <= thresholdMs) {
        return { position: point.position - (to - from), snapped: true, snapType: point.type };
      }
    }

    return { position: from, snapped: false };
  }
}

export const snapEngine = new SnapEngine();
