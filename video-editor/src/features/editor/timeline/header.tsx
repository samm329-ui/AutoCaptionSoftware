import { Button } from "@/components/ui/button";
import { usePlayerRef } from "../engine/engine-hooks";
import { LAYER_DELETE, ACTIVE_SPLIT, LAYER_CLONE, PLAYER_PAUSE, PLAYER_PLAY } from "../constants/events";
import { frameToTimeString, getCurrentTime, timeToString } from "../utils/time";
import { SquareSplitHorizontal, Trash, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, AudioLines, XCircle } from "lucide-react";
import { extractAudioFromVideoToTimeline } from "@/store/upload-store";
import {
  getFitZoomLevel,
  getNextZoomLevel,
  getPreviousZoomLevel,
  getZoomByIndex
} from "../utils/timeline";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { useEffect, useState, useCallback, useRef } from "react";
import useUpdateAnsestors from "../hooks/use-update-ansestors";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import { useEngineSelection, useEngineSelector, useEngineDispatch, useEngineZoom, useEnginePlayhead } from "../engine/engine-provider";
import { selectDuration, selectFps, selectNaturalEndMs } from "../engine/selectors";
import { deleteClips, splitClip, cloneClip, setZoom, clearAll, setPlayhead, seekPlayer } from "../engine/commands";
import { engineStore } from "../engine/engine-core";

const IconPlayerPlayFilled = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" />
  </svg>
);

const IconPlayerPauseFilled = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
    <path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
  </svg>
);

