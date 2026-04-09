/**
 * events/event-bus.ts
 * Lightweight typed event bus. No RxJS dependency.
 *
 * Usage:
 *   eventBus.on("DRAG_START", handler)
 *   eventBus.emit("DRAG_START", payload)
 *   eventBus.off("DRAG_START", handler)
 */

import type { EditorEventMap } from "./editor-events";

type EventKey = keyof EditorEventMap;
type Handler<K extends EventKey> = (payload: EditorEventMap[K]) => void;

class EventBus {
  private handlers = new Map<string, Set<Function>>();

  on<K extends EventKey>(event: K, handler: Handler<K>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    // return unsubscribe
    return () => this.off(event, handler);
  }

  off<K extends EventKey>(event: K, handler: Handler<K>): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit<K extends EventKey>(event: K, payload: EditorEventMap[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of set) {
      try {
        (h as Handler<K>)(payload);
      } catch (e) {
        console.error(`[EventBus] Handler for "${event}" threw:`, e);
      }
    }
  }

  /** Remove all handlers for an event (or all events if none specified) */
  clear(event?: EventKey): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}

export const eventBus = new EventBus();
