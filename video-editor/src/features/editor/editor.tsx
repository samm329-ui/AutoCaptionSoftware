"use client";

/**
 * editor.tsx — engine-first editor shell
 *
 * This file now bootstraps the editor from the new engine only.
 * A thin engine-backed compatibility adapter is kept for un-migrated
 * consumers inside the app, but DesignCombo is no longer part of the
 * runtime path here.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import type { ReactNode, RefObject } from "react";

// Engine
import { EngineProvider } from "./engine/engine-provider";
import {
  engineStore,
  createEmptyProject,
  type Project,
  type Clip,
  type Track,
} from "./engine/engine-core";
import { fromTrack, fromTrackItem } from "./engine/mappers";
import {
  selectLegacyTrackItemIds,
  selectLegacyTrackItemsMap,
} from "./engine/migration-adapter";
import { setPlayhead, setScroll, setSelection, setZoom } from "./engine/commands";

// Store + hooks
import useStore from "./store/use-store";
import useDataState from "./store/use-data-state";
import useLayoutStore from "./store/use-layout-store";
import useTimelineEvents from "./hooks/use-timeline-events";
import useAutoSequenceDetector from "./hooks/use-auto-sequence-detector";
import { useKeyframePlayback } from "./hooks/use-keyframe-playback";
import { useMarkerShortcuts } from "./engine/marker-engine";

// Layout
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

// Feature components
import Timeline from "./timeline";
import Scene from "./scene";
import { SceneRef } from "./scene/scene.types";
import Navbar from "./navbar";
import { ControlItem } from "./control-item";
import ControlItemHorizontal from "./control-item-horizontal";
import CropModal from "./crop-modal/crop-modal";
import MenuList from "./menu-list";
import FloatingControl from "./control-item/floating-controls/floating-control";
import MediaToolbar from "./media-toolbar";
import ProjectPanel from "./panels/project-panel";
import EffectControlsPanel from "./panels/effect-controls-panel";
import SourceControlPanel from "./panels/source-control-panel";

// Fonts
import { getCompactFontData, loadFonts } from "./utils/fonts";
import { SECONDARY_FONT, SECONDARY_FONT_URL } from "./constants/constants";
import { FONTS } from "./data/fonts";

// ──────────────────────────────────────────────────────────────────────────────
// Project persistence

const PROJECT_STORAGE_KEY = "acs_project_v1";

function saveProjectToStorage(project: Project): void {
  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
  } catch {
    // storage unavailable / quota exceeded
  }
}

function loadProjectFromStorage(): Project | null {
  try {
    const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Project>;
    if (parsed && typeof parsed === "object" && parsed.clips && parsed.tracks && parsed.sequences) {
      return parsed as Project;
    }
    return null;
  } catch {
    return null;
  }
}

function buildProjectFromLegacyPayload(payload: Record<string, unknown>): Project {
  const current = engineStore.getState();
  const seq = current.sequences[current.rootSequenceId];

  const rawTracks = Array.isArray(payload.tracks) ? payload.tracks : [];
  const rawItemsMap = (payload.trackItemsMap ?? {}) as Record<string, unknown>;

  const tracks: Record<string, Track> = {};
  const clips: Record<string, Clip> = {};

  for (const raw of rawTracks) {
    const track = fromTrack(raw);
    if (!track) continue;
    tracks[track.id] = { ...track, clipIds: [...track.clipIds] };
  }

  for (const [id, raw] of Object.entries(rawItemsMap)) {
    const clip = fromTrackItem({ ...(raw as object), id }, current.clips[id]);
    if (!clip) continue;
    clips[clip.id] = {
      ...clip,
      appliedEffects: [...clip.appliedEffects],
      effectIds: [...clip.effectIds],
      keyframeIds: [...clip.keyframeIds],
    };
  }

  for (const clip of Object.values(clips)) {
    if (!tracks[clip.trackId]) {
      tracks[clip.trackId] = {
        id: clip.trackId,
        type:
          clip.type === "audio"
            ? "audio"
            : clip.type === "caption"
              ? "caption"
              : clip.type === "text"
                ? "text"
                : clip.type === "overlay"
                  ? "overlay"
                  : "video",
        name: clip.trackId,
        order: Object.keys(tracks).length,
        locked: false,
        muted: false,
        hidden: false,
        clipIds: [],
      };
    }
    tracks[clip.trackId].clipIds.push(clip.id);
  }

  for (const track of Object.values(tracks)) {
    track.clipIds.sort((a, b) => {
      const ca = clips[a];
      const cb = clips[b];
      return (ca?.display.from ?? 0) - (cb?.display.from ?? 0);
    });
  }

  const orderedTrackIds = Object.values(tracks)
    .sort((a, b) => a.order - b.order)
    .map((t) => t.id);

  return {
    ...current,
    tracks,
    clips,
    sequences: {
      ...current.sequences,
      [current.rootSequenceId]: {
        ...seq,
        trackIds: orderedTrackIds.length > 0 ? orderedTrackIds : seq.trackIds,
        canvas: (payload.size as any) ?? seq.canvas,
        duration: typeof payload.duration === "number" ? payload.duration : seq.duration,
        fps: typeof payload.fps === "number" ? payload.fps : seq.fps,
        background: (payload.background as any) ?? seq.background,
      },
    },
    ui: {
      ...current.ui,
      playheadTime: typeof payload.playheadTime === "number" ? payload.playheadTime : current.ui.playheadTime,
      zoom: typeof payload.zoom === "number" ? payload.zoom : current.ui.zoom,
      scrollX: typeof payload.scrollX === "number" ? payload.scrollX : current.ui.scrollX,
      scrollY: typeof payload.scrollY === "number" ? payload.scrollY : current.ui.scrollY,
    },
  };
}

type LegacySnapshot = {
  trackItemsMap: Record<string, unknown>;
  tracks: Record<string, unknown>[];
  trackItemIds: string[];
  activeIds: string[];
  duration: number;
  fps: number;
  size: { width: number; height: number };
  background: { type: "color" | "image"; value: string };
  scroll: { left: number; top: number };
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  compositions: unknown[];
};

type LegacyStateListener = (state: LegacySnapshot) => void;

/**
 * Engine-backed compatibility adapter.
 *
 * Temporary bridge for editor children that still expect a legacy state adapter-like
 * object. It reads from the engine and writes back to the engine only.
 */
