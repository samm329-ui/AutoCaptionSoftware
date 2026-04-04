"use client";

/**
 * Source Control Panel
 * ────────────────────
 * Premiere Pro-style Source Monitor for the left sidebar.
 *
 * Features:
 *  - Preview the currently selected timeline clip
 *  - Set In/Out points (I/O keys or buttons) for trimming
 *  - Cut at playhead position (splits the clip)
 *  - Extract Audio (creates separate audio track, mutes source)
 *  - Extract Video Only (mutes audio permanently)
 *  - Frame-by-frame stepping
 *  - Play/Pause with spacebar
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  AudioLines,
  Video,
  SquareSplitHorizontal,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import useStore from "../store/use-store";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { extractAudioFromVideoToTimeline } from "@/store/upload-store";
import { dispatch } from "@designcombo/events";
import { ACTIVE_SPLIT, EDIT_OBJECT } from "@designcombo/state";
import { timeToString } from "../utils/time";

export default function SourceControlPanel() {
  const { playerRef, fps, activeIds, trackItemsMap } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);
  const [sourceSrc, setSourceSrc] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");

  // Get the active track item
  const activeId = activeIds[0];
  const activeItem = activeId ? trackItemsMap[activeId] : null;
  const isVideo = activeItem?.type === "video";
  const isAudio = activeItem?.type === "audio";
  const hasSource = isVideo || isAudio;

  // Update source when selection changes
  useEffect(() => {
    if (activeItem && (activeItem.type === "video" || activeItem.type === "audio")) {
      const src = (activeItem.details as any)?.src;
      if (src) {
        setSourceSrc(src);
        setSourceName(activeItem.name || activeItem.id);
        setInPoint(null);
        setOutPoint(null);
      }
    } else {
      setSourceSrc(null);
      setSourceName("");
    }
  }, [activeId, activeItem]);

  // Sync video element to player frame when playing
  useEffect(() => {
    if (!videoRef.current || !sourceSrc || !isVideo) return;
    const video = videoRef.current;
    const frameTime = (currentFrame / (fps || 30)) * 1000;
    const trimFrom = activeItem?.trim?.from ?? 0;
    const displayFrom = activeItem?.display?.from ?? 0;
    const localTime = frameTime - displayFrom + trimFrom;

    if (Math.abs(video.currentTime * 1000 - localTime) > 100) {
      video.currentTime = localTime / 1000;
    }
  }, [currentFrame, fps, sourceSrc, isVideo, activeItem]);

  // Handle video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      // If we have in/out points, only play within range
      if (inPoint !== null && outPoint !== null) {
        videoRef.current.currentTime = inPoint;
      }
      videoRef.current.play();
    }
    setPlaying(!playing);
  }, [playing, inPoint, outPoint]);

  // Handle ended
  const handleEnded = useCallback(() => {
    setPlaying(false);
    // Loop within in/out points if set
    if (inPoint !== null) {
      if (videoRef.current) {
        videoRef.current.currentTime = inPoint;
        videoRef.current.play();
        setPlaying(true);
      }
    }
  }, [inPoint]);

  // Step forward/backward one frame
  const stepFrame = useCallback((direction: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += direction / (fps || 30);
    setCurrentTime(videoRef.current.currentTime);
  }, [fps]);

  // Set In point
  const setIn = useCallback(() => {
    if (!videoRef.current) return;
    setInPoint(videoRef.current.currentTime);
    if (outPoint !== null && videoRef.current.currentTime > outPoint) {
      setOutPoint(null);
    }
  }, [outPoint]);

  // Set Out point
  const setOut = useCallback(() => {
    if (!videoRef.current) return;
    setOutPoint(videoRef.current.currentTime);
    if (inPoint !== null && videoRef.current.currentTime < inPoint) {
      setInPoint(null);
    }
  }, [inPoint]);

  // Clear In/Out
  const clearInOut = useCallback(() => {
    setInPoint(null);
    setOutPoint(null);
  }, []);

  // Cut at playhead (splits the active clip)
  const handleCut = useCallback(() => {
    if (!activeId) return;
    dispatch(ACTIVE_SPLIT, {
      payload: {},
      options: { time: currentFrame / (fps || 30) * 1000 },
    });
  }, [activeId, currentFrame, fps]);

  // Extract audio from the source video
  const handleExtractAudio = useCallback(async () => {
    if (!activeItem || !sourceSrc || !activeId) return;
    const displayFrom = (activeItem.display as any)?.from ?? 0;
    await extractAudioFromVideoToTimeline(
      sourceSrc,
      activeId,
      activeItem.name,
      displayFrom
    );
  }, [activeItem, sourceSrc, activeId]);

  // Mute the source video (extract video only)
  const handleExtractVideoOnly = useCallback(() => {
    if (!activeId) return;
    dispatch(EDIT_OBJECT, {
      payload: {
        [activeId]: {
          details: { volume: 0 },
          metadata: { hasExtractedAudio: true },
        },
      },
    });
  }, [activeId]);

  // Trim active clip to in/out points
  const handleTrimToSelection = useCallback(() => {
    if (!activeId || !activeItem || inPoint === null || outPoint === null) return;
    const trimFrom = activeItem.trim?.from ?? 0;
    const trimTo = activeItem.trim?.to ?? 0;
    const totalDuration = trimTo - trimFrom;

    const newTrimFrom = trimFrom + inPoint * 1000;
    const newTrimTo = trimFrom + outPoint * 1000;

    dispatch(EDIT_OBJECT, {
      payload: {
        [activeId]: {
          trim: { from: newTrimFrom, to: newTrimTo },
          display: {
            from: activeItem.display.from,
            to: activeItem.display.from + (outPoint - inPoint) * 1000,
          },
        },
      },
    });
  }, [activeId, activeItem, inPoint, outPoint]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasSource) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "i":
          e.preventDefault();
          setIn();
          break;
        case "o":
          e.preventDefault();
          setOut();
          break;
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
          e.preventDefault();
          stepFrame(-1);
          break;
        case "arrowright":
          e.preventDefault();
          stepFrame(1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasSource, setIn, setOut, togglePlay, stepFrame]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${m}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Source
        </span>
        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
          {sourceName || "No clip selected"}
        </span>
      </div>

      {/* Preview area */}
      <div className="relative flex-1 bg-black/40 flex items-center justify-center min-h-[120px]">
        {hasSource && sourceSrc ? (
          isVideo ? (
            <video
              ref={videoRef}
              src={sourceSrc}
              className="w-full h-full object-contain"
              muted
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onClick={togglePlay}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <AudioLines className="w-12 h-12 opacity-30" />
              <span className="text-xs">{sourceName}</span>
              <audio
                ref={videoRef as any}
                src={sourceSrc}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
              />
            </div>
          )
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Video className="w-10 h-10 opacity-20" />
            <span className="text-[10px]">Select a clip to preview</span>
          </div>
        )}

        {/* In/Out overlay markers */}
        {hasSource && (inPoint !== null || outPoint !== null) && (
          <div className="absolute inset-0 pointer-events-none">
            {inPoint !== null && duration > 0 && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-emerald-400"
                style={{ left: `${(inPoint / duration) * 100}%` }}
              >
                <span className="absolute -top-0 -translate-x-1/2 bg-emerald-400 text-[8px] text-black px-1 font-bold">
                  IN
                </span>
              </div>
            )}
            {outPoint !== null && duration > 0 && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-red-400"
                style={{ left: `${(outPoint / duration) * 100}%` }}
              >
                <span className="absolute -top-0 -translate-x-1/2 bg-red-400 text-[8px] text-black px-1 font-bold">
                  OUT
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Time display */}
      <div className="flex items-center justify-between px-3 py-1 bg-black/20">
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
          {formatTime(currentTime)}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
          {formatTime(duration)}
        </span>
      </div>

      {/* Scrubber */}
      <div className="px-3 py-1">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.01}
          onValueChange={([v]) => {
            if (videoRef.current) {
              videoRef.current.currentTime = v;
              setCurrentTime(v);
            }
          }}
          className="h-1"
        />
        {/* In/Out range highlight */}
        {inPoint !== null && outPoint !== null && duration > 0 && (
          <div
            className="absolute h-1 bg-emerald-400/30 rounded-sm"
            style={{
              left: `${(inPoint / duration) * 100}%`,
              width: `${((outPoint - inPoint) / duration) * 100}%`,
            }}
          />
        )}
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-center gap-1 px-3 py-2 border-t border-border/40">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => stepFrame(-1)}
          title="Previous Frame (←)"
        >
          <SkipBack className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={togglePlay}
          title="Play/Pause (Space)"
        >
          {playing ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => stepFrame(1)}
          title="Next Frame (→)"
        >
          <SkipForward className="w-3 h-3" />
        </Button>
      </div>

      {/* In/Out controls */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-5 text-[9px] px-1.5 font-mono",
            inPoint !== null ? "text-emerald-400 bg-emerald-400/10" : "text-muted-foreground"
          )}
          onClick={setIn}
          title="Set In Point (I)"
        >
          I{inPoint !== null ? ` ${formatTime(inPoint)}` : ""}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-5 text-[9px] px-1.5 font-mono",
            outPoint !== null ? "text-red-400 bg-red-400/10" : "text-muted-foreground"
          )}
          onClick={setOut}
          title="Set Out Point (O)"
        >
          O{outPoint !== null ? ` ${formatTime(outPoint)}` : ""}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 ml-auto"
          onClick={clearInOut}
          title="Clear In/Out"
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-1 px-3 py-2 border-t border-border/40">
        <div className="grid grid-cols-2 gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[9px] gap-1"
            disabled={!activeId}
            onClick={handleCut}
          >
            <Scissors className="w-3 h-3" />
            Cut
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[9px] gap-1"
            disabled={!activeId || inPoint === null || outPoint === null}
            onClick={handleTrimToSelection}
          >
            <SquareSplitHorizontal className="w-3 h-3" />
            Trim
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[9px] gap-1 text-purple-400 border-purple-400/30 hover:bg-purple-400/10"
            disabled={!isVideo || !sourceSrc || !activeId}
            onClick={handleExtractAudio}
          >
            <AudioLines className="w-3 h-3" />
            Extract Audio
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[9px] gap-1 text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
            disabled={!isVideo || !activeId}
            onClick={handleExtractVideoOnly}
          >
            <Video className="w-3 h-3" />
            Mute Audio
          </Button>
        </div>
      </div>
    </div>
  );
}
