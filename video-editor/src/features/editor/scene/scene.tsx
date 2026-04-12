/**
 * scene/scene.tsx — ENGINE-FIRST
 *
 * Canvas size comes from engine. Clip presence check uses engine selector.
 * playerRef (runtime-only) still in Zustand — that's correct.
 */

import { Player } from "../player";
import { useRef, useImperativeHandle, forwardRef } from "react";
import SceneEmpty from "./empty";
import Board from "./board";
import useZoom from "../hooks/use-zoom";
import { SceneInteractions } from "./interactions";
import { SceneRef } from "./scene.types";
import { useEngineSelector } from "../engine/engine-provider";
import { selectClipCount, selectCanvasSize } from "../engine/selectors";

const Scene = forwardRef<SceneRef, { stateManager: any }>(
  ({ stateManager }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // All project dimensions from engine
    const canvasSize   = useEngineSelector(selectCanvasSize);
    const engineClipCount = useEngineSelector(selectClipCount);

    const { zoom, handlePinch, recalculateZoom } = useZoom(
      containerRef as React.RefObject<HTMLDivElement>,
      canvasSize
    );

    useImperativeHandle(ref, () => ({ recalculateZoom }));

    const hasClips = engineClipCount > 0;

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
          alignItems: "center",
        }}
        ref={containerRef}
      >
        {!hasClips && <SceneEmpty />}
        <div
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
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
              width: canvasSize.width,
              height: canvasSize.height,
              background: "transparent",
              boxShadow: "0 0 0 5000px var(--card)",
            }}
          />
          <Board size={canvasSize}>
            <Player />
            <SceneInteractions
              containerRef={containerRef as React.RefObject<HTMLDivElement>}
              zoom={zoom}
              size={canvasSize}
            />
          </Board>
        </div>
      </div>
    );
  }
);

Scene.displayName = "Scene";
export default Scene;
