"use client";

/**
 * editor.tsx — engine-first editor shell
 *
 * This file now bootstraps the editor from the new engine only.
 * A thin engine-backed compatibility adapter is kept for un-migrated
 * consumers inside the app.
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
} from "./engine/engine-core";
import { setPlayhead, setScroll, setSelection, setZoom } from "./engine/commands";
import { LegacyStateAdapter, legacyStateAdapter } from "./engine/legacy-state-adapter";
import { useLegacyBridge } from "./engine/legacy-bridge";

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

// LegacyStateAdapter is now imported from engine/legacy-state-adapter.ts

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
                {playerRef && <Timeline />}
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
  const { playerRef, setTracks, setState } = useStore();
  const { setFonts, setCompactFonts } = useDataState();
  const { setTrackItem } = useLayoutStore();
  const sceneRef = useRef<SceneRef>(null);
  const isLargeScreen = useIsLargeScreen();
  const bootstrapped = useRef(false);

  const stateManager = useMemo(() => legacyStateAdapter, []);

  // Legacy state adapter is still needed for panels - but timeline now uses engine directly

  // Engine-only hooks
  useTimelineEvents();
  useKeyframePlayback();
  useMarkerShortcuts();
  useAutoSequenceDetector();

  // Mount the legacy bridge (CRITICAL - this translates @designcombo events to engine)
  useLegacyBridge();

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

  // Initialize state once on mount
  useEffect(() => {
    const state = engineStore.getState();
    const tracks = Object.values(state.tracks);
    setTracks(tracks);
    
    const seq = state.sequences[state.rootSequenceId];
    setState({
      size: seq?.canvas ?? { width: 1080, height: 1920 },
      fps: seq?.fps ?? 30,
      duration: seq?.duration ?? 1000,
      trackItemsMap: {},
      activeIds: state.ui.selection,
    });
    
    // Sync selection only (not tracks to avoid loop)
    const unsubSel = engineStore.subscribe((state) => {
      setState({ activeIds: state.ui.selection });
    });
    
    return unsubSel;
  }, []);

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
