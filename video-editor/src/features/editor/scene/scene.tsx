import { Player } from "../player";
import { useRef, useImperativeHandle, forwardRef } from "react";
import useStore from "../store/use-store";
import StateManager from "@designcombo/state";
import SceneEmpty from "./empty";
import Board from "./board";
import useZoom from "../hooks/use-zoom";
import { SceneInteractions } from "./interactions";
import { SceneRef } from "./scene.types";

// ENGINE MIGRATION: Import engine hooks
import { useEngineSelector } from "../engine/engine-provider";

const Scene = forwardRef<
  SceneRef,
  {
    stateManager: StateManager;
  }
>(({ stateManager }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { size, trackItemIds } = useStore();
  
  // ENGINE MIGRATION: Get clip count from engine
  const engineClipCount = useEngineSelector((p) => Object.keys(p.clips).length);
  
  const { zoom, handlePinch, recalculateZoom } = useZoom(
    containerRef as React.RefObject<HTMLDivElement>,
    size
  );

  // Expose the recalculateZoom function to parent
  useImperativeHandle(ref, () => ({
    recalculateZoom
  }));

  // Use engine clips count if available
  const hasClips = engineClipCount > 0 || trackItemIds.length > 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        flex: 1,
        overflow: "hidden",
        background: "transparent",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}
      ref={containerRef}
    >
      {!hasClips && <SceneEmpty />}
      <div
        style={{
          width: size.width,
          height: size.height,
          background: "#000000",
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
          position: "relative",
          flexShrink: 0,
        }}
        className="player-container bg-sidebar"
      >
        <div
          style={{
            position: "absolute",
            zIndex: 100,
            pointerEvents: "none",
            width: size.width,
            height: size.height,
            background: "transparent",
            boxShadow: "0 0 0 5000px var(--card)"
          }}
        />
        <Board size={size}>
          <Player />
          <SceneInteractions
            stateManager={stateManager}
            containerRef={containerRef as React.RefObject<HTMLDivElement>}
            zoom={zoom}
            size={size}
          />
        </Board>
      </div>
    </div>
  );
});

Scene.displayName = "Scene";

export default Scene;
