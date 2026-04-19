/**
 * timeline/timeline.tsx — ENGINE-FIRST
 * Fixed version with proper clip rendering and tool behavior
 */

"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Header from "./header";
import Ruler from "./ruler";
import Playhead from "./playhead";
import TrackHeaders from "./track-headers";
import { TimelineVerticalScrollbar } from "./vertical-scrollbar";
import TimelineMarkersLayer from "../panels/timeline-markers";
import DecibelMeter from "./decibel-meter";

import {
  useEngineSelector,
  useEngineDispatch,
  useEngineZoom,
} from "../engine/engine-provider";
import {
  selectAllClips,
  selectSelection,
  selectDuration,
  selectOrderedTracks,
  selectTrackClips,
  selectNaturalEndMs,
} from "../engine/selectors";
import { setSelection, setPlayhead, seekPlayer, splitClip, moveClip, setScroll } from "../engine/commands";
import { msToPx, pxToMs, pxToFrame, zoomToPixelsPerMs } from "../engine/time-scale";
import { engineStore, nanoid } from "../engine/engine-core";
import { getDragData } from "@/components/shared/drag-data";
import { addFileToTimeline, type UploadedFile } from "@/store/upload-store";
import { usePlayerRef } from "../engine/engine-hooks";

const TRACK_HEIGHT = 50;

