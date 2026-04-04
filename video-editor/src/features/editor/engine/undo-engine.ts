/**
 * Undo/Redo Engine
 * Uses the Command Pattern: every user action is an object with execute() + undo().
 * Only atomic/final actions are committed (drag end, not every drag frame).
 *
 * Usage:
 *   const cmd = new EditClipCommand(before, after, dispatch);
 *   historyStore.commit(cmd);
 *
 *   historyStore.undo();  // Ctrl+Z
 *   historyStore.redo();  // Ctrl+Shift+Z
 */

import { create } from "zustand";
import { dispatch as editorDispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";

// ─── Command Interface ────────────────────────────────────────────────────────

export interface ICommand {
  /** Human-readable description for debug */
  description: string;
  execute(): void;
  undo(): void;
}

// ─── Generic Edit Command ─────────────────────────────────────────────────────

/**
 * A command that applies a set of EDIT_OBJECT mutations and can reverse them.
 *
 * @param description - Human label
 * @param forward - Mutations to apply (id → partial item)
 * @param backward - Mutations to revert (id → previous partial item)
 */
export class EditObjectCommand implements ICommand {
  description: string;
  private forward: Record<string, any>;
  private backward: Record<string, any>;

  constructor(
    description: string,
    forward: Record<string, any>,
    backward: Record<string, any>
  ) {
    this.description = description;
    this.forward = forward;
    this.backward = backward;
  }

  execute(): void {
    editorDispatch(EDIT_OBJECT, { payload: this.forward });
  }

  undo(): void {
    editorDispatch(EDIT_OBJECT, { payload: this.backward });
  }
}

/**
 * Helper: Given a current state snapshot and a mutations map,
 * build the backward mutations needed to undo.
 */
export function buildBackwardMutations(
  trackItemsMap: Record<string, any>,
  forwardMutations: Record<string, any>
): Record<string, any> {
  const backward: Record<string, any> = {};
  for (const id of Object.keys(forwardMutations)) {
    const current = trackItemsMap[id];
    if (current) {
      // Snapshot the relevant fields from current state
      backward[id] = {
        display: current.display ? { ...current.display } : undefined,
        trim: current.trim ? { ...current.trim } : undefined,
        details: current.details ? { ...current.details } : undefined,
      };
    }
  }
  return backward;
}

// ─── Custom Commands ──────────────────────────────────────────────────────────

export class AddItemCommand implements ICommand {
  description = "Add item";
  private eventKey: string;
  private payload: any;
  private deleteEventKey: string;
  private itemId: string;

  constructor(
    eventKey: string,
    payload: any,
    deleteEventKey: string,
    itemId: string
  ) {
    this.eventKey = eventKey;
    this.payload = payload;
    this.deleteEventKey = deleteEventKey;
    this.itemId = itemId;
    this.description = `Add ${payload.type ?? "item"}`;
  }

  execute(): void {
    editorDispatch(this.eventKey, { payload: this.payload });
  }

  undo(): void {
    editorDispatch(this.deleteEventKey, { payload: { id: this.itemId } });
  }
}

export class DeleteItemCommand implements ICommand {
  description = "Delete item";
  private deleteEventKey: string;
  private restoreEventKey: string;
  private itemSnapshot: any;
  private trackId: string;

  constructor(
    deleteEventKey: string,
    restoreEventKey: string,
    itemSnapshot: any,
    trackId: string
  ) {
    this.deleteEventKey = deleteEventKey;
    this.restoreEventKey = restoreEventKey;
    this.itemSnapshot = itemSnapshot;
    this.trackId = trackId;
    this.description = `Delete ${itemSnapshot.type ?? "item"}`;
  }

  execute(): void {
    editorDispatch(this.deleteEventKey, {
      payload: { id: this.itemSnapshot.id },
    });
  }

  undo(): void {
    // Re-add the item with all its original properties
    editorDispatch(this.restoreEventKey, {
      payload: { ...this.itemSnapshot },
      options: { resourceId: this.trackId },
    });
  }
}

// ─── History Store ────────────────────────────────────────────────────────────

const MAX_HISTORY = 100;

interface IHistoryStore {
  /** Stack of past commands (index 0 = oldest) */
  past: ICommand[];
  /** Stack of future commands (index 0 = most recently undone) */
  future: ICommand[];
  /** Commit a new command, clearing redo stack */
  commit: (cmd: ICommand) => void;
  /** Undo last action */
  undo: () => void;
  /** Redo last undone action */
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  /** Clear all history */
  clear: () => void;
}

export const useHistoryStore = create<IHistoryStore>((set, get) => ({
  past: [],
  future: [],

  commit: (cmd: ICommand) => {
    set((state) => {
      const newPast = [...state.past, cmd];
      // Cap history at MAX_HISTORY
      if (newPast.length > MAX_HISTORY) newPast.shift();
      return {
        past: newPast,
        future: [], // clear redo stack on new action
      };
    });
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return;
    const last = past[past.length - 1];
    last.undo();
    set({
      past: past.slice(0, -1),
      future: [last, ...future],
    });
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    next.execute();
    set({
      past: [...past, next],
      future: future.slice(1),
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clear: () => set({ past: [], future: [] }),
}));

// ─── Keyboard Shortcut Hook ───────────────────────────────────────────────────

import { useEffect } from "react";

/**
 * Wire keyboard shortcuts Ctrl+Z / Ctrl+Shift+Z to history store.
 * Drop this hook anywhere inside the editor component tree.
 */
export function useUndoRedoShortcuts(): void {
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (!modKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        if (canRedo()) redo();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, canUndo, canRedo]);
}
