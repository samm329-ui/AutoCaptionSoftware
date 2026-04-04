"use client";

/**
 * Source Control Panel
 * ────────────────────
 * Premiere Pro-style Source Monitor.
 *
 *  - Preview selected clip
 *  - In/Out playback (loops between { and } when set)
 *  - Cut / Trim / Extract Audio / Extract Video (icon-only)
 *  - Drag clips from project panel to preview to set source
 *  - Drag from source preview to timeline to insert
 *  - Keyboard: I = set In, O = set Out, Space = play/pause
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
  const [dragOver, setDragOver] = useState(false);
  const inOutLoopRef = useRef<number | null>(null);

  const activeId = activeIds[0];
  const activeItem = activeId ? trackItemsMap[activeId] : null;
  const isVideo = activeItem?.type === "video";
  const isAudio = activeItem?.type === "audio";
  const hasSource = isVideo || isAudio;

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

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    if (inPoint !== null && outPoint !== null && t >= outPoint) {
      videoRef.current.currentTime = inPoint;
      setCurrentTime(inPoint);
    }
  }, [inPoint, outPoint]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      if (inOutLoopRef.current) {
        cancelAnimationFrame(inOutLoopRef.current);
        inOutLoopRef.current = null;
      }
    } else {
      if (inPoint !== null && outPoint !== null) {
        videoRef.current.currentTime = inPoint;
        setCurrentTime(inPoint);
      }
      videoRef.current.play();
      setPlaying(true);
    }
  }, [playing, inPoint, outPoint]);

  const handleEnded = useCallback(() => {
    if (inPoint !== null && outPoint !== null) {
      if (videoRef.current) {
        videoRef.current.currentTime = inPoint;
        setCurrentTime(inPoint);
        videoRef.current.play();
        setPlaying(true);
      }
    } else {
      setPlaying(false);
    }
  }, [inPoint, outPoint]);

  const stepFrame = useCallback((direction: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setPlaying(false);
    if (inOutLoopRef.current) {
      cancelAnimationFrame(inOutLoopRef.current);
      inOutLoopRef.current = null;
    }
    videoRef.current.currentTime += direction / (fps || 30);
    setCurrentTime(videoRef.current.currentTime);
  }, [fps]);

  const setIn = useCallback(() => {
    if (!videoRef.current) return;
    setInPoint(videoRef.current.currentTime);
  }, []);

  const setOut = useCallback(() => {
    if (!videoRef.current) return;
    setOutPoint(videoRef.current.currentTime);
  }, []);

  const clearInOut = useCallback(() => {
    setInPoint(null);
    setOutPoint(null);
  }, []);

  const handleCut = useCallback(() => {
    if (!activeId) return;
    dispatch(ACTIVE_SPLIT, {
      payload: {},
      options: { time: currentFrame / (fps || 30) * 1000 },
    });
  }, [activeId, currentFrame, fps]);

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

  const handleExtractVideo = useCallback(() => {
    if (!activeId || !activeItem) return;
    const src = (activeItem.details as any)?.src;
    if (!src) return;

    dispatch(EDIT_OBJECT, {
      payload: {
        [activeId]: {
          details: { volume: 0 },
          metadata: { hasExtractedAudio: true },
        },
      },
    });
  }, [activeId, activeItem]);

  const handleTrimToSelection = useCallback(() => {
    if (!activeId || !activeItem || inPoint === null || outPoint === null) return;
    const trimFrom = activeItem.trim?.from ?? 0;
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasSource) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case "i": e.preventDefault(); setIn(); break;
        case "o": e.preventDefault(); setOut(); break;
        case " ": e.preventDefault(); togglePlay(); break;
        case "arrowleft": e.preventDefault(); stepFrame(-1); break;
        case "arrowright": e.preventDefault(); stepFrame(1); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasSource, setIn, setOut, togglePlay, stepFrame]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    try {
      const data = e.dataTransfer.getData("application/json");
      if (!data) return;
      const item = JSON.parse(data);
      if (item.type === "track-item" && item.src) {
        setSourceSrc(item.src);
        setSourceName(item.name || "Dropped clip");
        setInPoint(null);
        setOutPoint(null);
      }
    } catch {
      // dropped files
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
          const url = URL.createObjectURL(file);
          setSourceSrc(url);
          setSourceName(file.name);
          setInPoint(null);
          setOutPoint(null);
        }
      }
    }
  }, []);

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
        <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
          {sourceName || "No clip selected"}
        </span>
      </div>

      {/* Preview area */}
      <div
        className={cn(
          "relative flex-1 bg-black/40 flex items-center justify-center min-h-[120px] transition-colors",
          dragOver && "bg-blue-500/10 ring-2 ring-blue-400/50 ring-inset"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
            <span className="text-[10px]">Select or drop a clip</span>
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
                <span className="absolute -top-0 -translate-x-1/2 bg-emerald-400 text-[9px] text-black px-0.5 font-bold">
                  {"{"}
                </span>
              </div>
            )}
            {outPoint !== null && duration > 0 && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-red-400"
                style={{ left: `${(outPoint / duration) * 100}%` }}
              >
                <span className="absolute -top-0 -translate-x-1/2 bg-red-400 text-[9px] text-black px-0.5 font-bold">
                  {"}"}
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
      <div className="relative px-3 py-1">
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
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-center gap-1 px-3 py-1.5 border-t border-border/40">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => stepFrame(-1)} title="Previous Frame">
          <SkipBack className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={togglePlay} title="Play/Pause">
          {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => stepFrame(1)} title="Next Frame">
          <SkipForward className="w-3 h-3" />
        </Button>
      </div>

      {/* In/Out controls */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-5 px-1.5 font-mono",
            inPoint !== null ? "text-emerald-400 bg-emerald-400/10" : "text-muted-foreground"
          )}
          onClick={setIn}
          title="Set In Point (I)"
        >
          <span className="text-[10px]">{"{"}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-5 px-1.5 font-mono",
            outPoint !== null ? "text-red-400 bg-red-400/10" : "text-muted-foreground"
          )}
          onClick={setOut}
          title="Set Out Point (O)"
        >
          <span className="text-[10px]">{"}"}</span>
        </Button>
        {(inPoint !== null || outPoint !== null) && (
          <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={clearInOut} title="Clear In/Out">
            <RotateCcw className="w-2.5 h-2.5" />
          </Button>
        )}
      </div>

      {/* Action buttons — icons only */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-border/40 justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!activeId}
          onClick={handleCut}
          title="Cut at playhead"
        >
          <Scissors className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!activeId || inPoint === null || outPoint === null}
          onClick={handleTrimToSelection}
          title="Trim to In/Out selection"
        >
          <SquareSplitHorizontal className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-purple-400"
          disabled={!isVideo || !sourceSrc || !activeId}
          onClick={handleExtractAudio}
          title="Extract audio to new track"
        >
          <AudioLines className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-blue-400"
          disabled={!isVideo || !activeId}
          onClick={handleExtractVideo}
          title="Remove audio from video"
        >
          <Video className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
