"use client";

/**
 * Source Control Panel
 * ────────────────────
 * Independent source monitor with frame-based timeline.
 *
 *  - Drag media from project panel to preview
 *  - Frame-based timeline with In/Out markers on same track
 *  - In/Out playback (loops between { and } when set)
 *  - Insert to timeline (full, audio-only, video-only)
 *  - Keyboard: I = set In, O = set Out, Space = play/pause
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Film,
  AudioLines,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_AUDIO, ADD_IMAGE } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";

const DEFAULT_FPS = 30;

export default function SourceControlPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [inFrame, setInFrame] = useState<number | null>(null);
  const [outFrame, setOutFrame] = useState<number | null>(null);
  const [sourceSrc, setSourceSrc] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<"video" | "audio" | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  const totalFrames = Math.floor(duration * DEFAULT_FPS);
  const inFrameClamped = inFrame !== null ? Math.min(inFrame, totalFrames) : null;
  const outFrameClamped = outFrame !== null ? Math.min(outFrame, totalFrames) : null;

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const syncFrameFromVideo = useCallback(() => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    const frame = Math.floor(t * DEFAULT_FPS);
    setCurrentFrame(frame);

    if (inFrameClamped !== null && outFrameClamped !== null && frame >= outFrameClamped) {
      videoRef.current.currentTime = inFrameClamped / DEFAULT_FPS;
      setCurrentFrame(inFrameClamped);
    }
  }, [inFrameClamped, outFrameClamped]);

  const startPlaybackLoop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const loop = () => {
      syncFrameFromVideo();
      if (videoRef.current && !videoRef.current.paused) {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, [syncFrameFromVideo]);

  const stopPlaybackLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPlaybackLoop();
  }, [stopPlaybackLoop]);

  const handleEnded = useCallback(() => {
    if (inFrameClamped !== null && outFrameClamped !== null) {
      if (videoRef.current) {
        videoRef.current.currentTime = inFrameClamped / DEFAULT_FPS;
        setCurrentFrame(inFrameClamped);
        videoRef.current.play();
        setPlaying(true);
        startPlaybackLoop();
      }
    } else {
      setPlaying(false);
      stopPlaybackLoop();
    }
  }, [inFrameClamped, outFrameClamped, startPlaybackLoop, stopPlaybackLoop]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
      stopPlaybackLoop();
    } else {
      if (inFrameClamped !== null && outFrameClamped !== null) {
        videoRef.current.currentTime = inFrameClamped / DEFAULT_FPS;
        setCurrentFrame(inFrameClamped);
      }
      videoRef.current.play();
      setPlaying(true);
      startPlaybackLoop();
    }
  }, [playing, inFrameClamped, outFrameClamped, startPlaybackLoop, stopPlaybackLoop]);

  const stepFrame = useCallback((direction: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setPlaying(false);
    stopPlaybackLoop();
    const newTime = videoRef.current.currentTime + direction / DEFAULT_FPS;
    videoRef.current.currentTime = Math.max(0, Math.min(newTime, duration));
    setCurrentFrame(Math.floor(videoRef.current.currentTime * DEFAULT_FPS));
  }, [duration, stopPlaybackLoop]);

  const setIn = useCallback(() => {
    if (!videoRef.current) return;
    setInFrame(Math.floor(videoRef.current.currentTime * DEFAULT_FPS));
  }, []);

  const setOut = useCallback(() => {
    if (!videoRef.current) return;
    setOutFrame(Math.floor(videoRef.current.currentTime * DEFAULT_FPS));
  }, []);

  const clearInOut = useCallback(() => {
    setInFrame(null);
    setOutFrame(null);
  }, []);

  const goToFrame = useCallback((frame: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(frame, totalFrames));
    videoRef.current.currentTime = clamped / DEFAULT_FPS;
    setCurrentFrame(clamped);
  }, [totalFrames]);

  const handleScrubberClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || !videoRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const frame = Math.floor(pct * totalFrames);
    goToFrame(frame);
  }, [totalFrames, goToFrame]);

  const handleScrubberDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    if (!scrubberRef.current || !videoRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const frame = Math.floor(pct * totalFrames);
    goToFrame(frame);
  }, [isScrubbing, totalFrames, goToFrame]);

  const insertToTimeline = useCallback((fileType?: string) => {
    if (!sourceSrc || !sourceType) return;

    const ft = fileType || sourceType;
    const id = generateId();
    const inSec = inFrameClamped !== null ? inFrameClamped / DEFAULT_FPS : 0;
    const outSec = outFrameClamped !== null ? outFrameClamped / DEFAULT_FPS : duration;
    const clipDur = (outSec - inSec) * 1000;

    const payload = {
      id,
      details: { src: sourceSrc },
      metadata: { previewUrl: sourceSrc, duration: duration * 1000 },
      display: { from: 0, to: clipDur > 0 ? clipDur : duration * 1000 },
      trim: { from: inSec * 1000, to: outSec * 1000 },
    };

    switch (ft) {
      case "video":
        dispatch(ADD_VIDEO, { payload, options: { resourceId: "main", scaleMode: "fit" } });
        break;
      case "audio":
        dispatch(ADD_AUDIO, { payload: { ...payload, type: "audio" }, options: {} });
        break;
      case "image":
        dispatch(ADD_IMAGE, { payload: { ...payload, type: "image" }, options: {} });
        break;
    }
  }, [sourceSrc, sourceType, duration, inFrameClamped, outFrameClamped]);

  const buildDragPayload = useCallback((fileType?: string) => {
    if (!sourceSrc || !sourceType) return null;
    const ft = fileType || sourceType;
    const inSec = inFrameClamped !== null ? inFrameClamped / DEFAULT_FPS : 0;
    const outSec = outFrameClamped !== null ? outFrameClamped / DEFAULT_FPS : duration;

    return {
      type: "track-item",
      src: sourceSrc,
      name: sourceName,
      fileType: ft,
      duration,
      trimFrom: inSec,
      trimTo: outSec,
      hasInOut: inFrameClamped !== null && outFrameClamped !== null,
    };
  }, [sourceSrc, sourceType, sourceName, duration, inFrameClamped, outFrameClamped]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    const payload = buildDragPayload();
    if (!payload) return;
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  }, [buildDragPayload]);

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
      const data = e.dataTransfer.getData("text/plain");
      if (!data || data === "text/plain") return;
      const item = JSON.parse(data);
      if (item.type === "track-item" && item.src) {
        setSourceSrc(item.src);
        setSourceName(item.name || "Dropped clip");
        setSourceType(item.fileType || "video");
        setInFrame(null);
        setOutFrame(null);
        setCurrentFrame(0);
        setPlaying(false);
        stopPlaybackLoop();
        if (videoRef.current) videoRef.current.currentTime = 0;
      }
    } catch {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
          const url = URL.createObjectURL(file);
          setSourceSrc(url);
          setSourceName(file.name);
          setSourceType(file.type.startsWith("video/") ? "video" : "audio");
          setInFrame(null);
          setOutFrame(null);
          setCurrentFrame(0);
          setPlaying(false);
          stopPlaybackLoop();
          if (videoRef.current) videoRef.current.currentTime = 0;
        }
      }
    }
  }, [stopPlaybackLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sourceSrc) return;
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
  }, [sourceSrc, setIn, setOut, togglePlay, stepFrame]);

  const formatTimecode = (frame: number) => {
    const totalSec = frame / DEFAULT_FPS;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    const f = frame % DEFAULT_FPS;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
  };

  const playheadPct = totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;
  const inPct = totalFrames > 0 && inFrameClamped !== null ? (inFrameClamped / totalFrames) * 100 : null;
  const outPct = totalFrames > 0 && outFrameClamped !== null ? (outFrameClamped / totalFrames) * 100 : null;

  const frameMarkers = [];
  const markerInterval = Math.max(1, Math.floor(totalFrames / 20));
  for (let f = 0; f <= totalFrames; f += markerInterval) {
    frameMarkers.push(f);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Source
        </span>
        <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
          {sourceName || "No clip selected"}
        </span>
      </div>

      <div
        className={cn(
          "relative flex-1 bg-black/40 flex items-center justify-center min-h-[120px] transition-colors",
          dragOver && "bg-blue-500/10 ring-2 ring-blue-400/50 ring-inset"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {sourceSrc && sourceType === "video" ? (
          <div
            className="w-full h-full relative"
            draggable
            onDragStart={handleDragStart}
          >
            <video
              ref={videoRef}
              src={sourceSrc}
              className="w-full h-full object-contain pointer-events-none"
              muted
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              onClick={togglePlay}
            />
          </div>
        ) : sourceSrc && sourceType === "audio" ? (
          <div
            className="flex flex-col items-center gap-3 text-muted-foreground cursor-grab"
            draggable
            onDragStart={handleDragStart}
          >
            <AudioLines className="w-12 h-12 opacity-30" />
            <span className="text-xs">{sourceName}</span>
            <audio
              ref={videoRef as any}
              src={sourceSrc}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Film className="w-10 h-10 opacity-20" />
            <span className="text-[10px]">Drop media here</span>
          </div>
        )}

        {sourceSrc && totalFrames > 0 && (inPct !== null || outPct !== null) && (
          <div className="absolute inset-0 pointer-events-none">
            {inPct !== null && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-emerald-400"
                style={{ left: `${inPct}%` }}
              >
                <span className="absolute top-1 -translate-x-1/2 bg-emerald-400 text-[9px] text-black px-0.5 font-bold">
                  {"{"}
                </span>
              </div>
            )}
            {outPct !== null && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-red-400"
                style={{ left: `${outPct}%` }}
              >
                <span className="absolute top-1 -translate-x-1/2 bg-red-400 text-[9px] text-black px-0.5 font-bold">
                  {"}"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Frame-based timeline */}
      <div className="px-2 py-1.5 border-t border-border/40">
        {/* Timecode display */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-emerald-400 tabular-nums">
            {inFrameClamped !== null ? formatTimecode(inFrameClamped) : "--:--:--:--"}
          </span>
          <span className="text-[11px] font-mono text-foreground tabular-nums font-bold">
            {formatTimecode(currentFrame)}
          </span>
          <span className="text-[10px] font-mono text-red-400 tabular-nums">
            {outFrameClamped !== null ? formatTimecode(outFrameClamped) : "--:--:--:--"}
          </span>
        </div>

        {/* Frame ruler with tick marks */}
        <div
          ref={scrubberRef}
          className="relative h-6 bg-black/30 rounded cursor-pointer select-none"
          onClick={handleScrubberClick}
          onMouseDown={(e) => {
            setIsScrubbing(true);
            handleScrubberClick(e);
          }}
          onMouseMove={handleScrubberDrag}
          onMouseUp={() => setIsScrubbing(false)}
          onMouseLeave={() => setIsScrubbing(false)}
        >
          {/* In/Out range highlight */}
          {inPct !== null && outPct !== null && (
            <div
              className="absolute top-0 bottom-0 bg-emerald-400/10"
              style={{
                left: `${inPct}%`,
                width: `${outPct - inPct}%`,
              }}
            />
          )}

          {/* Frame tick marks */}
          {frameMarkers.map((f) => {
            const pct = (f / totalFrames) * 100;
            const isSecond = f % DEFAULT_FPS === 0;
            return (
              <div
                key={f}
                className="absolute bottom-0 bg-muted-foreground/40"
                style={{
                  left: `${pct}%`,
                  width: "1px",
                  height: isSecond ? "8px" : "4px",
                }}
              />
            );
          })}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white transition-none"
            style={{ left: `${playheadPct}%`, transform: "translateX(-1px)" }}
          >
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-1.5 bg-white rounded-sm" />
          </div>
        </div>

        {/* Frame number */}
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[9px] text-muted-foreground">0</span>
          <span className="text-[9px] text-muted-foreground">
            Frame {currentFrame} / {totalFrames}
          </span>
          <span className="text-[9px] text-muted-foreground">{totalFrames}</span>
        </div>
      </div>

      {/* Transport controls */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-t border-border/40">
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => stepFrame(-1)} title="Previous Frame (Left)">
          <SkipBack className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={togglePlay} title="Play/Pause (Space)">
          {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => stepFrame(1)} title="Next Frame (Right)">
          <SkipForward className="w-3 h-3" />
        </Button>

        <div className="w-px h-4 bg-border/40 mx-0.5" />

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 w-6 shrink-0 p-0 font-mono",
            inFrameClamped !== null ? "text-emerald-400 bg-emerald-400/10" : "text-muted-foreground"
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
            "h-6 w-6 shrink-0 p-0 font-mono",
            outFrameClamped !== null ? "text-red-400 bg-red-400/10" : "text-muted-foreground"
          )}
          onClick={setOut}
          title="Set Out Point (O)"
        >
          <span className="text-[10px]">{"}"}</span>
        </Button>
        {(inFrameClamped !== null || outFrameClamped !== null) && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={clearInOut} title="Clear In/Out">
            <RotateCcw className="w-2.5 h-2.5" />
          </Button>
        )}

        <div className="w-px h-4 bg-border/40 mx-0.5" />

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          disabled={!sourceSrc}
          onClick={() => insertToTimeline()}
          title="Insert to timeline"
        >
          <Film className="w-3.5 h-3.5" />
        </Button>
        {sourceType === "video" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-purple-400"
              disabled={!sourceSrc}
              onClick={() => insertToTimeline("audio")}
              title="Insert audio only"
            >
              <AudioLines className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-blue-400"
              disabled={!sourceSrc}
              onClick={() => insertToTimeline("video")}
              title="Insert video only"
            >
              <Video className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
