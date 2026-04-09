"use client";

/**
 * engine-provider.tsx
 * src/features/editor/engine/engine-provider.tsx
 *
 * Creates the engine instance ONCE and exposes it through React context.
 * Every component that needs the engine reads from this context — never
 * from a module-level singleton directly.
 *
 * Why context and not just `engineStore` import?
 *   - Avoids import coupling: panels import from context, not from engine internals
 *   - Enables testing: swap the engine in tests without patching modules
 *   - Makes the migration boundary explicit: "am I using legacy or engine?"
 *
 * Usage
 * ─────
 * 1. Wrap the editor shell (editor.tsx):
 *
 *      import { EngineProvider } from "./engine/engine-provider";
 *      <EngineProvider>
 *        <EditorShell />
 *      </EngineProvider>
 *
 * 2. Read engine state anywhere inside:
 *
 *      import { useEngine, useEngineSelector } from "./engine/engine-provider";
 *
 *      // Get full project snapshot (sparingly)
 *      const project = useEngine();
 *
 *      // Derive a specific slice (preferred — avoids broad re-renders)
 *      const zoom    = useEngineSelector(p => p.ui.zoom);
 *      const clipIds = useEngineSelector(p => p.ui.selection);
 *
 * 3. Dispatch commands:
 *
 *      import { useEngineDispatch } from "./engine/engine-provider";
 *      const dispatch = useEngineDispatch();
 *      dispatch({ type: "SET_SELECTION", payload: { clipIds: ["abc"] } });
 *
 * 4. Access the raw store (for legacy-bridge.ts only):
 *
 *      import { useEngineStore } from "./engine/engine-provider";
 *      const store = useEngineStore();
 */

import React, {
  createContext,
  useContext,
  useRef,
  useSyncExternalStore,
  useCallback,
  type ReactNode,
} from "react";
import { engineStore, type Project, type EditorCommand } from "./engine-core";

// ─── Context shape ────────────────────────────────────────────────────────────

/**
 * The value provided to every consumer of EngineProvider.
 * `store` is the raw EngineStore — only legacy-bridge should use it directly.
 */
interface EngineContextValue {
  store: typeof engineStore;
}

const EngineContext = createContext<EngineContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * Mount once at the top of the editor tree.
 * Initialises the engine and makes it available to all descendants.
 *
 * The engine instance lives in a ref so React strict-mode double-invocation
 * does not create two stores.
 */
export function EngineProvider({ children }: { children: ReactNode }) {
  // useRef so the store identity is stable across re-renders and strict-mode
  const storeRef = useRef(engineStore);

  return (
    <EngineContext.Provider value={{ store: storeRef.current }}>
      {children}
    </EngineContext.Provider>
  );
}

// ─── Raw store access (for legacy-bridge only) ────────────────────────────────

/**
 * Returns the raw EngineStore.
 * Use this only in legacy-bridge.ts where you need to call
 * store.subscribe() / store.getState() directly.
 * All other consumers should use useEngineSelector / useEngineDispatch.
 */
export function useEngineStore(): typeof engineStore {
  const ctx = useContext(EngineContext);
  if (!ctx) {
    throw new Error(
      "[EngineProvider] useEngineStore called outside <EngineProvider>. " +
        "Make sure EngineProvider wraps your editor tree."
    );
  }
  return ctx.store;
}

// ─── Stable subscribe wrapper ─────────────────────────────────────────────────
//
// useSyncExternalStore requires a subscribe function with signature:
//   (onStoreChange: () => void) => () => void
//
// engineStore.subscribe receives (state, command) — we ignore the args.

function makeSubscribe(store: typeof engineStore) {
  return (onStoreChange: () => void) =>
    store.subscribe(() => onStoreChange());
}

// ─── useEngine — full project snapshot ───────────────────────────────────────

/**
 * Returns the full Project snapshot.
 * Every state change causes a re-render. Use sparingly.
 * Prefer useEngineSelector for fine-grained subscriptions.
 */