const Header = () => {
  const playerRef = usePlayerRef(); // Returns PlayerRef | null
  const engineSelection = useEngineSelection();
  const engineDispatch = useEngineDispatch();
  const engineZoom = useEngineZoom();
  const sequenceDuration = useEngineSelector(selectDuration);
  const fps = useEngineSelector(selectFps);
  const naturalEndMs = useEngineSelector(selectNaturalEndMs);
  
  const clipDuration = sequenceDuration;
  
  const isLargeScreen = useIsLargeScreen();
  
  const currentFrame = useCurrentPlayerFrame(playerRef);
  const playheadTime = useEnginePlayhead(); // Get playhead time from engine
  const safeFps = fps || 30;
  const safeDuration = clipDuration;
  
  // Derive playing state from playerRef
  const [playing, setPlaying] = useState(false);
  const isPlaying = playing || (playerRef?.isPlaying?.() ?? false);
  
  const computedDuration = Math.round(naturalEndMs > 0 ? naturalEndMs : sequenceDuration);

  const doActiveDelete = () => {
    if (engineSelection.length === 0) return;
    engineDispatch(deleteClips(engineSelection));
  };

  const doClearAll = () => {
    if (confirm("Clear all tracks and clips from timeline?")) {
      engineDispatch(clearAll());
    }
  };

  const doActiveSplit = () => {
    if (engineSelection.length === 0) return;
    const clipId = engineSelection[0];
    const currentTime = getCurrentTime();
    engineDispatch(splitClip(clipId, currentTime));
  };

  const doExtractAudio = async () => {
    if (engineSelection.length === 0) return;

    const clipId = engineSelection[0];
    const state = engineStore.getState();
    const clip = state.clips[clipId];
    if (!clip) return;

    const src = clip.details?.src as string;
    if (!src) return;

    const displayFrom = clip.display?.from ?? 0;
    const fileName = clip.details?.name as string ?? clipId;

    await extractAudioFromVideoToTimeline(src, clipId, fileName, displayFrom);
  };

  const doClone = () => {
    if (engineSelection.length === 0) return;
    const clipId = engineSelection[0];
    engineDispatch(cloneClip(clipId));
  };

  const handleZoomChange = (newZoom: number) => {
    // Dispatch actual zoom value to engine
    engineDispatch(setZoom(newZoom));
  };

const handlePlay = () => {
    console.log("handlePlay called, playerRef:", playerRef);
    if (playerRef && typeof (playerRef as any).play === "function") {
      (playerRef as any).play();
    } else {
      console.error("Player ref not available or play method missing - playerRef:", playerRef, typeof playerRef);
    }
  };

  const handlePause = () => {
    console.log("handlePause called, playerRef:", playerRef);
    if (playerRef && typeof (playerRef as any).pause === "function") {
      (playerRef as any).pause();
    } else {
      console.error("Player ref not available or pause method missing - playerRef:", playerRef, typeof playerRef);
    }
  };

  // Space key handler for play/pause toggle
  const togglePlayPause = useCallback(() => {
    if (playerRef?.isPlaying?.()) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [playerRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause]);

  useEffect(() => {
    const player = playerRef;
    if (!player) return;
    
    const playHandler = () => setPlaying(true);
    const pauseHandler = () => setPlaying(false);
    
    player.addEventListener("play", playHandler);
    player.addEventListener("pause", pauseHandler);
    
    return () => {
      player.removeEventListener("play", playHandler);
      player.removeEventListener("pause", pauseHandler);
    };
  }, [playerRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause]);

const handleFrameBack = () => {
    const engineState = engineStore.getState();
    const currentMs = engineState.ui?.playheadTime ?? 0;
    const newMs = Math.max(0, currentMs - (1000 / safeFps));
    const newFrame = Math.floor((newMs / 1000) * safeFps);
    engineDispatch(setPlayhead(newMs));
    seekPlayer(newFrame);
  };

  const handleFrameForward = () => {
    const engineState = engineStore.getState();
    const currentMs = engineState.ui?.playheadTime ?? 0;
    const newMs = currentMs + (1000 / safeFps);
    const newFrame = Math.floor((newMs / 1000) * safeFps);
    engineDispatch(setPlayhead(newMs));
    seekPlayer(newFrame);
  };

useEffect(() => {
    const player = playerRef;
    // Extensive logging to debug playerRef
    if (!player) {
      return;
    }
    console.log("Player ref type:", typeof player);
    console.log("Player ref keys:", Object.keys(player));
    console.log("Has addEventListener:", typeof (player as any).addEventListener);
    
    // Defensive check - ensure player is a valid PlayerRef with addEventListener
    if (typeof (player as any).addEventListener !== 'function') {
      console.log("Player doesn't have addEventListener, skipping event listeners");
      return;
    }
    
    const playHandler = () => setPlaying(true);
    const pauseHandler = () => setPlaying(false);
    
    (player as any).addEventListener("play", playHandler);
    (player as any).addEventListener("pause", pauseHandler);
    
    return () => {
      (player as any).removeEventListener("play", playHandler);
      (player as any).removeEventListener("pause", pauseHandler);
    };
  }, [playerRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key;

      switch (key) {
        case "ArrowLeft":
          e.preventDefault();
          handleFrameBack();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleFrameForward();
          break;
        case " ":
          e.preventDefault();
          if (playing) {
            handlePause();
          } else {
            handlePlay();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFrameBack, handleFrameForward, handlePlay, handlePause, safeFps]);

return (
    <div
      id="timeline-header"
      style={{
        position: "relative",
        height: "50px",
        flex: "none",
        width: "100%",
        minWidth: "0"
      }}
    >
      <div
        style={{
          position: "absolute",
          height: "50px",
          width: "100%",
          display: "flex",
          alignItems: "center",
          color: "lab(96.8637 1.85886 8.51977)",
          letterSpacing: "0.4px",
          lineHeight: "24px"
        }}
      >
<div
          style={{
            height: "36px",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minWidth: "0"
          }}
        >
          <div className="flex px-1 shrink-0 overflow-hidden">
            <Button
              onClick={doClearAll}
              variant={"ghost"}
              size={isLargeScreen ? "sm" : "icon"}
              className="flex items-center gap-1 px-2 text-orange-500 hover:text-orange-600"
              title="Clear all"
            >
              <XCircle size={14} />
              <span className="hidden lg:block">Clear</span>
            </Button>

            <Button
              disabled={!engineSelection.length}
              onClick={doActiveDelete}
              variant={"ghost"}
              size={isLargeScreen ? "sm" : "icon"}
              className="flex items-center gap-1 px-2"
            >
              <Trash size={14} />
              <span className="hidden lg:block">Delete</span>
            </Button>

            <Button
              disabled={!engineSelection.length}
              onClick={doActiveSplit}
              variant={"ghost"}
              size={isLargeScreen ? "sm" : "icon"}
              className="flex items-center gap-1 px-2"
            >
              <SquareSplitHorizontal size={15} />
              <span className="hidden lg:block">Split</span>
            </Button>
            <Button
              disabled={!engineSelection.length}
              onClick={doExtractAudio}
              variant={"ghost"}
              size={isLargeScreen ? "sm" : "icon"}
              className="flex items-center gap-1 px-2"
            >
              <AudioLines size={15} />
              <span className="hidden lg:block">Extract Audio</span>
            </Button>
              <Button
                disabled={!engineSelection.length}
                onClick={doClone}
              variant={"ghost"}
              size={isLargeScreen ? "sm" : "icon"}
              className="flex items-center gap-1 px-2"
            >
              <SquareSplitHorizontal size={15} />
              <span className="hidden lg:block">Clone</span>
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-1">
              <Button
                onClick={handleFrameBack}
                variant={"ghost"}
                size={"icon"}
                className="h-7 w-7"
                title="Previous Frame (Left Arrow)"
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                onClick={() => isPlaying ? handlePause() : handlePlay()}
                variant={"ghost"}
                size={"icon"}
                className="h-7 w-7"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? (
                  <IconPlayerPauseFilled size={14} />
                ) : (
                  <IconPlayerPlayFilled size={14} />
                )}
              </Button>
              <Button
                onClick={handleFrameForward}
                variant={"ghost"}
                size={"icon"}
                className="h-7 w-7"
                title="Next Frame (Right Arrow)"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
            <div
              className="text-xs font-light flex ml-2 shrink-0"
              style={{
                alignItems: "center",
                justifyContent: "center",
                minWidth: "180px"
              }}
            >
              <div
                className="font-medium text-zinc-200 tabular-nums"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  minWidth: "50px"
                }}
                id="video-current-time"
              >
                {timeToString({ time: playheadTime || 0 })}
              </div>
              <span className="px-0.5 text-muted-foreground">|</span>
              <div
                className="text-muted-foreground tabular-nums"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  minWidth: "50px"
                }}
              >
                {timeToString({ time: computedDuration })}
              </div>
              <span className="px-1 text-muted-foreground text-[10px] ml-1">
                F:{currentFrame}
              </span>
            </div>
          </div>

          <ZoomControl
            zoom={engineZoom}
            onZoomChange={handleZoomChange}
            duration={computedDuration}
          />
        </div>
      </div>
    </div>
  );
};