class LegacyStateAdapter {
  private listeners = new Set<LegacyStateListener>();
  public state!: any;

  constructor() {
    // Create state object with all needed subscriptions
    this.state = this.createStateObject();
    
    engineStore.subscribe(() => {
      const snap = this.getState();
      for (const listener of this.listeners) {
        try {
          listener(snap);
        } catch {
          // ignore subscriber failures
        }
      }
    });
  }

  private createStateObject() {
    const self = this;
    // Create a state object that handles ANY method call
    const stateObj: any = {};
    
    // Generic handler that catches any subscribeTo* method
    const mockSubscribe = () => ({ unsubscribe: () => {} });
    
    // Set up a proxy to handle any method call
    return new Proxy(stateObj, {
      get(target, prop) {
        if (prop in target) return target[prop];
        // For any property, return a function that returns unsubscribe mock
        return mockSubscribe;
      },
      has(target, prop) {
        return true; // Pretend we have any property
      }
    });
  }

  getState(): LegacySnapshot {
    return snapshotLegacyState(engineStore.getState());
  }

  subscribeToState(listener: LegacyStateListener): () => void {
    this.listeners.add(listener);
    try {
      listener(this.getState());
    } catch {
      // ignore initial emit failures
    }
    return () => this.listeners.delete(listener);
  }

