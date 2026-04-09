/**
 * ui/StoreInitializer.tsx
 *
 * Drop this component into the editor tree ONCE to wire the legacy
 * @designcombo events into the new engine store during migration.
 *
 * Usage (replace or augment existing store-initializer.tsx):
 *
 *   // In editor.tsx or layout.tsx:
 *   import EngineStoreInitializer from "@/editor-engine/ui/StoreInitializer";
 *   ...
 *   <EngineStoreInitializer>
 *     {children}
 *   </EngineStoreInitializer>
 */

"use client";

import { useEffect } from "react";
import { filter, subject } from "@designcombo/events";
import { applyLegacyUpdate } from "../bridge/legacy-adapter";
import { mountKeyboardManager } from "../runtime/interaction/keyboard-manager";

const LEGACY_SYNC_KEYS = [
  "ADD_VIDEO", "ADD_AUDIO", "ADD_IMAGE", "ADD_TEXT",
  "ADD_CAPTIONS", "ADD_ITEMS", "ADD_TRANSITION",
  "EDIT_OBJECT", "EDIT_TRACK",
  "LAYER_DELETE", "LAYER_CLONE", "LAYER_SELECTION",
  "DESIGN_LOAD", "DESIGN_RESIZE",
  "HISTORY_UNDO", "HISTORY_REDO",
];

let syncing = false;

export default function EngineStoreInitializer({
  children,
}: {
  children?: React.ReactNode;
}) {
  useEffect(() => {
    if (syncing) return;
    syncing = true;

    // Wire @designcombo event bus → engine store
    const sub = subject
      .pipe(filter(({ key }: { key: string }) => LEGACY_SYNC_KEYS.includes(key)))
      .subscribe((event: { key: string; value?: { payload?: unknown } }) => {
        applyLegacyUpdate(event.key, event.value?.payload, { skipHistory: false });
      });

    // Mount keyboard shortcuts
    const unmountKeys = mountKeyboardManager();

    return () => {
      sub.unsubscribe();
      unmountKeys();
      syncing = false;
    };
  }, []);

  return <>{children}</>;
}