const Timeline = () => {
  const dispatch = useEngineDispatch();
  const tracks = useEngineSelector(selectOrderedTracks);
  const clips = useEngineSelector(selectAllClips);
  const selection = useEngineSelector(selectSelection);
  const zoom = useEngineZoom();
  const sequenceDuration = useEngineSelector(selectDuration);
  const naturalEndMs = useEngineSelector(selectNaturalEndMs);
  const activeTool = useEngineSelector((state) => state.ui?.activeTool ?? "select");
  const playheadTime = useEngineSelector((state) => state.ui?.playheadTime ?? 0);
  const scrollX = useEngineSelector((state) => state.ui?.scrollX ?? 0);
  const playerRef = usePlayerRef();

  const timelineRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isDraggingClip, setIsDraggingClip] = useState(false);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  
  // Calculate pixels per millisecond using shared helper
  const pixelsPerMs = zoomToPixelsPerMs(zoom);

  const onRulerClick = useCallback((pixels: number) => {
    // Convert pixels to milliseconds using shared helper
    const timeMs = pxToMs(pixels, pixelsPerMs);
    const frame = pxToFrame(pixels, pixelsPerMs);
    dispatch(setPlayhead(timeMs));
    seekPlayer(frame);
  }, [dispatch, pixelsPerMs]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget as HTMLElement;
    setScrollLeft(target.scrollLeft);
  }, []);

  const handleClipClick = useCallback((e: React.MouseEvent, clipId: string) => {
    e.stopPropagation();
    
    if (activeTool === "select") {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        const currentSelection = selection ?? [];
        if (currentSelection.includes(clipId)) {
          dispatch(setSelection(currentSelection.filter(id => id !== clipId)));
        } else {
          dispatch(setSelection([...currentSelection, clipId]));
        }
      } else {
        dispatch(setSelection([clipId]));
      }
    } else if (activeTool === "trackSelect") {
      const state = engineStore.getState();
      const clip = state.clips[clipId];
      if (!clip) return;
      
      const trackClips = selectTrackClips(clip.trackId)(state);
      const forwardClips = trackClips.filter(c => c.display.from >= playheadTime);
      const clipIds = forwardClips.map(c => c.id);
      
      if (clipIds.length > 0) {
        dispatch(setSelection(clipIds));
      }
    } else if (activeTool === "razor") {
      const clip = clips.find(c => c.id === clipId);
      if (!clip) return;
      
      if (playheadTime > clip.display.from && playheadTime < clip.display.to) {
        dispatch(splitClip(clipId, playheadTime));
      }
    } else {
      dispatch(setSelection([clipId]));
    }
  }, [dispatch, activeTool, selection, playheadTime, clips]);

  const handleClipMouseDown = useCallback((e: React.MouseEvent, clipId: string) => {
    if (activeTool === "select" || activeTool === "rippleEdit") {
      e.stopPropagation();
      const clip = clips.find(c => c.id === clipId);
      if (!clip) return;
      
      setIsDraggingClip(true);
      setDragClipId(clipId);
      setDragStartX(e.clientX);
      setDragStartTime(clip.display.from);
    }
  }, [activeTool, clips]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingClip && dragClipId) {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerMs;
      const newStart = Math.max(0, dragStartTime + deltaTime);
      
      dispatch(moveClip(dragClipId, newStart));
    }
    
    if (activeTool === "hand" && e.buttons === 1) {
      const deltaX = e.movementX;
      const deltaY = e.movementY;
      const newScrollX = Math.max(0, scrollX - deltaX);
      dispatch(setScroll(newScrollX, undefined));
    }
  }, [isDraggingClip, dragClipId, dragStartX, dragStartTime, pixelsPerMs, activeTool, scrollX, dispatch]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingClip(false);
    setDragClipId(null);
  }, []);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.track-header') || target.closest('.clip')) return;
    
    if (activeTool === "select") {
      dispatch(setSelection([]));
    } else if (activeTool === "trackSelect") {
      const clickTime = (e.nativeEvent.offsetX - 120) / pixelsPerMs;
      if (clickTime > 0) {
        const forwardClips = clips.filter(c => c.display.from >= clickTime);
        const clipIds = forwardClips.map(c => c.id);
        if (clipIds.length > 0) {
          dispatch(setSelection(clipIds));
        }
      }
    }
  }, [dispatch, activeTool, clips, pixelsPerMs]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video": return "bg-blue-500/80 border-blue-400";
      case "audio": return "bg-green-500/80 border-green-400";
      case "text": return "bg-purple-500/80 border-purple-400";
      case "caption": return "bg-yellow-500/80 border-yellow-400";
      case "image": return "bg-orange-500/80 border-orange-400";
      default: return "bg-gray-500/80 border-gray-400";
    }
  };

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverTime, setDragOverTime] = useState<number | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    
    const dragData = getDragData();
    if (dragData && dragData.type) {
      setIsDragOver(true);
      
      // Calculate time based on drop position
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - 120; // Subtract track header width
      if (x > 0) {
        const timeMs = pxToMs(x, pixelsPerMs);
        setDragOverTime(timeMs);
      }
    }
  }, [pixelsPerMs]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragOverTime(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const dragData = getDragData();
    console.log("Timeline handleDrop, dragData:", dragData);
    if (!dragData || !dragData.type) {
      console.log("No drag data, returning");
      setDragOverTime(null);
      return;
    }

    // Get duration from display.to - buildDragPayload uses file.duration which is in SECONDS
    // So display.to is already in seconds (e.g., 7 for 7 seconds, not 7000)
    // The default 5000 is also in seconds (5 seconds), not ms
    const durationSec = dragData.display?.to || dragData.duration || 5;
    const fileType = dragData.type;
    
    // Create a mock upload object from drag data to use addFileToTimeline
    const mockUpload: UploadedFile = {
      id: dragData.id || dragData.name || nanoid(),
      fileName: dragData.name || "Media",
      filePath: dragData.src || "",
      fileSize: 0,
      contentType: fileType,
      objectUrl: dragData.src || "",
      status: "completed",
      progress: 100,
      createdAt: Date.now(),
      duration: durationSec,
      width: dragData.width || 1920,
      height: dragData.height || 1080,
      fps: dragData.fps || 30,
      type: fileType as "video" | "image" | "audio" | "adjustment" | "colormatte",
    };

    // Use the same addFileToTimeline function that the "+" button uses
    addFileToTimeline(mockUpload);
    setDragOverTime(null);
  }, []);

  // Create track index map
  const trackIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    tracks.forEach((track, index) => {
      map.set(track.id, index);
    });
    return map;
  }, [tracks]);

  // Use calculated timeline duration (from clips) instead of sequence duration
  const maxTime = useMemo(() => {
    return naturalEndMs > 0 ? naturalEndMs : (sequenceDuration > 0 ? sequenceDuration : 10000);
  }, [naturalEndMs, sequenceDuration]);

  const timelineWidth = Math.max(maxTime * pixelsPerMs, 1000);

  // Get cursor style based on active tool
  const getCursorStyle = () => {
    switch (activeTool) {
      case "select": return "cursor-default";
      case "trackSelect": return "cursor-text";
      case "rippleEdit": return "cursor-ew-resize";
      case "razor": return "cursor-crosshair";
      case "pen": return "cursor-crosshair";
      case "rectangle": return "cursor-crosshair";
      case "hand": return "cursor-grab";
      case "text": return "cursor-text";
      default: return "cursor-default";
    }
  };

  return (
    <div 
      className={`flex flex-col h-full w-full ${getCursorStyle()}`}
      style={{ minWidth: 0, maxWidth: '100%' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="shrink-0" style={{ minWidth: 0, overflow: 'hidden', width: '100%' }}>
        <Header />
      </div>
      
      {/* Ruler */}
      <div className="shrink-0" style={{ minWidth: 0, overflow: 'hidden', width: '100%' }}>
        <Ruler onClick={onRulerClick} scrollLeft={scrollLeft} onScroll={onScroll} />
      </div>
      
      {/* Main timeline area */}
      <div 
        className="flex flex-1 min-h-0 timeline-area"
        style={{ overflow: "hidden" }}
        onClick={handleTimelineClick}
      >
        {/* Track headers with vertical scroll */}
        <div 
          className={`shrink-0 bg-sidebar border-r border-border overflow-y-auto ${isDragOver ? 'bg-primary/5' : ''}`}
          style={{ width: 120 }}
          id="track-headers"
          onScroll={(e) => {
            const scrollTop = e.currentTarget.scrollTop;
            const timelineContent = document.getElementById('timeline-content');
            if (timelineContent) {
              timelineContent.scrollTop = scrollTop;
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <TrackHeaders tracks={tracks} />
        </div>
        
        {/* Timeline content with vertical and horizontal scroll */}
        <div 
          className={`flex-1 overflow-x-auto overflow-y-auto relative bg-card ${isDragOver ? 'bg-primary/5 ring-2 ring-primary/30' : ''}`}
          id="timeline-content"
          onScroll={(e) => {
            const scrollTop = e.currentTarget.scrollTop;
            const trackHeaders = document.getElementById('track-headers');
            if (trackHeaders) {
              trackHeaders.scrollTop = scrollTop;
            }
            if (onScroll) onScroll(e);
          }}
          onClick={() => dispatch(setSelection([]))}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Inner container */}
          <div 
            style={{ 
              width: timelineWidth, 
              minHeight: `${Math.max(tracks.length * TRACK_HEIGHT, 300)}px`,
              position: "relative"
            }}
          >
            {/* Track lanes */}
            {tracks.map((track, index) => (
              <div
                key={`lane-${track.id}`}
                className="border-b border-border/30 bg-muted/5"
                style={{ height: TRACK_HEIGHT }}
              />
            ))}
            
            {/* Show message if no tracks */}
            {tracks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                No tracks yet. Add media to create tracks.
              </div>
            )}
            
            {/* Render clips */}
            {clips.map((clip) => {
              const trackIndex = trackIndexMap.get(clip.trackId);
              
              // If no track found, try to find any track to place it on
              let displayIndex = trackIndex;
              if (displayIndex === undefined) {
                displayIndex = 0; // Place on first track as fallback
              }
              
              const isSelected = selection.includes(clip.id);
              const left = clip.display.from * pixelsPerMs;
              const width = (clip.display.to - clip.display.from) * pixelsPerMs;
              
              const getClipCursor = () => {
    if (activeTool === "select" || activeTool === "rippleEdit") {
      return "cursor-grab";
    }
    return "cursor-pointer";
  };

  return (
                <div
                  key={`clip-${clip.id}`}
                  className={`absolute rounded border-2 text-white select-none transition-all hover:brightness-110 ${getTypeColor(clip.type)} ${
                    isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                  } ${getClipCursor()}`}
                  style={{
                    left: `${left}px`,
                    width: `${Math.max(width, 20)}px`,
                    height: TRACK_HEIGHT - 10,
                    top: `${displayIndex * TRACK_HEIGHT + 5}px`,
                  }}
                  onClick={(e) => handleClipClick(e, clip.id)}
                  onMouseDown={(e) => handleClipMouseDown(e, clip.id)}
                >
                  <div className="px-1.5 py-0.5 text-[9px] truncate font-medium leading-tight overflow-hidden">
                    {clip.name || clip.type}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Playhead */}
          <Playhead scrollLeft={scrollLeft} pixelsPerMs={pixelsPerMs} />
          
          {/* Markers */}
          <TimelineMarkersLayer scrollLeft={scrollLeft} />
        </div>
      </div>
    </div>
  );
};

export default Timeline;