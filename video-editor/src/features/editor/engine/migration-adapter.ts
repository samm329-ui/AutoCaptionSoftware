/**
 * engine/migration-adapter.ts — NEW FILE
 *
 * WHAT THIS IS:
 *   Legacy shape compatibility helpers that were removed from selectors.ts
 *   to keep the main selector API clean.
 *
 *   These helpers convert engine Clip/Track shapes back into the ITrackItem
 *   shape that un-migrated consumers (Remotion player, DesignCombo timeline)
 *   still expect.
 *
 * DELETION GATE:
 *   Delete this entire file and all imports of it once:
 *     [ ] player/composition.tsx reads from engine selectors directly
 *     [ ] timeline canvas is replaced (Phase 3/4)
 *     [ ] no component imports toTrackItem or selectLegacyTrackItemsMap
 *
 * DO NOT add new consumers of this file. If you need data from the engine,
 * use selectors.ts and engine-core types directly.
 */

import type { Project, Clip } from "./engine-core";

/**
 * Convert a single engine Clip to the flat ITrackItem-compatible shape
 * that the Remotion player composition currently reads.
 *
 * IMPORTANT: opacity is stored as 0–1 in transform.opacity.
 * The legacy player expects details.opacity as 0–1 as well, so we
 * forward it there — but transform.opacity remains the authority.
 */
export function toTrackItem(clip: Clip): Record<string, unknown> {
  return {
    id:      clip.id,
    type:    clip.type,
    name:    clip.name,
    trackId: clip.trackId,
    assetId: clip.assetId,
    display: clip.display,
    trim:    clip.trim,
    details: {
      ...clip.details,
      left:    clip.transform.x,
      top:     clip.transform.y,
      rotate:  clip.transform.rotate,
      opacity: clip.transform.opacity,
      scaleX:  clip.transform.scaleX,
      scaleY:  clip.transform.scaleY,
      flipX:   clip.transform.flipX,
      flipY:   clip.transform.flipY,
    },
    playbackRate: (clip.details as Record<string, unknown>).playbackRate ?? 1,
  };
}

/**
 * Convert all clips to the legacy trackItemsMap shape.
 * Used ONLY by the Remotion player composition and the engine→useStore sync.
 */
export function selectLegacyTrackItemsMap(p: Project): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  for (const clip of Object.values(p.clips)) {
    if (clip) result[clip.id] = toTrackItem(clip);
  }
  return result;
}

/**
 * Get all clip IDs in track order (for player composition rendering).
 */
export function selectLegacyTrackItemIds(p: Project): string[] {
  const seq = p.sequences[p.rootSequenceId];
  if (!seq) return Object.keys(p.clips);
  const ids: string[] = [];
  for (const trackId of seq.trackIds) {
    const track = p.tracks[trackId];
    if (track) ids.push(...track.clipIds);
  }
  return ids;
}
