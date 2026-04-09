"use client";

import Timeline from "./timeline";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import useTimelineEvents from "./hooks/use-timeline-events";
import Scene from "./scene";
import { SceneRef } from "./scene/scene.types";
import StateManager, { DESIGN_LOAD } from "@designcombo/state";
import { useEffect, useRef, useState, useCallback, createContext, useContext } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { getCompactFontData, loadFonts } from "./utils/fonts";
import { SECONDARY_FONT, SECONDARY_FONT_URL } from "./constants/constants";
import MenuList from "./menu-list";
import { ControlItem } from "./control-item";
import CropModal from "./crop-modal/crop-modal";
import useDataState from "./store/use-data-state";
import { FONTS } from "./data/fonts";
import FloatingControl from "./control-item/floating-controls/floating-control";
import { dispatch } from "@designcombo/events";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { ITrackItem } from "@designcombo/types";
import { cn } from "@/lib/utils";
import useLayoutStore from "./store/use-layout-store";
import useAutoSequenceDetector from "./hooks/use-auto-sequence-detector";
import ControlItemHorizontal from "./control-item-horizontal";
import { design } from "./mock";
import MediaToolbar from "./media-toolbar";

import ProjectPanel from "./panels/project-panel";
import EffectControlsPanel from "./panels/effect-controls-panel";
import SourceControlPanel from "./panels/source-control-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useKeyframePlayback } from "./hooks/use-keyframe-playback";
import { useMarkerShortcuts } from "./engine/marker-engine";

// ─── NEW: Engine provider + legacy bridge ─────────────────────────────────────
// Phase 1 of migration: mount the engine and wire DesignCombo → engine sync.
import { EngineProvider } from "./engine/engine-provider";
import { useLegacyBridge } from "./engine/legacy-bridge";
// ─────────────────────────────────────────────────────────────────────────────

// ─── Single StateManager instance ─────────────────────────────────────────────
const stateManager = new StateManager({
  size: { width: 1080, height: 1920 },
});

