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
import { useEffect, useRef, useState } from "react";
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
import useLayoutStore from "./store/use-layout-store";
import ControlItemHorizontal from "./control-item-horizontal";
import { design } from "./mock";
import { Separator } from "@/components/ui/separator";
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
            <div className="flex-1 relative overflow-hidden w-full h-full">
              <CropModal />
              <Scene ref={sceneRef} stateManager={stateManager} />
            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-border/90" withHandle />

          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="w-full h-full flex flex-col">
              <MediaToolbar />
              <div className="flex-1 min-h-0">
                {playerRef && <Timeline stateManager={stateManager} />}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

// ─── Left Sidebar ─────────────────────────────────────────────────────────────

const LeftSidebar = () => {
  return (
    <div className="bg-card w-full flex flex-none border-r border-border/80 h-[calc(100vh-52px)]">
      <div className="flex flex-col w-full">
        {/* Upper half: Source Control Panel */}
        <div className="flex-1 min-h-0 border-b border-border/40">
          <SourceControlPanel />
        </div>

        {/* Lower half: Project / Media tabs */}
        <div className="flex-1 min-h-0">
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
        </div>
      </div>
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
          <EffectControlsPanel />
        </TabsContent>

        <TabsContent value="properties" className="flex-1 overflow-hidden mt-0">
          {/* Original ControlItem remains in properties tab */}
          {trackItem ? (
            <ControlItem />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              Select a clip to see properties
            </div>
          )}
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
    );
  }

  // Mobile / small screen fallback
  return (
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
  );
}
