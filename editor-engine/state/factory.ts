/**
 * state/factory.ts
 * Helper factories for creating default project and entity shapes.
 */

import type { Project, Sequence, Track, TrackType } from "../model/schema";
import { nanoid } from "../utils/id";

export function createEmptyProject(overrides?: Partial<Project>): Project {
  const seqId = nanoid();
  const seq: Sequence = {
    id: seqId,
    name: "Main",
    duration: 10000,
    fps: 30,
    canvas: { width: 1080, height: 1920 },
    trackIds: [],
    background: { type: "color", value: "#000000" },
  };

  return {
    id: nanoid(),
    name: "Untitled Project",
    version: 1,
    rootSequenceId: seqId,
    sequences: { [seqId]: seq },
    tracks: {},
    clips: {},
    assets: {},
    effects: {},
    transitions: {},
    captions: {},
    keyframes: {},
    markers: {},
    ui: {
      selection: [],
      playheadTime: 0,
      // zoom = px/ms.  1/300 means 1px = 300ms at rest (default timeline scale).
      zoom: 1 / 300,
      scrollX: 0,
      scrollY: 0,
      timelineVisible: true,
    },
    ...overrides,
  };
}

export function createTrack(
  type: TrackType,
  overrides?: Partial<Track>
): Track {
  return {
    id: nanoid(),
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    order: 0,
    locked: false,
    muted: false,
    hidden: false,
    clipIds: [],
    ...overrides,
  };
}
