/**
 * useLayoutStore — UI-only state
 * ───────────────────────────────
 * RULE: This store owns only interface state — which panels are open, which
 * tab is active, modal visibility, tool selection, etc.
 *
 * It does NOT own clip data. The `trackItem` field here is a MIRROR of the
 * selected clip from useStore — it exists only so the right panel knows which
 * ControlItem component to render. It is never modified directly from editing
 * operations. All edits go through dispatch(EDIT_OBJECT) → useStore.
 *
 * FIXED: Removed any fields that were doubling as editor content state.
 * The only "editor" field kept is `trackItem` (read-only mirror, set by editor.tsx).
 */

import { ILayoutState } from "../interfaces/layout";
import { create } from "zustand";

const useLayoutStore = create<ILayoutState>((set) => ({
  // ── Panel / menu visibility ─────────────────────────────────────────────────
  activeMenuItem: "texts",
  showMenuItem: false,
  showControlItem: false,
  showToolboxItem: false,
  activeToolboxItem: null,
  floatingControl: null,
  drawerOpen: false,
  controItemDrawerOpen: false,
  typeControlItem: "",
  labelControlItem: "",

  // ── Crop modal ──────────────────────────────────────────────────────────────
  cropTarget: null,

  // ── Active clip mirror (READ ONLY from UI perspective) ─────────────────────
  // Set by editor.tsx when activeIds changes. Never written by edit operations.
  trackItem: null,

  // ── Setters ─────────────────────────────────────────────────────────────────
  setCropTarget: (cropTarget) => set({ cropTarget }),
  setActiveMenuItem: (activeMenuItem) => set({ activeMenuItem }),
  setShowMenuItem: (showMenuItem) => set({ showMenuItem }),
  setShowControlItem: (showControlItem) => set({ showControlItem }),
  setShowToolboxItem: (showToolboxItem) => set({ showToolboxItem }),
  setActiveToolboxItem: (activeToolboxItem) => set({ activeToolboxItem }),
  setFloatingControl: (floatingControl) => set({ floatingControl }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setTrackItem: (trackItem) => set({ trackItem }),
  setControItemDrawerOpen: (controItemDrawerOpen) => set({ controItemDrawerOpen }),
  setTypeControlItem: (typeControlItem) => set({ typeControlItem }),
  setLabelControlItem: (labelControlItem) => set({ labelControlItem }),
}));

export default useLayoutStore;
