/**
 * state/engine-store.ts
 * The canonical engine store. One instance, one source of truth.
 *
 * API:
 *   engineStore.dispatch(command)     — apply a command (with history)
 *   engineStore.getState()            — read current project state
 *   engineStore.subscribe(listener)   — react to state changes
 *   engineStore.undo() / .redo()      — traverse history
 *
 * Does NOT depend on Zustand — this is pure TS so it can be tested
 * without a React environment. A thin Zustand adapter is in bridge/.
 */

import type { Project } from "../model/schema";
import type { EditorCommand } from "../commands";
import { reducer } from "./reducer";
import { eventBus } from "../events/event-bus";
import { validateCommand } from "../validation/guards";
import { createEmptyProject } from "./factory";

// ─── History Entry ────────────────────────────────────────────────────────────

interface HistoryEntry {
  /** Snapshot BEFORE the command was applied */
  before: Project;
  /** The command that was applied */
  command: EditorCommand;
  /** Human-readable description */
  description?: string;
}

const MAX_HISTORY = 120;

// ─── Store ────────────────────────────────────────────────────────────────────

export type StoreListener = (state: Project, command: EditorCommand | null) => void;

export class EngineStore {
  private state: Project;
  private past: HistoryEntry[] = [];
  private future: EditorCommand[] = [];
  private listeners: Set<StoreListener> = new Set();
  private batchDepth = 0;
  private batchedBefore: Project | null = null;

  constructor(initialState?: Project) {
    this.state = initialState ?? createEmptyProject();
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  getState(): Project {
    return this.state;
  }

  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Dispatch a command. Validates → applies → records history → notifies.
   *
   * @param command - The command to apply
   * @param options.skipHistory - If true, command is applied but NOT recorded in undo stack
   * @param options.description - Label shown in undo history UI
   */
  dispatch(
    command: EditorCommand,
    options: { skipHistory?: boolean; description?: string } = {}
  ): void {
    // 1. Validate payload
    const validationError = validateCommand(command);
    if (validationError) {
      console.warn(`[EngineStore] Rejected command ${command.type}: ${validationError}`);
      eventBus.emit("COMMAND_REJECTED", { command, reason: validationError });
      return;
    }

    // 2. Snapshot before mutation
    const before = this.state;

    // 3. Apply reducer
    const next = reducer(this.state, command);
    if (next === this.state) return; // nothing changed

    // 4. Record history (unless skipped)
    if (!options.skipHistory) {
      this.recordHistory({ before, command, description: options.description });
    }

    // 5. Update state
    this.state = next;

    // 6. Emit engine event for bus listeners
    eventBus.emit("STATE_CHANGED", { command, state: next });

    // 7. Notify direct subscribers
    this.notify(command);
  }

  /**
   * Begin a batch — multiple dispatches grouped as one undo step.
   * Call endBatch() to finalise.
   */
  beginBatch(): void {
    if (this.batchDepth === 0) {
      this.batchedBefore = this.state;
    }
    this.batchDepth++;
  }

  endBatch(description?: string): void {
    if (this.batchDepth <= 0) return;
    this.batchDepth--;

    if (this.batchDepth === 0 && this.batchedBefore) {
      // If state changed during batch, record one history entry
      if (this.batchedBefore !== this.state) {
        this.past.push({
          before: this.batchedBefore,
          command: { type: "LOAD_PROJECT", payload: { project: this.state } },
          description: description ?? "Batch operation",
        });
        if (this.past.length > MAX_HISTORY) this.past.shift();
        this.future = [];
      }
      this.batchedBefore = null;
    }
  }

  // ─── History ─────────────────────────────────────────────────────────────

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): void {
    if (this.past.length === 0) return;
    const entry = this.past[this.past.length - 1];
    this.future.unshift(entry.command);
    this.past.pop();
    this.state = entry.before;
    eventBus.emit("STATE_CHANGED", { command: null, state: this.state });
    this.notify(null);
  }

  redo(): void {
    if (this.future.length === 0) return;
    const command = this.future[0];
    this.future.shift();
    const before = this.state;
    const next = reducer(this.state, command);
    this.past.push({ before, command });
    if (this.past.length > MAX_HISTORY) this.past.shift();
    this.state = next;
    eventBus.emit("STATE_CHANGED", { command, state: next });
    this.notify(command);
  }

  clearHistory(): void {
    this.past = [];
    this.future = [];
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private recordHistory(entry: HistoryEntry): void {
    if (this.batchDepth > 0) return; // batching — don't record individual commands
    this.past.push(entry);
    if (this.past.length > MAX_HISTORY) this.past.shift();
    this.future = []; // new action clears redo stack
  }

  private notify(command: EditorCommand | null): void {
    const state = this.state;
    for (const listener of this.listeners) {
      try {
        listener(state, command);
      } catch (e) {
        console.error("[EngineStore] Listener threw:", e);
      }
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const engineStore = new EngineStore();
