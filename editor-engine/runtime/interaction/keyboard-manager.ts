/**
 * runtime/interaction/keyboard-manager.ts
 * Registers global keyboard shortcuts and emits them through the event bus.
 * The engine store itself handles undo/redo; UI layers handle everything else.
 */

import { eventBus } from "../../events/event-bus";
import { engineStore } from "../../state/engine-store";

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: string;
  handler: () => void;
}

const shortcuts: Shortcut[] = [];

function isMac(): boolean {
  return navigator.platform?.toUpperCase().includes("MAC") ?? false;
}

function modKey(e: KeyboardEvent): boolean {
  return isMac() ? e.metaKey : e.ctrlKey;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el as HTMLElement)?.isContentEditable === true
  );
}

function globalHandler(e: KeyboardEvent): void {
  if (isInputFocused()) return;

  // Built-in undo/redo
  if (modKey(e) && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    if (engineStore.canUndo) engineStore.undo();
    eventBus.emit("KEYBOARD_SHORTCUT", { key: "z", ctrl: true, shift: false, alt: false, meta: e.metaKey, action: "undo" });
    return;
  }
  if (modKey(e) && (e.key === "Z" || (e.key === "z" && e.shiftKey) || e.key === "y")) {
    e.preventDefault();
    if (engineStore.canRedo) engineStore.redo();
    eventBus.emit("KEYBOARD_SHORTCUT", { key: "z", ctrl: true, shift: true, alt: false, meta: e.metaKey, action: "redo" });
    return;
  }

  // Custom registered shortcuts
  for (const sc of shortcuts) {
    const ctrlMatch = sc.ctrl ? modKey(e) : !modKey(e) || !sc.ctrl;
    const shiftMatch = sc.shift ? e.shiftKey : !e.shiftKey || !sc.shift;
    const altMatch = sc.alt ? e.altKey : !e.altKey || !sc.alt;
    const keyMatch = e.key.toLowerCase() === sc.key.toLowerCase();

    if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
      e.preventDefault();
      sc.handler();
      eventBus.emit("KEYBOARD_SHORTCUT", {
        key: e.key,
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey,
        action: sc.action,
      });
      return;
    }
  }
}

let mounted = false;

export function mountKeyboardManager(): () => void {
  if (mounted) return () => {};
  mounted = true;
  window.addEventListener("keydown", globalHandler);
  return () => {
    window.removeEventListener("keydown", globalHandler);
    mounted = false;
  };
}

/** Register a custom shortcut. Returns an unregister function. */
export function registerShortcut(sc: Omit<Shortcut, never>): () => void {
  shortcuts.push(sc);
  return () => {
    const i = shortcuts.indexOf(sc);
    if (i !== -1) shortcuts.splice(i, 1);
  };
}
