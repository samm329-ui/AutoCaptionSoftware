import { Button } from "@/components/ui/button";
import useStore from "../store/use-store";
import { LAYER_DELETE, ACTIVE_SPLIT, LAYER_CLONE, TIMELINE_SCALE_CHANGED, PLAYER_PAUSE, PLAYER_PLAY } from "../constants/events";
import { frameToTimeString, getCurrentTime, timeToString } from "../utils/time";
import { SquareSplitHorizontal, Trash, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, AudioLines } from "lucide-react";
import { extractAudioFromVideoToTimeline } from "@/store/upload-store";
import {
  getFitZoomLevel,
  getNextZoomLevel,
  getPreviousZoomLevel,
  getZoomByIndex
} from "../utils/timeline";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import useUpdateAnsestors from "../hooks/use-update-ansestors";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";

interface ITimelineScaleState {
  index: number;
  zoom: number;
}

// ENGINE MIGRATION: Import engine hooks
import { useEngineSelection, useEngineDuration } from "../engine/engine-provider";

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

const IconPlayerSkipBack = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M20 5v14l-12 -7z" />
    <path d="M4 5l0 14" />
  </svg>
);

const IconPlayerSkipForward = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M4 5v14l12 -7z" />
    <path d="M20 5l0 14" />
  </svg>
);

const Header = () => {
  const [playing, setPlaying] = useState(false);
  
  // MIGRATION: Get values from Zustand for infrastructure
  const { duration, fps, scale, playerRef } = useStore();
  
  // ENGINE MIGRATION: Get selection from engine
  const engineSelection = useEngineSelection();
  
  const isLargeScreen = useIsLargeScreen();
  useUpdateAnsestors({ playing, playerRef });

  const currentFrame = useCurrentPlayerFrame(playerRef);
  const safeFps = fps || 30;

  const doActiveDelete = () => {
    useStore.getState().dispatch(LAYER_DELETE);
  };

  const doActiveSplit = () => {
    useStore.getState().dispatch(ACTIVE_SPLIT, {
      payload: {},
      options: {
        time: getCurrentTime()
      }
    });
  };

  const doExtractAudio = async () => {
    // MIGRATION: Use engine selection
    if (engineSelection.length === 0) return;

    const { trackItemsMap } = useStore.getState();
    const firstActiveId = engineSelection[0];
    const trackItem = trackItemsMap[firstActiveId];
    if (!trackItem) return;

    const src = (trackItem.details as any)?.src;
    if (!src) return;

    const displayFrom = (trackItem.display as any)?.from ?? 0;
    const fileName = (trackItem.details as any)?.name ?? firstActiveId;

    await extractAudioFromVideoToTimeline(src, firstActiveId, fileName, displayFrom);
  };

  const changeScale = (scale: ITimelineScaleState) => {
    if (!scale || !scale.index) return;
    useStore.getState().dispatch(TIMELINE_SCALE_CHANGED, {
      payload: {
        scale
      }
    });
  };

  const handlePlay = () => {
    useStore.getState().dispatch(PLAYER_PLAY);
  };

  const handlePause = () => {
    useStore.getState().dispatch(PLAYER_PAUSE);
  };

  const handleFrameBack = () => {
    const newFrame = Math.max(0, currentFrame - 1);
    const timeMs = (newFrame / safeFps) * 1000;
    playerRef?.current?.seekTo(Math.round(timeMs / 1000));
  };

  const handleFrameForward = () => {
    const newFrame = currentFrame + 1;
    const timeMs = (newFrame / safeFps) * 1000;
    playerRef?.current?.seekTo(Math.round(timeMs / 1000));
  };

  useEffect(() => {
    playerRef?.current?.addEventListener("play", () => {
      setPlaying(true);
    });
    playerRef?.current?.addEventListener("pause", () => {
      setPlaying(false);
    });
    return () => {
      playerRef?.current?.removeEventListener("play", () => {
        setPlaying(true);
      });
      playerRef?.current?.removeEventListener("pause", () => {
        setPlaying(false);
      });
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
  }, [currentFrame, playing, safeFps, playerRef]);

  return (
    <div
      id="timeline-header"
      style={{
        position: "relative",
        height: "50px",
        flex: "none"
      }}
    >
      <div
        style={{
          position: "absolute",
          height: 50,
          width: "100%",
          display: "flex",
          alignItems: "center"
        }}
      >
        <div
          style={{
            height: 36,
            width: "100%",
            display: "grid",
            gridTemplateColumns: isLargeScreen
              ? "1fr 300px 1fr"
              : "1fr 1fr 1fr",
            alignItems: "center"
          }}
        >
          <div className="flex px-2">
            <Button
              disabled={!engineSelection.length}
              onClick={doActiveDelete}
              variant={"ghost"}
              size={isLargeScreen ? "sm" : "icon"}
              className="flex items-center gap-1 px-2"
            >
              <Trash size={14} />{" "}
              <span className="hidden lg:block">Delete</span>
            </Button>

            <Button
              disabled={!engineSelection.length}
              onClick={doActiveSplit}
              variant={"ghost"}
              size={isLargeScreen ? "sm" : "icon"}
              className="flex items-center gap-1 px-2"
            >
              <SquareSplitHorizontal size={15} />{" "}
              <span className="hidden lg:block">Split</span>
            </Button>
            <Button
              disabled={!engineSelection.length}
              onClick={doExtractAudio}
              variant={"ghost"}
              size={isLargeScreen ? "sm" : "icon"}
              className="flex items-center gap-1 px-2"
            >
              <AudioLines size={15} />{" "}
              <span className="hidden lg:block">Extract Audio</span>
            </Button>
              <Button
                disabled={!engineSelection.length}
                onClick={() => {
                  useStore.getState().dispatch(LAYER_CLONE);
                }}
              variant={"ghost"}
              size={isLargeScreen ? "sm" : "icon"}
              className="flex items-center gap-1 px-2"
            >
              <SquareSplitHorizontal size={15} />{" "}
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
                onClick={handlePlay}
                variant={"ghost"}
                size={"icon"}
                className="h-7 w-7"
                title="Play/Pause"
              >
                {playing ? (
                  <IconPlayerPauseFilled size={14} />
                ) : (
                  <IconPlayerPlayFilled size={14} />
                )}
              </Button>
              <Button
                onClick={handlePause}
                variant={"ghost"}
                size={"icon"}
                className="h-7 w-7"
                title="Pause"
              >
                <IconPlayerPauseFilled size={14} />
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
              className="text-xs font-light flex ml-3"
              style={{
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <div
                className="font-medium text-zinc-200 tabular-nums"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  minWidth: "60px"
                }}
                id="video-current-time"
              >
                {frameToTimeString({ frame: currentFrame }, { fps: safeFps })}
              </div>
              <span className="px-1 text-muted-foreground">|</span>
              <div
                className="text-muted-foreground tabular-nums"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  minWidth: "60px"
                }}
              >
                {timeToString({ time: duration })}
              </div>
              <span className="px-1 text-muted-foreground text-[10px] ml-1">
                F:{currentFrame}
              </span>
            </div>
          </div>

          <ZoomControl
            scale={scale}
            onChangeTimelineScale={changeScale}
            duration={duration}
          />
        </div>
      </div>
    </div>
  );
};

