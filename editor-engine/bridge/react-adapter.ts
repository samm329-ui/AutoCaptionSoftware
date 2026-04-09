/**
 * bridge/react-adapter.ts
 *
 * React hooks that expose engine state to components.
 *
 * ─── React 18 / 19 concurrent safety ────────────────────────────────────────
 *
 * The previous version used useState + useEffect subscriptions.
 * In concurrent React those can produce "tearing" — a component reads
 * state partway through a batch, another reads a newer snapshot, and they
 * disagree for one paint cycle.
 *
 * useSyncExternalStore is the React-sanctioned fix.  It:
 *   1. Guarantees all components in a render batch read the same snapshot.
 *   2. Prevents the intermediate state visible during concurrent rendering.
 *   3. Provides a getServerSnapshot for SSR / React Server Components.
 *
 * API:
 *   useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)
 *
 * We wrap it in useEngineSelector() which also memoises the derived value
 * so unnecessary re-renders are still avoided.
 */

import {
  useSyncExternalStore,
  useCallback,
  useRef,
} from "react";

import { engineStore } from "../state/engine-store";
import type { Project, Clip, Track } from "../model/schema";
import type { EditorCommand } from "../commands";
import {
  getOrderedTracks,
  getTrackClips,
  getActiveClip,
  getSelectedClips,
  getDuration,
  getCanvasSize,
} from "../state/selectors";

// ─── Stable subscribe wrapper ─────────────────────────────────────────────────
//
// useSyncExternalStore needs a stable subscribe function reference.
// The engine store's subscribe already returns an unsubscribe function —
// exactly what React expects.

const subscribe = (callback: () => void) => {
  // engineStore.subscribe receives (state, command) → we only need () => void
  return engineStore.subscribe(() => callback());
};

// ─── Core selector hook ───────────────────────────────────────────────────────

/**
 * useEngineSelector<T>
 *
 * Subscribe to the engine store and derive a value.
 * React will re-render the component only when the selector's return value
 * changes (referential equality).
 *
 * For object/array selectors that create new references on every call,
 * use the `isEqual` parameter to supply a shallow-equal check so React
 * can bail out without extra renders.
 *
 * @param selector  - Pure function from Project → T
 * @param isEqual   - Optional equality check (default: Object.is / ===)
 *
 * @example
 *   // Primitive — no custom isEqual needed
 *   const zoom = useEngineSelector(p => p.ui.zoom);
 *
 *   // Array — prevent re-render when contents are shallowly equal
 *   const ids = useEngineSelector(
 *     p => p.ui.selection,
 *     shallowArrayEqual
 *   );
 */
export function useEngineSelector<T>(
  selector: (project: Project) => T,
  isEqual?: (a: T, b: T) => boolean
): T {
  // Keep the latest selector in a ref so the getSnapshot closure always
  // calls the current selector without needing to recreate the snapshot fn.
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  // Memoised last value — avoids returning a new reference when the
  // underlying data hasn't changed but the selector returned a new object.
  const lastValueRef = useRef<{ value: T } | undefined>(undefined);

  const getSnapshot = useCallback((): T => {
    const next = selectorRef.current(engineStore.getState());

    if (lastValueRef.current !== undefined) {
      const prev = lastValueRef.current.value;
      const equal = isEqual ? isEqual(prev, next) : prev === next;
      if (equal) return prev; // return previous reference → no re-render
    }

    lastValueRef.current = { value: next };
    return next;
  }, [isEqual]);

  // Server snapshot: return empty/default — the engine has no server state
  const getServerSnapshot = useCallback((): T => {
    return selectorRef.current(engineStore.getState());
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ─── Shared equality helpers ──────────────────────────────────────────────────

export function shallowArrayEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export function shallowObjectEqual<T extends Record<string, unknown>>(
  a: T,
  b: T
): boolean {
  if (a === b) return true;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => a[k] === b[k]);
}

// ─── Dispatch hook ────────────────────────────────────────────────────────────

/** Returns a stable dispatch function to send commands to the engine. */
export function useEngineDispatch() {
  return useCallback(
    (
      command: EditorCommand,
      options?: { skipHistory?: boolean; description?: string }
    ) => {
      engineStore.dispatch(command, options);
    },
    []
  );
}

// ─── Domain hooks ─────────────────────────────────────────────────────────────

/** All tracks in display order */
export function useOrderedTracks(): Track[] {
  return useEngineSelector(getOrderedTracks, shallowArrayEqual);
}

/** Clips for a specific track, sorted by start time */
export function useTrackClips(trackId: string): Clip[] {
  // Selector captures trackId in closure; referential stability is handled
  // by useRef inside useEngineSelector.
  return useEngineSelector(
    (p) => getTrackClips(p, trackId),
    shallowArrayEqual
  );
}

/** Currently selected clip IDs */
export function useSelectionIds(): string[] {
  return useEngineSelector((p) => p.ui.selection, shallowArrayEqual);
}

/** Selected clips (full objects) */
export function useSelectedClips(): Clip[] {
  return useEngineSelector(getSelectedClips, shallowArrayEqual);
}

/** The single active clip (when exactly one is selected) */
export function useActiveClip(): Clip | null {
  return useEngineSelector(getActiveClip);
}

/** Playhead position in ms */
export function usePlayheadTime(): number {
  return useEngineSelector((p) => p.ui.playheadTime);
}

/**
 * Timeline zoom factor in px/ms.
 * Default 1/300 ≈ 0.0033 (1px = 300ms at rest).
 * Higher = zoomed in, lower = zoomed out.
 */
export function useZoom(): number {
  return useEngineSelector((p) => p.ui.zoom);
}

/** Timeline scroll offsets in px */
export function useScroll(): { scrollX: number; scrollY: number } {
  return useEngineSelector(
    (p) => ({ scrollX: p.ui.scrollX, scrollY: p.ui.scrollY }),
    shallowObjectEqual as (
      a: { scrollX: number; scrollY: number },
      b: { scrollX: number; scrollY: number }
    ) => boolean
  );
}

/** Sequence duration in ms */
export function useDuration(): number {
  return useEngineSelector(getDuration);
}

/** Canvas size of the root sequence */
export function useCanvasSize(): { width: number; height: number } {
  return useEngineSelector(
    getCanvasSize,
    shallowObjectEqual as (
      a: { width: number; height: number },
      b: { width: number; height: number }
    ) => boolean
  );
}

/** Undo/redo availability and actions */
export function useHistory() {
  // canUndo / canRedo are derived from history array lengths,
  // which change on every dispatch — booleans are primitives so
  // no custom equality needed.
  const canUndo = useEngineSelector(() => engineStore.canUndo);
  const canRedo = useEngineSelector(() => engineStore.canRedo);

  return {
    canUndo,
    canRedo,
    undo: () => engineStore.undo(),
    redo: () => engineStore.redo(),
  };
}

/** Full project snapshot — causes re-render on any state change. Use sparingly. */
export function useProjectSnapshot(): Project {
  return useEngineSelector((p) => p);
}
