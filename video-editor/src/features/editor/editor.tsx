"use client";

/**
 * Enhanced Editor Layout
 * ──────────────────────
 * Adds:
 *   - Left sidebar: Project Panel (media bin)
 *   - Right sidebar: Effect Controls Panel
 *   - Timeline: includes markers layer
 *
 * REPLACE your existing:
 *   src/features/editor/editor.tsx
 * with this file.
 *
 * NOTE: Keep all existing imports — this adds to them.
 */

import Timeline from "./timeline";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import useTimelineEvents from "./hooks/use-timeline-events";
import Scene from "./scene";
import { SceneRef } from "./scene/scene.types";
import StateManager, { DESIGN_LOAD } from "@designcombo/state";
import { useEffect, useRef, useState, useCallback } from "react";
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
import { useSceneStore } from "@/store/use-scene-store";
import { dispatch } from "@designcombo/events";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { ITrackItem } from "@designcombo/types";
import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import useLayoutStore from "./store/use-layout-store";
import useAutoSequenceDetector from "./hooks/use-auto-sequence-detector";
import ControlItemHorizontal from "./control-item-horizontal";
import { design } from "./mock";
import MediaToolbar from "./media-toolbar";

// New panels
import ProjectPanel from "./panels/project-panel";
import EffectControlsPanel from "./panels/effect-controls-panel";
import SourceControlPanel from "./panels/source-control-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Runtime hooks
import { useKeyframePlayback } from "./hooks/use-keyframe-playback";
import { useMarkerShortcuts } from "./engine/marker-engine";

const stateManager = new StateManager({
  size: {
    width: 1080,
    height: 1920,
  },
});

// ─── Scene Container ──────────────────────────────────────────────────────────

const SceneContainer = ({
  sceneRef,
  playerRef,
  stateManager,
  trackItem,
  loaded,
  isLargeScreen,
}: any) => {
  return (
    <div className="flex flex-col bg-background h-full">
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="vertical" className="h-full">
          <ResizablePanel defaultSize={65} minSize={30}>
            <ResizablePanelWrapper id="scene">
              <div className="flex-1 relative overflow-hidden w-full h-full">
                <CropModal />
                <Scene ref={sceneRef} stateManager={stateManager} />
              </div>
            </ResizablePanelWrapper>
          </ResizablePanel>

          <ResizableHandle className="bg-border/90" withHandle />

          <ResizablePanel defaultSize={35} minSize={25}>
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

// ─── Fullscreen Panel Context ─────────────────────────────────────────────────

interface FullscreenContextType {
  fullscreenPanel: string | null;
  setFullscreenPanel: (panel: string | null) => void;
}

const FullscreenContext = createContext<FullscreenContextType>({
  fullscreenPanel: null,
  setFullscreenPanel: () => {},
});

function FullscreenProvider({ children }: { children: React.ReactNode }) {
  const [fullscreenPanel, setFullscreenPanel] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullscreenPanel(null);
      }
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

function useFullscreen() {
  return useContext(FullscreenContext);
}

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

  if (isAnyFullscreen && !isFullscreen) {
    return null;
  }

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
            Double-click or press Esc to exit
          </span>
          <button
            onClick={() => setFullscreenPanel(null)}
            className="bg-white/10 hover:bg-white/20 text-white p-1 rounded transition-colors"
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

// ─── Left Sidebar ─────────────────────────────────────────────────────────────

const LeftSidebar = () => {
  return (
    <div className="bg-card w-full flex flex-none border-r border-border/80 h-[calc(100vh-52px)]">
      <ResizablePanelGroup direction="vertical" className="w-full">
        <ResizablePanel defaultSize={50} minSize={20} maxSize={80}>
          <ResizablePanelWrapper id="source">
            <SourceControlPanel />
          </ResizablePanelWrapper>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={20} maxSize={80}>
          <ResizablePanelWrapper id="project">
            <Tabs defaultValue="project" className="flex flex-col h-full">
              <TabsList className="flex-none px-2 pt-2 pb-0 justify-start gap-1 h-auto bg-transparent border-b border-border/40 rounded-none">
                <TabsTrigger
                  value="project"
                  className="text-[10px] h-6 px-2 rounded-sm data-[state=active]:bg-white/10"
                >
                  Project
                </TabsTrigger>
                <TabsTrigger
                  value="media"
                  className="text-[10px] h-6 px-2 rounded-sm data-[state=active]:bg-white/10"
                >
                  Media
                </TabsTrigger>
              </TabsList>
              <TabsContent value="project" className="flex-1 overflow-hidden mt-0">
                <ProjectPanel />
              </TabsContent>
              <TabsContent value="media" className="flex-1 overflow-hidden mt-0">
                <MenuList />
              </TabsContent>
            </Tabs>
          </ResizablePanelWrapper>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

// ─── Right Sidebar (Effect Controls + Properties) ────────────────────────────

const RightSidebar = ({ trackItem }: { trackItem: ITrackItem | null }) => {
  return (
    <div className="bg-card flex flex-col border-l border-border/80 h-[calc(100vh-52px)] w-full">
      <Tabs defaultValue="effects" className="flex flex-col h-full">
        <TabsList className="flex-none px-2 pt-2 pb-0 justify-start gap-1 h-auto bg-transparent border-b border-border/40 rounded-none">
          <TabsTrigger
            value="effects"
            className="text-[10px] h-6 px-2 rounded-sm data-[state=active]:bg-white/10"
          >
            Effect Controls
          </TabsTrigger>
          <TabsTrigger
            value="properties"
            className="text-[10px] h-6 px-2 rounded-sm data-[state=active]:bg-white/10"
          >
            Properties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="effects" className="flex-1 overflow-hidden mt-0">
          <ResizablePanelWrapper id="effects">
            <EffectControlsPanel />
          </ResizablePanelWrapper>
        </TabsContent>

        <TabsContent value="properties" className="flex-1 overflow-hidden mt-0">
          <ResizablePanelWrapper id="properties">
            {trackItem ? (
              <ControlItem />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                Select a clip to see properties
              </div>
            )}
          </ResizablePanelWrapper>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Main Editor ──────────────────────────────────────────────────────────────

export default function Editor() {
  const {
    playerRef,
    setPlayerRef,
    setState,
    setSceneMoveableRef,
    activeIds,
    trackItemsMap,
    fps,
    duration,
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

  const activeId = activeIds[0];
  const activeTrackItem = activeId ? (trackItemsMap[activeId] as ITrackItem) : null;

  useEffect(() => {
    if (activeTrackItem) setTrackItem(activeTrackItem);
    else setTrackItem(null);
  }, [activeTrackItem, setTrackItem]);

  // Load fonts
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

  // Initial design load
  useEffect(() => {
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
              {/* Left: Project Panel */}
              <ResizablePanel defaultSize={14} minSize={10} maxSize={22}>
                <LeftSidebar />
              </ResizablePanel>

              <ResizableHandle className="bg-border/60" />

              {/* Center: Scene + Timeline */}
              <ResizablePanel defaultSize={62} minSize={40}>
                <SceneContainer
                  sceneRef={sceneRef}
                  playerRef={playerRef}
                  stateManager={stateManager}
                  trackItem={activeTrackItem}
                  loaded={loaded}
                  isLargeScreen={isLargeScreen}
                />
              </ResizablePanel>

              <ResizableHandle className="bg-border/60" />

              {/* Right: Effect Controls */}
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

  // Mobile / small screen fallback
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
            trackItem={activeTrackItem}
            loaded={loaded}
            isLargeScreen={false}
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