export function useEngine(): Project {
  const store = useEngineStore();
  return useSyncExternalStore(
    makeSubscribe(store),
    () => store.getState(),
    () => store.getState()
  );
}

// ─── useEngineSelector — derived slice ───────────────────────────────────────

/**
 * Subscribe to a derived slice of engine state.
 * Re-renders only when the derived value changes (referential equality).
 *
 * For arrays/objects that produce a new reference each call, pass an
 * `isEqual` comparator to avoid unnecessary re-renders.
 *
 * @example
 *   const zoom = useEngineSelector(p => p.ui.zoom);
 *   const ids  = useEngineSelector(p => p.ui.selection, shallowArrayEqual);
 */
export function useEngineSelector<T>(
  selector: (project: Project) => T,
  isEqual?: (a: T, b: T) => boolean
): T {
  const store = useEngineStore();

  // Keep the latest selector in a ref so the snapshot function always calls
  // the up-to-date selector without needing to recreate the snapshot closure.
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  // Memoised previous value — prevents returning a new reference when the
  // derived value is shallowly equal to the previous one.
  const lastRef = useRef<{ value: T } | undefined>(undefined);

  const getSnapshot = useCallback((): T => {
    const next = selectorRef.current(store.getState());

    if (lastRef.current !== undefined) {
      const prev = lastRef.current.value;
      const equal = isEqual ? isEqual(prev, next) : Object.is(prev, next);
      if (equal) return prev;
    }

    lastRef.current = { value: next };
    return next;
  }, [store, isEqual]);

  return useSyncExternalStore(
    makeSubscribe(store),
    getSnapshot,
    getSnapshot // server snapshot — same value, no server state in this engine
  );
}

// ─── useEngineDispatch ────────────────────────────────────────────────────────

/**
 * Returns a stable dispatch function for sending commands to the engine.
 *
 * @example
 *   const dispatch = useEngineDispatch();
 *   dispatch({ type: "SET_PLAYHEAD", payload: { timeMs: 1500 } });
 */
export function useEngineDispatch() {
  const store = useEngineStore();
  return useCallback(
    (command: EditorCommand) => {
      store.dispatch(command);
    },
    [store]
  );
}

// ─── Convenience selectors ────────────────────────────────────────────────────

/** Current selection as an array of clip IDs */
export function useEngineSelection(): string[] {
  return useEngineSelector((p) => p.ui.selection);
}

/** Currently active (single-selected) clip ID, or null */
export function useEngineActiveId(): string | null {
  return useEngineSelector((p) =>
    p.ui.selection.length === 1 ? p.ui.selection[0] : null
  );
}

/** Current playhead position in ms */
export function useEnginePlayhead(): number {
  return useEngineSelector((p) => p.ui.playheadTime);
}

/**
 * Current zoom factor (px/ms).
 * Default 1/300 ≈ 0.0033 — one pixel represents ~300ms at rest.
 */
export function useEngineZoom(): number {
  return useEngineSelector((p) => p.ui.zoom);
}

/** Timeline scroll offsets in px */
export function useEngineScroll(): { scrollX: number; scrollY: number } {
  return useEngineSelector((p) => ({
    scrollX: p.ui.scrollX,
    scrollY: p.ui.scrollY,
  }));
}

/** Root sequence duration in ms */
export function useEngineDuration(): number {
  return useEngineSelector((p) => {
    const seq = p.sequences[p.rootSequenceId];
    return seq?.duration ?? 0;
  });
}

/** Canvas size of the root sequence */
export function useEngineCanvasSize(): { width: number; height: number } {
  return useEngineSelector((p) => {
    const seq = p.sequences[p.rootSequenceId];
    return seq?.canvas ?? { width: 1080, height: 1920 };
  });
}

/** Undo/redo availability */
export function useEngineHistory() {
  const store = useEngineStore();
  // canUndo/canRedo are computed from history array lengths — subscribe to
  // any state change and re-check.
  const _state = useEngine(); // ensures we re-run on every dispatch
  return {
    canUndo: store.canUndo,
    canRedo: store.canRedo,
    undo: () => store.undo(),
    redo: () => store.redo(),
  };
}