const ZoomControl = ({
  zoom,
  onZoomChange,
  duration
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  duration: number;
}) => {
  // Convert zoom to a slider index (0-20 range)
  // zoom = pixels per 100ms, so zoom=1 means 1000 pixels/second
  // We map this to an index for the slider
  
  const ZOOM_MIN = 0.01;
  const ZOOM_MAX = 1;
  const zoomIndex = Math.round((Math.log10(zoom) - Math.log10(ZOOM_MIN)) / (Math.log10(ZOOM_MAX) - Math.log10(ZOOM_MIN)) * 20);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    // Convert index back to zoom value
    const newZoom = ZOOM_MIN * Math.pow(ZOOM_MAX / ZOOM_MIN, idx / 20);
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(ZOOM_MIN, zoom * 0.75);
    onZoomChange(newZoom);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(ZOOM_MAX, zoom * 1.5);
    onZoomChange(newZoom);
  };

  const handleZoomFit = () => {
    // Fit to duration: show entire duration in ~2000 pixels
    const targetWidth = 2000;
    const durationSeconds = duration / 1000;
    const newZoom = targetWidth / (durationSeconds * 1000);
    onZoomChange(newZoom);
  };

  return (
    <div 
      className="flex items-center gap-1" 
      style={{
        color: "lab(96.8637 1.85886 8.51977)",
        letterSpacing: "0.4px",
        lineHeight: "24px"
      }}
    >
      <div className="flex items-center gap-1" style={{ color: "lab(4.07343 0.899285 2.96464)" }}>
        <Button size={"icon"} variant={"ghost"} onClick={handleZoomOut} className="h-6 w-6" title="Zoom Out">
          <ZoomOut size={12} />
        </Button>
        <div className="flex items-center gap-1">
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={zoomIndex}
            onChange={handleSliderChange}
            className="w-16 h-1 accent-primary"
          />
          <span className="text-[9px] text-muted-foreground w-6 text-center tabular-nums">
            {zoom.toFixed(2)}
          </span>
        </div>
        <Button size={"icon"} variant={"ghost"} onClick={handleZoomIn} className="h-6 w-6" title="Zoom In">
          <ZoomIn size={12} />
        </Button>
        <Button onClick={handleZoomFit} variant={"ghost"} size={"icon"} className="h-6 w-6" title="Fit">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M20 8V6h-2q-.425 0-.712-.288T17 5t.288-.712T18 4h2q.825 0 1.413.588T22 6v2q0 .425-.288.713T21 9t-.712-.288T20 8M2 8V6q0-.825.588-1.412T4 4h2q.425 0 .713.288T7 5t-.288.713T6 6H4v2q0 .425-.288.713T3 9t-.712-.288T2 8m18 12h-2q-.425 0-.712-.288T17 19t.288-.712T18 18h2v-2q0-.425.288-.712T21 15t.713.288T22 16v2q0 .825-.587 1.413T20 20M4 20q-.825 0-1.412-.587T2 18v-2q0-.425.288-.712T3 15t.713.288T4 16v2h2q.425 0 .713.288T7 19t-.288.713T6 20zm2-6v-4q0-.825.588-1.412T8 8h8q.825 0 1.413.588T18 10v4q0 .825-.587 1.413T16 16H8q-.825 0-1.412-.587T6 14"
            />
          </svg>
        </Button>
      </div>
    </div>
  );
};

export default Header;