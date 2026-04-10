/**
 * hooks/player-bus.ts — NEW FILE
 *
 * Centralized player event bus module.
 * No React dependencies and no side effects on import.
 */

export type PlayerEvent =
  | { type: "SEEK"; timeMs: number }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "TOGGLE_PLAY" }
  | { type: "SEEK_BY_FRAMES"; frames: number };

type Listener = (event: PlayerEvent) => void;

const listeners = new Set<Listener>();

export function emitPlayerEvent(event: PlayerEvent): void {
  for (const fn of listeners) {
    try { fn(event); } catch { /* ignore per-listener errors */ }
  }
}

export function onPlayerEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const playerSeek = (timeMs: number): void =>
  emitPlayerEvent({ type: "SEEK", timeMs });

export const playerPlay = (): void =>
  emitPlayerEvent({ type: "PLAY" });

export const playerPause = (): void =>
  emitPlayerEvent({ type: "PAUSE" });

export const playerTogglePlay = (): void =>
  emitPlayerEvent({ type: "TOGGLE_PLAY" });

export const playerSeekByFrames = (frames: number): void =>
  emitPlayerEvent({ type: "SEEK_BY_FRAMES", frames });