// ─── Fullscreen Context ───────────────────────────────────────────────────────
interface FullscreenContextType {
  fullscreenPanel: string | null;
  setFullscreenPanel: (panel: string | null) => void;
}
const FullscreenContext = createContext<FullscreenContextType>({
  fullscreenPanel: null,
  setFullscreenPanel: () => {},
});
function useFullscreen() {
  return useContext(FullscreenContext);
}
function FullscreenProvider({ children }: { children: React.ReactNode }) {
  const [fullscreenPanel, setFullscreenPanel] = useState<string | null>(null);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreenPanel(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  return (
    <FullscreenContext.Provider value={{ fullscreenPanel, setFullscreenPanel }}>
      {children}
    </FullscreenContext.Provider>
  );
}

// ─── Panel Wrapper (double-click to fullscreen) ───────────────────────────────
function ResizablePanelWrapper({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { fullscreenPanel, setFullscreenPanel } = useFullscreen();
  const isFullscreen = fullscreenPanel === id;
  const isAnyFullscreen = fullscreenPanel !== null;
  const handleDoubleClick = useCallback(() => {
    setFullscreenPanel(isFullscreen ? null : id);
  }, [id, isFullscreen, setFullscreenPanel]);

  if (isAnyFullscreen && !isFullscreen) return null;

  return (
    <div
      className={cn(
        "relative group",
        isFullscreen ? "fixed inset-0 z-[9999] bg-card" : "h-full",
        className
      )}
      onDoubleClick={handleDoubleClick}
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

// ─── Left Sidebar ──────────────────────────────────────────────────────────────
const LeftSidebar = () => {
  return (
    <div className="bg-card w-full flex flex-none border-r border-border/80 h-[calc(100vh-52px)]">
      <ResizablePanelGroup direction="vertical" className="w-full">
        <ResizablePanel defaultSize={45} minSize={25} maxSize={70}>
          <ResizablePanelWrapper id="source">
            <SourceControlPanel />
          </ResizablePanelWrapper>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={55} minSize={30} maxSize={75}>
          <ResizablePanelWrapper id="project">
            <Tabs defaultValue="media" className="flex flex-col h-full">
              <TabsList className="flex-none px-2 pt-2 pb-0 justify-start gap-1 h-auto bg-transparent border-b border-border/40 rounded-none">
                <TabsTrigger
                  value="media"
                  className="text-[11px] h-7 px-3 rounded-sm data-[state=active]:bg-white/10 data-[state=active]:text-foreground"
                >
                  Media
                </TabsTrigger>
                <TabsTrigger
                  value="project"
                  className="text-[11px] h-7 px-3 rounded-sm data-[state=active]:bg-white/10 data-[state=active]:text-foreground"
                >
                  Project
                </TabsTrigger>
              </TabsList>
              <TabsContent value="media" className="flex-1 overflow-hidden mt-0">
                <MenuList />
              </TabsContent>
              <TabsContent value="project" className="flex-1 overflow-hidden mt-0">
                <ProjectPanel />
              </TabsContent>
            </Tabs>
          </ResizablePanelWrapper>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

// ─── Right Sidebar ────────────────────────────────────────────────────────────
const RightSidebar = ({ trackItem }: { trackItem: ITrackItem | null }) => {
  return (
    <div className="bg-card flex flex-col border-l border-border/80 h-[calc(100vh-52px)] w-full">
      <Tabs defaultValue="effects" className="flex flex-col h-full">
        <TabsList className="flex-none px-2 pt-2 pb-0 justify-start gap-1 h-auto bg-transparent border-b border-border/40 rounded-none">
          <TabsTrigger
            value="effects"
            className="text-[11px] h-7 px-3 rounded-sm data-[state=active]:bg-white/10 data-[state=active]:text-foreground"
          >
            Effect Controls
          </TabsTrigger>
          <TabsTrigger
            value="properties"
            className="text-[11px] h-7 px-3 rounded-sm data-[state=active]:bg-white/10 data-[state=active]:text-foreground"
          >
            Properties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="effects" className="flex-1 overflow-hidden mt-0">
          <ResizablePanelWrapper id="effects">
            <EffectControlsPanel />
          </ResizablePanelWrapper>
        </TabsContent>

        <TabsContent value="properties" className="flex-1 overflow-auto mt-0">
          <ResizablePanelWrapper id="properties">
            {trackItem ? (
              <ControlItem />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                    <rect x="2" y="7" width="20" height="10" rx="2"/>
                    <path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>
                    <circle cx="12" cy="12" r="1.5"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground/80 mb-1">No clip selected</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Click a clip on the timeline to edit its position, size, rotation, and more.
                  </p>
                </div>
                <div className="w-full border border-border/30 rounded-lg p-3 text-left space-y-2">
                  <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide font-medium">Quick tips</p>
                  <p className="text-[11px] text-muted-foreground">· Click clip → select it</p>
                  <p className="text-[11px] text-muted-foreground">· Shift+click → multi-select</p>
                  <p className="text-[11px] text-muted-foreground">· Drag edges → trim duration</p>
                  <p className="text-[11px] text-muted-foreground">· Double-click panel → fullscreen</p>
                </div>
              </div>
            )}
          </ResizablePanelWrapper>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Center: Scene + Timeline ─────────────────────────────────────────────────
const SceneContainer = ({
  sceneRef,
  playerRef,
  stateManager,
}: any) => {
  return (
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
};

// ─── Inner editor shell (inside EngineProvider) ───────────────────────────────
function EditorShell() {
  const {
    playerRef,
    setPlayerRef,
    setState,
    activeIds,
    trackItemsMap,
  } = useStore();

  const { setFonts, setCompactFonts } = useDataState();
  const { trackItem, setTrackItem } = useLayoutStore();
  const sceneRef = useRef<SceneRef>(null);
  const containerRef = useRef<ImperativePanelHandle>(null);
  const isLargeScreen = useIsLargeScreen();
  const [loaded, setLoaded] = useState(false);

  useTimelineEvents();
  useKeyframePlayback();
  useMarkerShortcuts();
  useAutoSequenceDetector();

  // ── NEW: wire DesignCombo events → engine store ──────────────────────────
  useLegacyBridge();
  // ────────────────────────────────────────────────────────────────────────

  const activeId = activeIds[0];
  const activeTrackItem = activeId ? (trackItemsMap[activeId] as ITrackItem) : null;

  useEffect(() => {
    if (activeTrackItem) setTrackItem(activeTrackItem);
    else setTrackItem(null);
  }, [activeTrackItem, setTrackItem]);

  useEffect(() => {
    const loadEditorFonts = async () => {
      const compactFonts = await getCompactFontData(FONTS);
      const primaryFont = FONTS.find((f) => f.postScriptName === SECONDARY_FONT);
      if (primaryFont) {
        await loadFonts([{ name: SECONDARY_FONT, url: SECONDARY_FONT_URL }]);
      }
      setCompactFonts(compactFonts);
      setFonts(FONTS);
    };
    loadEditorFonts();
  }, []);

  const designLoaded = useRef(false);
  useEffect(() => {
    if (designLoaded.current) return;
    designLoaded.current = true;
    dispatch(DESIGN_LOAD, {
      payload: design,
      options: { stateManager },
    });
  }, []);

  useEffect(() => {
    const currentState = stateManager.getState();
    setState(currentState).then(() => setLoaded(true));
  }, []);

  if (isLargeScreen) {
    return (
      <FullscreenProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-background">
          <Navbar
            projectName="Untitled video"
            user={null}
            stateManager={stateManager}
            setProjectName={() => {}}
          />
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel defaultSize={15} minSize={11} maxSize={24}>
                <LeftSidebar />
              </ResizablePanel>

              <ResizableHandle className="bg-border/60" />

              <ResizablePanel defaultSize={61} minSize={40}>
                <SceneContainer
                  sceneRef={sceneRef}
                  playerRef={playerRef}
                  stateManager={stateManager}
                />
              </ResizablePanel>

              <ResizableHandle className="bg-border/60" />

              <ResizablePanel defaultSize={24} minSize={18} maxSize={36}>
                <RightSidebar trackItem={activeTrackItem} />
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
        <Navbar
          projectName="Untitled video"
          user={null}
          stateManager={stateManager}
          setProjectName={() => {}}
        />
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <SceneContainer
            sceneRef={sceneRef}
            playerRef={playerRef}
            stateManager={stateManager}
          />
        </div>
        <div className="border-t border-border/60 overflow-y-auto max-h-64 bg-card">
          <ControlItemHorizontal />
        </div>
        <FloatingControl />
      </div>
    </FullscreenProvider>
  );
}

// ─── Root export — wraps everything in EngineProvider ─────────────────────────
export default function Editor() {
  return (
    <EngineProvider>
      <EditorShell />
    </EngineProvider>
  );
}