  // Explicit method for state object
  subscribeToActiveIds(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToTracks(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToUpdateTracks(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToTrackItems(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToItems(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToDuration(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToScale(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToUpdateStateDetails(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToUpdateTrackItem(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToTrackItemTiming(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToAddOrRemoveItems(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToUpdateItemDetails(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToUpdateAnimations(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToAnimations(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToTransitions(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToUpdateTransitions(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToProject(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToComposition(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToUpdateComposition(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToSize(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToBackground(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToRender(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToRuler(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToPlayhead(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToPreview(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToCanvas(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToClip(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToUpdateClip(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToTrackItemTiming(...args: any[]) { return { unsubscribe: () => {} }; }
  subscribeToTrackItemCache(...args: any[]) { return { unsubscribe: () => {} }; }

  updateState(
    patch: Record<string, unknown>,
    opts?: { updateHistory?: boolean; skipHistory?: boolean }
  ): void {
    if (!patch || typeof patch !== "object") return;

    const state = engineStore.getState();

    if (Array.isArray((patch as any).activeIds)) {
      engineStore.dispatch(setSelection((patch as any).activeIds as string[]), {
        skipHistory: !!opts?.skipHistory,
      });
      return;
    }

    if (Array.isArray((patch as any).selection)) {
      engineStore.dispatch(setSelection((patch as any).selection as string[]), {
        skipHistory: !!opts?.skipHistory,
      });
      return;
    }

    if (typeof (patch as any).scrollX === "number" || typeof (patch as any).scrollY === "number") {
      engineStore.dispatch(
        setScroll((patch as any).scrollX, (patch as any).scrollY),
        { skipHistory: !!opts?.skipHistory }
      );
    }
    if (typeof (patch as any).zoom === "number") {
      engineStore.dispatch(setZoom((patch as any).zoom), { skipHistory: !!opts?.skipHistory });
    }
    if (typeof (patch as any).playheadTime === "number") {
      engineStore.dispatch(setPlayhead((patch as any).playheadTime), { skipHistory: !!opts?.skipHistory });
    }

    if (
      (patch as any).trackItemsMap ||
      (patch as any).tracks ||
      (patch as any).duration != null ||
      (patch as any).fps != null ||
      (patch as any).size ||
      (patch as any).background
    ) {
      const next = buildProjectFromLegacyPayload({
        trackItemsMap: (patch as any).trackItemsMap ?? selectLegacyTrackItemsMap(state),
        tracks: (patch as any).tracks ?? Object.values(state.tracks),
        duration: (patch as any).duration ?? state.sequences[state.rootSequenceId]?.duration,
        fps: (patch as any).fps ?? state.sequences[state.rootSequenceId]?.fps,
        size: (patch as any).size ?? state.sequences[state.rootSequenceId]?.canvas,
        background: (patch as any).background ?? state.sequences[state.rootSequenceId]?.background,
        scrollX: (patch as any).scrollX ?? state.ui.scrollX,
        scrollY: (patch as any).scrollY ?? state.ui.scrollY,
        zoom: (patch as any).zoom ?? state.ui.zoom,
        playheadTime: (patch as any).playheadTime ?? state.ui.playheadTime,
      });

      engineStore.dispatch(
        { type: "LOAD_PROJECT", payload: { project: next } },
        { skipHistory: !!opts?.skipHistory }
      );
    }
  }

  dispatch(action: Record<string, unknown>, opts?: { updateHistory?: boolean; skipHistory?: boolean }): void {
    this.updateState(action, opts);
  }

  // Compatibility method for CanvasTimeline
  subscribeToActiveIds(callback: (ids: string[]) => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = (state) => {
      callback(state.activeIds);
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // NEW - subscribeToTracks directly (also needed) - returns mock
  subscribeToTracks(callback?: (tracks: any[]) => void): any {
    if (callback) {
      const listener: LegacyStateListener = (state) => {
        callback(state.tracks);
      };
      this.listeners.add(listener);
      return { unsubscribe: () => this.listeners.delete(listener) };
    }
    return { unsubscribe: () => {} };
  }

  // NEW - subscribeToItems for state - returns mock
  subscribeToItems(callback?: (items: any) => void): any {
    if (callback) {
      const listener: LegacyStateListener = (state) => {
        callback(state.trackItemsMap);
      };
      this.listeners.add(listener);
      return { unsubscribe: () => this.listeners.delete(listener) };
    }
    return { unsubscribe: () => {} };
  }

  // NEW - subscribeToState - alias for subscribeToState
  subscribeToStateAlias(listener: LegacyStateListener): () => void {
    this.listeners.add(listener);
    try {
      listener(this.getState());
    } catch {}
    return () => this.listeners.delete(listener);
  }

  // Compatibility method for CanvasTimeline - subscribeToTracks (not UpdateTracks)
  subscribeToTracks(callback: (tracks: any[]) => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = (state) => {
      callback(state.tracks);
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // Compatibility method for CanvasTimeline - subscribeToTrackItems
  subscribeToTrackItems(callback: (items: any) => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = (state) => {
      callback(state.trackItemsMap);
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // Compatibility method for CanvasTimeline - subscribeToUpdateTrackItem
  subscribeToUpdateTrackItem(callback: () => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = () => {
      callback();
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // Compatibility method for CanvasTimeline - subscribeToUpdateTracks
  subscribeToUpdateTracks(callback: (tracks: any[]) => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = (state) => {
      callback(state.tracks);
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // Compatibility method for CanvasTimeline - subscribeToAddOrRemoveItems
  subscribeToAddOrRemoveItems(callback: () => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = () => {
      callback();
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // Compatibility method for CanvasTimeline - subscribeToUpdateItemDetails
  subscribeToUpdateItemDetails(callback: () => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = () => {
      callback();
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // Compatibility method for CanvasTimeline - subscribeToTrackItems
  subscribeToTrackItems(callback: (items: any) => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = (state) => {
      callback(state.trackItemsMap);
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // Compatibility method for CanvasTimeline - subscribeToItems
  subscribeToItems(callback: (items: any[]) => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = (state) => {
      callback(state.trackItemIds);
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // Compatibility method for CanvasTimeline - subscribeToDuration
  subscribeToDuration(callback: (duration: number) => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = (state) => {
      callback(state.duration);
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // Compatibility method for CanvasTimeline - subscribeToScale
  subscribeToScale(callback: (scale: any) => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = (state) => {
      callback(state.scale);
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // Compatibility method for CanvasTimeline - subscribeToUpdateStateDetails
  subscribeToUpdateStateDetails(callback: (state: any) => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = (state) => {
      callback(state);
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // Compatibility method for CanvasTimeline - subscribeToUpdateTrackItem
  subscribeToUpdateTrackItem(callback: () => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = (state) => {
      callback();
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // Compatibility method for CanvasTimeline - subscribeToAddOrRemoveItems
  subscribeToAddOrRemoveItems(callback: () => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = (state) => {
      callback();
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  // Compatibility method for CanvasTimeline - subscribeToUpdateItemDetails
  subscribeToUpdateItemDetails(callback: () => void): { unsubscribe: () => void } {
    const listener: LegacyStateListener = (state) => {
      callback();
    };
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }
}

function snapshotLegacyState(project: Project): LegacySnapshot {
  const seq = project.sequences[project.rootSequenceId];

  return {
    trackItemsMap: selectLegacyTrackItemsMap(project),
    tracks: Object.values(project.tracks).map((t) => ({ ...t, clipIds: [...t.clipIds] })),
    trackItemIds: selectLegacyTrackItemIds(project),
    activeIds: [...project.ui.selection],
    duration: seq?.duration ?? 0,
    fps: seq?.fps ?? 30,
    size: seq?.canvas ?? { width: 1080, height: 1920 },
    background: seq?.background ?? { type: "color", value: "#000000" },
    scroll: { left: project.ui.scrollX, top: project.ui.scrollY },
    zoom: project.ui.zoom,
    canUndo: engineStore.canUndo,
    canRedo: engineStore.canRedo,
    compositions: [],
  };
}

const legacyStateAdapter = new LegacyStateAdapter();

// ──────────────────────────────────────────────────────────────────────────────
// Fullscreen context

interface FullscreenCtx {
  fullscreenPanel: string | null;
  setFullscreenPanel: (p: string | null) => void;
}
const FullscreenContext = createContext<FullscreenCtx>({
  fullscreenPanel: null,
  setFullscreenPanel: () => {},
});
const useFullscreen = () => useContext(FullscreenContext);

function FullscreenProvider({ children }: { children: ReactNode }) {
  const [fullscreenPanel, setFullscreenPanel] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreenPanel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <FullscreenContext.Provider value={{ fullscreenPanel, setFullscreenPanel }}>
      {children}
    </FullscreenContext.Provider>
  );
}

function ResizablePanelWrapper({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { fullscreenPanel, setFullscreenPanel } = useFullscreen();
  const isFullscreen = fullscreenPanel === id;
  const isAnyFullscreen = fullscreenPanel !== null;
  const toggle = useCallback(() => setFullscreenPanel(isFullscreen ? null : id), [id, isFullscreen, setFullscreenPanel]);

  if (isAnyFullscreen && !isFullscreen) return null;

  return (
    <div
      className={cn("relative group", isFullscreen ? "fixed inset-0 z-[9999] bg-card" : "h-full", className)}
      onDoubleClick={toggle}
    >
      {children}
      {isFullscreen && (
        <div className="absolute top-2 right-2 z-[10000] flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground bg-black/50 px-2 py-1 rounded">
            Double-click or Esc to exit
          </span>
          <button
            onClick={() => setFullscreenPanel(null)}
            className="bg-white/10 hover:bg-white/20 text-white p-1 rounded"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Layout components

const LeftSidebar = () => (
  <div className="bg-card w-full flex flex-none border-r border-border/80 h-[calc(100vh-52px)]">
    <ResizablePanelGroup direction="vertical" className="w-full">
      <ResizablePanel defaultSize={45} minSize={25} maxSize={70}>
        <ResizablePanelWrapper id="source"><SourceControlPanel /></ResizablePanelWrapper>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={55} minSize={30} maxSize={75}>
        <ResizablePanelWrapper id="project">
          <Tabs defaultValue="media" className="flex flex-col h-full">
            <TabsList className="flex-none px-2 pt-2 pb-0 justify-start gap-1 h-auto bg-transparent border-b border-border/40 rounded-none">
              <TabsTrigger value="media" className="text-[11px] h-7 px-3 rounded-sm">Media</TabsTrigger>
              <TabsTrigger value="project" className="text-[11px] h-7 px-3 rounded-sm">Project</TabsTrigger>
            </TabsList>
            <TabsContent value="media" className="flex-1 overflow-hidden mt-0"><MenuList /></TabsContent>
            <TabsContent value="project" className="flex-1 overflow-hidden mt-0"><ProjectPanel /></TabsContent>
          </Tabs>
        </ResizablePanelWrapper>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
);

const RightSidebar = () => (
  <div className="bg-card flex flex-col border-l border-border/80 h-[calc(100vh-52px)] w-full">
    <Tabs defaultValue="effects" className="flex flex-col h-full">
      <TabsList className="flex-none px-2 pt-2 pb-0 justify-start gap-1 h-auto bg-transparent border-b border-border/40 rounded-none">
        <TabsTrigger value="effects" className="text-[11px] h-7 px-3 rounded-sm">Effect Controls</TabsTrigger>
        <TabsTrigger value="properties" className="text-[11px] h-7 px-3 rounded-sm">Properties</TabsTrigger>
      </TabsList>
      <TabsContent value="effects" className="flex-1 overflow-hidden mt-0">
        <ResizablePanelWrapper id="effects"><EffectControlsPanel /></ResizablePanelWrapper>
      </TabsContent>
      <TabsContent value="properties" className="flex-1 overflow-auto mt-0">
        <ResizablePanelWrapper id="properties"><ControlItem /></ResizablePanelWrapper>
      </TabsContent>
    </Tabs>
  </div>
);

const SceneContainer = ({
  sceneRef,
  playerRef,
  stateManager,
}: {
  sceneRef: RefObject<SceneRef>;
  playerRef: any;
  stateManager: LegacyStateAdapter;
}) => (
  <div className="flex flex-col bg-background h-full">
    <div className="flex-1 min-h-0">
      <ResizablePanelGroup direction="vertical" className="h-full">
        <ResizablePanel defaultSize={65} minSize={35}>
          <ResizablePanelWrapper id="scene">
            <div className="flex-1 relative overflow-hidden w-full h-full">
              <CropModal />
              <Scene ref={sceneRef} stateManager={stateManager} />
            </div>
          </ResizablePanelWrapper>
        </ResizablePanel>
        <ResizableHandle className="bg-border/90" withHandle />
        <ResizablePanel defaultSize={35} minSize={20}>
          <ResizablePanelWrapper id="timeline">
            <div className="w-full h-full flex flex-col">
              <MediaToolbar />
              <div className="flex-1 min-h-0">
                {playerRef && <Timeline stateManager={stateManager} />}
              </div>
            </div>
          </ResizablePanelWrapper>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────────────────────────
// Editor shell

function EditorShell() {
  const { playerRef } = useStore();
  const { setFonts, setCompactFonts } = useDataState();
  const { setTrackItem } = useLayoutStore();
  const sceneRef = useRef<SceneRef>(null);
  const isLargeScreen = useIsLargeScreen();
  const bootstrapped = useRef(false);

  const stateManager = useMemo(() => legacyStateAdapter, []);

  // Engine-only hooks
  useTimelineEvents();
  useKeyframePlayback();
  useMarkerShortcuts();
  useAutoSequenceDetector();

  // Project initialization
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const stored = loadProjectFromStorage();
    const project = stored ?? createEmptyProject();
    engineStore.dispatch({ type: "LOAD_PROJECT", payload: { project } });
  }, []);

  // Auto-save engine state to localStorage
  useEffect(() => {
    const unsub = engineStore.subscribe((state) => {
      saveProjectToStorage(state);
    });
    return unsub;
  }, []);

  // Sync active clip to layout store (properties panel)
  useEffect(() => {
    const unsub = engineStore.subscribe((state) => {
      const id = state.ui.selection[0];
      const clip = id ? state.clips[id] : null;
      if (clip) {
        setTrackItem({ id: clip.id, ...clip, details: clip.details } as any);
      } else {
        setTrackItem(null);
      }
    });
    return unsub;
  }, [setTrackItem]);

  // Load fonts
  useEffect(() => {
    (async () => {
      const compactFonts = await getCompactFontData(FONTS);
      const primary = FONTS.find((f) => f.postScriptName === SECONDARY_FONT);
      if (primary) await loadFonts([{ name: SECONDARY_FONT, url: SECONDARY_FONT_URL }]);
      setCompactFonts(compactFonts);
      setFonts(FONTS);
    })();
  }, []);

  const navbarProps = {
    projectName: "Untitled video",
    user: null,
    stateManager,
    setProjectName: () => {},
  };

  if (isLargeScreen) {
    return (
      <FullscreenProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-background">
          <Navbar {...navbarProps} />
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel defaultSize={15} minSize={11} maxSize={24}>
                <LeftSidebar />
              </ResizablePanel>
              <ResizableHandle className="bg-border/60" />
              <ResizablePanel defaultSize={61} minSize={40}>
                <SceneContainer sceneRef={sceneRef} playerRef={playerRef} stateManager={stateManager} />
              </ResizablePanel>
              <ResizableHandle className="bg-border/60" />
              <ResizablePanel defaultSize={24} minSize={18} maxSize={36}>
                <RightSidebar />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
          <FloatingControl />
          <CropModal />
        </div>
      </FullscreenProvider>
    );
  }

  return (
    <FullscreenProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <Navbar {...navbarProps} />
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <SceneContainer sceneRef={sceneRef} playerRef={playerRef} stateManager={stateManager} />
        </div>
        <div className="border-t border-border/60 overflow-y-auto max-h-64 bg-card">
          <ControlItemHorizontal />
        </div>
        <FloatingControl />
      </div>
    </FullscreenProvider>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Root export

export default function Editor() {
  return (
    <EngineProvider>
      <EditorShell />
    </EngineProvider>
  );
}