const ZoomControl = ({
  scale,
  onChangeTimelineScale,
  duration
}: {
  scale: ITimelineScaleState;
  onChangeTimelineScale: (scale: ITimelineScaleState) => void;
  duration: number;
}) => {
  const timelineOffsetX = useTimelineOffsetX();
  const safeIndex = scale?.index ?? 7;
  const safeZoom = scale?.zoom ?? (1 / 300);

  const onZoomOutClick = () => {
    const previousZoom = getPreviousZoomLevel(scale);
    onChangeTimelineScale(previousZoom);
  };

  const onZoomInClick = () => {
    const nextZoom = getNextZoomLevel(scale);
    onChangeTimelineScale(nextZoom);
  };

  const onZoomFitClick = () => {
    const fitZoom = getFitZoomLevel(duration, safeZoom, timelineOffsetX);
    onChangeTimelineScale(fitZoom);
  };

  return (
    <div className="flex items-center justify-end pr-2">
      <div className="flex items-center gap-1">
        <Button size={"icon"} variant={"ghost"} onClick={onZoomOutClick} className="h-7 w-7" title="Zoom Out">
          <ZoomOut size={14} />
        </Button>
        <div className="hidden lg:flex items-center gap-1">
          <input
            type="range"
            min={0}
            max={12}
            step={1}
            value={safeIndex}
            onChange={(e) => {
              const idx = parseInt(e.target.value, 10);
              const zoom = getZoomByIndex(idx);
              onChangeTimelineScale(zoom);
            }}
            className="w-24 h-1 accent-primary"
          />
          <span className="text-[10px] text-muted-foreground w-8 text-center tabular-nums">
            {safeIndex.toFixed(1)}x
          </span>
        </div>
        <Button size={"icon"} variant={"ghost"} onClick={onZoomInClick} className="h-7 w-7" title="Zoom In">
          <ZoomIn size={14} />
        </Button>
        <Button onClick={onZoomFitClick} variant={"ghost"} size={"icon"} className="h-7 w-7" title="Fit">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
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
