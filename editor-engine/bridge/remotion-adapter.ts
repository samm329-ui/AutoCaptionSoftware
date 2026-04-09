/**
 * bridge/remotion-adapter.ts
 *
 * Converts the engine's canonical Project state into the props that
 * the existing Remotion-based player/composition components expect.
 *
 * The Remotion layer (player/, composition.tsx, sequence-item.tsx) stays STABLE.
 * Only this adapter changes as the engine evolves.
 */

import type { Project, Clip, Track, Caption } from "../model/schema";
import { getOrderedTracks, getTrackClips, getSortedCaptions } from "../state/selectors";

// ─── Remotion-compatible prop shapes ─────────────────────────────────────────
// These mirror the existing ITrackItem / ITrack / IComposition shapes that
// the current composition.tsx and sequence-item.tsx components accept.

export interface RemotionTrackItem {
  id: string;
  type: string;
  name?: string;
  display: { from: number; to: number };
  trim: { from: number; to: number };
  details: Record<string, unknown>;
  transform?: {
    x?: number;
    y?: number;
    scale?: number;
    rotate?: number;
    opacity?: number;
    flipX?: boolean;
    flipY?: boolean;
  };
  animations?: unknown[];
}

export interface RemotionTrack {
  id: string;
  type: string;
  order: number;
  items: string[];
}

export interface RemotionCompositionProps {
  trackItemsMap: Record<string, RemotionTrackItem>;
  tracks: RemotionTrack[];
  trackItemIds: string[];
  transitionsMap: Record<string, unknown>;
  transitionIds: string[];
  captions: ReturnType<typeof captionsToRemotionCaptions>;
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
}

// ─── Converter ────────────────────────────────────────────────────────────────

/**
 * Convert a Project snapshot into the props expected by the Remotion composition.
 * Call this inside a useMemo() in the player wrapper component.
 */
export function projectToRemotionProps(project: Project): RemotionCompositionProps {
  const seq = project.sequences[project.rootSequenceId];
  const fps = seq?.fps ?? 30;
  const durationInFrames = Math.ceil(((seq?.duration ?? 10000) / 1000) * fps);

  const orderedTracks = getOrderedTracks(project);

  const trackItemsMap: Record<string, RemotionTrackItem> = {};
  const trackItemIds: string[] = [];

  for (const track of orderedTracks) {
    const clips = getTrackClips(project, track.id);
    for (const clip of clips) {
      trackItemIds.push(clip.id);
      trackItemsMap[clip.id] = clipToRemotionItem(clip);
    }
  }

  const remotionTracks: RemotionTrack[] = orderedTracks.map((t) => ({
    id: t.id,
    type: t.type,
    order: t.order,
    items: t.clipIds,
  }));

  return {
    trackItemsMap,
    tracks: remotionTracks,
    trackItemIds,
    transitionsMap: project.transitions as Record<string, unknown>,
    transitionIds: Object.keys(project.transitions),
    captions: captionsToRemotionCaptions(getSortedCaptions(project)),
    fps,
    durationInFrames,
    width: seq?.canvas.width ?? 1080,
    height: seq?.canvas.height ?? 1920,
  };
}

function clipToRemotionItem(clip: Clip): RemotionTrackItem {
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
      flipX: clip.transform.flipX,
      flipY: clip.transform.flipY,
    },
  };
}

function captionsToRemotionCaptions(captions: Caption[]) {
  return captions.map((c) => ({
    id: c.id,
    start: c.start,
    end: c.end,
    text: c.text,
    words: c.words,
    style: c.style,
    animationPreset: c.animationPreset,
  }));
}

// ─── Frame / time helpers ────────────────────────────────────────────────────

/** Convert a playhead time in ms to a Remotion frame number */
export function timeMsToFrame(timeMs: number, fps: number): number {
  return Math.floor((timeMs / 1000) * fps);
}

/** Convert a Remotion frame number to ms */
export function frameToTimeMs(frame: number, fps: number): number {
  return (frame / fps) * 1000;
}
