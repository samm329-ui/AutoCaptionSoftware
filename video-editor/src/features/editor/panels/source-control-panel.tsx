"use client";

/**
 * Source Control Panel
 * ────────────────────
 * Independent source monitor — not tied to timeline selection.
 * Media stays loaded even if timeline clips are deleted.
 *
 *  - Drag media from project panel to preview
 *  - In/Out playback (loops between { and } when set)
 *  - Insert to timeline (full, audio-only, video-only)
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
  RotateCcw,
  Film,
  AudioLines,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import useStore from "../store/use-store";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_AUDIO, ADD_IMAGE } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";

export default function SourceControlPanel() {
  const { playerRef, fps } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);
  const [sourceSrc, setSourceSrc] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<"video" | "audio" | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
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

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      if (inPoint !== null && outPoint !== null) {
        videoRef.current.currentTime = inPoint;
        setCurrentTime(inPoint);
      }
      videoRef.current.play();
      setPlaying(true);
    }
  }, [playing, inPoint, outPoint]);

  const stepFrame = useCallback((direction: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setPlaying(false);
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

  const insertToTimeline = useCallback((fileType?: string) => {
    if (!sourceSrc || !sourceType) return;

    const ft = fileType || sourceType;
    const id = generateId();
    const dur = duration;
    const inSec = inPoint ?? 0;
    const outSec = outPoint ?? dur;
    const clipDur = (outSec - inSec) * 1000;

    const payload = {
      id,
      details: { src: sourceSrc },
      metadata: { previewUrl: sourceSrc, duration: dur * 1000 },
      display: { from: 0, to: clipDur > 0 ? clipDur : dur * 1000 },
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
  }, [sourceSrc, sourceType, duration, inPoint, outPoint]);

  const buildDragPayload = useCallback((fileType?: string) => {
    if (!sourceSrc || !sourceType) return null;
    const ft = fileType || sourceType;
    const dur = duration;
    const inSec = inPoint ?? 0;
    const outSec = outPoint ?? dur;

    return {
      type: "track-item",
      src: sourceSrc,
      name: sourceName,
      fileType: ft,
      duration: dur,
      trimFrom: inSec,
      trimTo: outSec,
      hasInOut: inPoint !== null && outPoint !== null,
    };
  }, [sourceSrc, sourceType, sourceName, duration, inPoint, outPoint]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    const payload = buildDragPayload();
    if (!payload) return;
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  }, [buildDragPayload]);

  const handleDragStartAudioOnly = useCallback((e: React.DragEvent) => {
    if (sourceType !== "video") return;
    const payload = buildDragPayload("audio");
    if (!payload) return;
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  }, [sourceType, buildDragPayload]);

  const handleDragStartVideoOnly = useCallback((e: React.DragEvent) => {
    if (sourceType !== "video") return;
    const payload = buildDragPayload("video");
    if (!payload) return;
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  }, [sourceType, buildDragPayload]);

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
        setInPoint(null);
        setOutPoint(null);
        setCurrentTime(0);
        setPlaying(false);
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
          setInPoint(null);
          setOutPoint(null);
          setCurrentTime(0);
          setPlaying(false);
          if (videoRef.current) videoRef.current.currentTime = 0;
        }
      }
    }
  }, []);

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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${m}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  const displayDuration = duration > 0 ? duration : 0;

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
              onTimeUpdate={handleTimeUpdate}
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
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Film className="w-10 h-10 opacity-20" />
            <span className="text-[10px]">Drop media here</span>
          </div>
        )}

        {sourceSrc && displayDuration > 0 && (inPoint !== null || outPoint !== null) && (
          <div className="absolute inset-0 pointer-events-none">
            {inPoint !== null && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-emerald-400"
                style={{ left: `${(inPoint / displayDuration) * 100}%` }}
              >
                <span className="absolute -top-0 -translate-x-1/2 bg-emerald-400 text-[9px] text-black px-0.5 font-bold">
                  {"{"}
                </span>
              </div>
            )}
            {outPoint !== null && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-red-400"
                style={{ left: `${(outPoint / displayDuration) * 100}%` }}
              >
                <span className="absolute -top-0 -translate-x-1/2 bg-red-400 text-[9px] text-black px-0.5 font-bold">
                  {"}"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-1 bg-black/20">
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0">
          {formatTime(currentTime)}
        </span>
        <div className="flex-1">
          <Slider
            value={[currentTime]}
            max={displayDuration || 100}
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
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0">
          {formatTime(displayDuration)}
        </span>
      </div>

      <div className="flex items-center gap-0.5 px-2 py-1.5 border-t border-border/40">
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => stepFrame(-1)} title="Previous Frame">
          <SkipBack className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={togglePlay} title="Play/Pause">
          {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => stepFrame(1)} title="Next Frame">
          <SkipForward className="w-3 h-3" />
        </Button>

        <div className="w-px h-4 bg-border/40 mx-0.5" />

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 w-6 shrink-0 p-0 font-mono",
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
            "h-6 w-6 shrink-0 p-0 font-mono",
            outPoint !== null ? "text-red-400 bg-red-400/10" : "text-muted-foreground"
          )}
          onClick={setOut}
          title="Set Out Point (O)"
        >
          <span className="text-[10px]">{"}"}</span>
        </Button>
        {(inPoint !== null || outPoint !== null) && (
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
