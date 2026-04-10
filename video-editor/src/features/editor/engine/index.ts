/**
 * engine/index.ts — FIXED
 *
 * REVIEW FIXES:
 *   - Removed legacy-bridge export. It must never be a public API surface.
 *     Import legacy-bridge directly from ./legacy-bridge in the one file
 *     that needs it (editor.tsx). Exporting it here lets new code keep
 *     depending on the old sync path.
 *   - Removed undo-engine export — that is an internal sub-engine, not a
 *     public API.
 *   - Added selectors, commands, mappers to barrel so every consumer has
 *     one clean import point and never needs deep imports.
 *   - Removed confusing type re-export aliases (ClipType, TrackType).
 *
 * PUBLIC SURFACE — everything a component should ever need:
 *   import { engineStore, useEngineSelector, updateDetails, selectActiveClip,
 *            fromTrackItem } from "../engine";
 */

// ── Core types and store ──────────────────────────────────────────────────────
export {
  engineStore,
  createEmptyProject,
  createTrack,
  nanoid,
  type Project,
  type Sequence,
  type Track,
  type Clip,
  type Transform,
  type UIState,
  type EditorCommand,
  type EngineStore,
} from "./engine-core";

// ── React context / hooks ─────────────────────────────────────────────────────
export {
  EngineProvider,
  useEngine,
  useEngineStore,
  useEngineSelector,
  useEngineDispatch,
  useEngineSelection,
  useEngineActiveId,
  useEnginePlayhead,
  useEngineZoom,
  useEngineScroll,
  useEngineDuration,
  useEngineCanvasSize,
  useEngineHistory,
} from "./engine-provider";

// ── Selectors ─────────────────────────────────────────────────────────────────
export * from "./selectors";

// ── Command builders ──────────────────────────────────────────────────────────
export * from "./commands";

// ── Mappers (migration adapters — delete after legacy runtime is fully removed) ──
export * from "./mappers";

// ── NOT exported from this barrel: ───────────────────────────────────────────
//   ./legacy-bridge  — import directly in editor.tsx only, never through here
//   ./engine-sync    — internal, no public consumers
//   ./undo-engine    — internal sub-engine
