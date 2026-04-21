/**
 * timeline/timeline.tsx — ENGINE-FIRST
 * Fixed version with proper clip rendering and tool behavior
 */

"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Header from "./header";
import { Magnet, Bookmark } from "lucide-react";
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
  useEnginePlayhead,
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
import { snapEngine } from "../engine/subsystems/snap-engine";
import { getDragData } from "@/components/shared/drag-data";
import { addFileToTimeline, type UploadedFile } from "@/store/upload-store";
import { usePlayerRef } from "../engine/engine-hooks";

const TRACK_HEIGHT = 36;
const TRACK_LABEL_WIDTH = 140;

function getTrackGroups(tracks: { id: string; type: string; group?: string }[]) {
  const groups: { group: string; tracks: { id: string; type: string; group?: string }[] }[] = [];
  
  const groupMap = new Map<string, { id: string; type: string; group?: string }[]>();
  
  for (const track of tracks) {
    const group = track.group || (track.type === "audio" ? "audio" : track.type === "caption" ? "subtitle" : track.type === "text" ? "text" : "video");
    if (!groupMap.has(group)) {
      groupMap.set(group, []);
    }
    groupMap.get(group)!.push(track);
  }
  
  for (const group of ["video", "text", "subtitle", "audio"]) {
    const groupTracks = groupMap.get(group);
    if (groupTracks && groupTracks.length > 0) {
      groups.push({ group, tracks: groupTracks });
    }
  }
  
  return groups;
}

const Timeline = () => {
  const dispatch = useEngineDispatch();
  const tracks = useEngineSelector(selectOrderedTracks);
  const clips = useEngineSelector(selectAllClips);
  const selection = useEngineSelector(selectSelection);
  const zoom = useEngineZoom();
  const playheadTime = useEnginePlayhead();
  const sequenceDuration = useEngineSelector(selectDuration);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [segmentHeights, setSegmentHeights] = useState<Record<string, number>>({});
  
  useEffect(() => {
    snapEngine.setEnabled(true);
  }, []);

  // Calculate total timeline inner height from all segment heights
  const timelineInnerHeight = useMemo(() => {
    let height = 0;
    const trackGroups = getTrackGroups(tracks);
    for (const { group, tracks: groupTracks } of trackGroups) {
      const trackHeight = segmentHeights[group] ?? 36;
      height += groupTracks.length * trackHeight;
    }
    return Math.max(height, 200);
  }, [tracks, segmentHeights]);

  const getTrackHeight = (group: string) => segmentHeights[group] ?? 36;
  
  const handleSegmentResize = useCallback((group: string, deltaY: number) => {
    setSegmentHeights(prev => {
      const current = prev[group] ?? 36;
      const newHeight = Math.max(24, Math.min(72, current + deltaY));
      return { ...prev, [group]: newHeight };
    });
  }, []);
  const naturalEndMs = useEngineSelector(selectNaturalEndMs);
  const activeTool = useEngineSelector((state) => state.ui?.activeTool ?? "select");
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

  const toggleSnap = useCallback(() => {
    setSnapEnabled(prev => {
      const newValue = !prev;
      snapEngine.setEnabled(newValue);
      return newValue;
    });
  }, []);

  const addMarker = useCallback(() => {
    // Add marker at current playhead position - create marker object locally
    const marker = {
      id: nanoid(),
      timeMs: playheadTime,
      label: `Marker ${Date.now()}`,
      color: "green" as const,
      type: "sequence" as const,
    };
    dispatch({ type: "ADD_MARKER", payload: { marker } });
  }, [dispatch, playheadTime]);

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
      const clip = engineStore.getState().clips[clipId];
      if (!clip) return;
      
      setIsDraggingClip(true);
      setDragClipId(clipId);
      setDragStartX(e.clientX);
      setDragStartTime(clip.display.from);
    }
  }, [activeTool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingClip && dragClipId) {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerMs;
      let newStart = Math.max(0, dragStartTime + deltaTime);
      
      if (snapEnabled) {
        const state = engineStore.getState();
        const clip = state.clips[dragClipId];
        if (clip && clip.trackId) {
          const clipDuration = clip.display.to - clip.display.from;
          const myTrackId = clip.trackId;
          const myEnd = newStart + clipDuration;
          
          let leftBound = 0;
          let rightBound = 999999;
          
          for (const otherId of Object.keys(state.clips)) {
            const other = state.clips[otherId];
            if (other.id === dragClipId) continue;
            if (other.trackId !== myTrackId) continue;
            
            if (other.display.to <= newStart) {
              leftBound = Math.max(leftBound, other.display.to);
            }
            if (other.display.from >= myEnd) {
              rightBound = Math.min(rightBound, other.display.from);
            }
          }
          
          newStart = Math.max(leftBound, newStart);
          newStart = Math.min(rightBound - clipDuration, newStart);
          newStart = Math.max(0, newStart);
        }
      }
      
      dispatch(moveClip(dragClipId, newStart));
    }
    
    if (activeTool === "hand" && e.buttons === 1) {
      const deltaX = e.movementX;
      const deltaY = e.movementY;
      const newScrollX = Math.max(0, scrollX - deltaX);
      dispatch(setScroll(newScrollX, undefined));
    }
  }, [isDraggingClip, dragClipId, dragStartX, dragStartTime, pixelsPerMs, snapEnabled, activeTool, scrollX, dispatch]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingClip(false);
    setDragClipId(null);
  }, []);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.track-header') || target.closest('.clip')) return;
    
    const timelineArea = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - timelineArea.left - TRACK_LABEL_WIDTH;
    const clickTime = Math.max(0, (clickX + scrollLeft) / pixelsPerMs);
    
    if (clickTime >= 0) {
      dispatch(setPlayhead(clickTime));
      seekPlayer(Math.floor(clickTime / 1000 * 30));
    }
    
    if (activeTool === "select") {
      dispatch(setSelection([]));
    } else if (activeTool === "trackSelect") {
      if (clickTime > 0) {
        const forwardClips = clips.filter(c => c.display.from >= clickTime);
        const clipIds = forwardClips.map(c => c.id);
        if (clipIds.length > 0) {
          dispatch(setSelection(clipIds));
        }
      }
    }
  }, [dispatch, activeTool, clips, pixelsPerMs, scrollLeft]);

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
      const x = e.clientX - rect.left - TRACK_LABEL_WIDTH;
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

  // Create track index map with dynamic group heights
  const trackIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    const trackGroups = getTrackGroups(tracks);
    let offset = 0;
    for (const { group, tracks: groupTracks } of trackGroups) {
      for (const track of groupTracks) {
        map.set(track.id, offset);
        offset += getTrackHeight(group);
      }
    }
    return map;
  }, [tracks, segmentHeights]);

  // Exact track positions calculated from heights
  const trackPositions = useMemo(() => {
    const positions = new Map<string, number>();
    let y = 0;
    const trackGroups = getTrackGroups(tracks);
    for (const { group, tracks: groupTracks } of trackGroups) {
      for (const track of groupTracks) {
        positions.set(track.id, y);
        y += getTrackHeight(group);
      }
    }
    return positions;
  }, [tracks, segmentHeights]);

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

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left - TRACK_LABEL_WIDTH;
    const clickTime = Math.max(0, (clickX + scrollLeft) / pixelsPerMs);
    
    if (clickTime >= 0) {
      dispatch(setPlayhead(clickTime));
      seekPlayer(Math.floor(clickTime / 1000 * 30));
    }
  }, [dispatch, scrollLeft, pixelsPerMs]);

  return (
    <div 
      className={`flex flex-col h-full w-full ${getCursorStyle()}`}
      style={{ minWidth: 0, maxWidth: '100%' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleContainerClick}
    >
      {/* Header */}
      <div className="shrink-0 border-b border-border" style={{ minWidth: 0, overflow: 'hidden', width: '100%' }}>
        <Header />
      </div>
      
      {/* Ruler space - tools can be added here */}
      <div className="shrink-0 border-b border-border flex items-center gap-1 px-2" style={{ minWidth: 0, overflow: 'hidden', width: '100%', height: 24 }}>
        <button
          onClick={toggleSnap}
          className={`p-1 rounded transition-colors ${snapEnabled ? 'text-amber-400' : 'text-muted-foreground/50'}`}
          title={snapEnabled ? "Snap Enabled" : "Snap Disabled"}
        >
          <Magnet className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={addMarker}
          className="p-1 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          title="Add Marker"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>
      </div>
      
{/* Main timeline area - unified scroll */}
      <div 
        className="flex flex-1 min-h-0 timeline-area overflow-auto"
      >
        {/* Left column - track labels */}
        <div 
          className={`bg-sidebar border-r border-border ${isDragOver ? 'bg-primary/5' : ''}`}
          style={{ width: TRACK_LABEL_WIDTH }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <TrackHeaders 
            tracks={tracks} 
            segmentHeights={segmentHeights} 
            onSegmentResize={handleSegmentResize} 
          />
        </div>
        
        {/* Timeline content */}
        <div 
          className={`flex-1 relative bg-card ${isDragOver ? 'bg-primary/5 ring-2 ring-primary/30' : ''}`}
          onClick={() => dispatch(setSelection([]))}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
{/* Inner container - match left column height */}
          <div 
            className="relative"
            style={{ 
              width: timelineWidth, 
              minHeight: timelineInnerHeight,
              position: "relative"
            }}
          >
            {/* Track lanes with group separators */}
            {(() => {
              const trackGroups = getTrackGroups(tracks);
              let cumulativeHeight = 0;
              return trackGroups.map(({ group, tracks: groupTracks }) => {
                const trackHeight = getTrackHeight(group);
                return (
                  <div key={group}>
                    {groupTracks.map((track) => {
                      const trackTop = cumulativeHeight;
                      cumulativeHeight += trackHeight;
                      return (
                        <div
                          key={`lane-${track.id}`}
                          className="border-b border-border/30 bg-muted/5"
                          style={{ height: trackHeight }}
                          data-track-top={trackTop}
                        />
                      );
                    })}
                  </div>
                );
              });
            })()}
            
            {/* Show message if no tracks */}
            {tracks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                No tracks yet. Add media to create tracks.
              </div>
            )}
            
            {/* Render clips */}
            {clips.map((clip) => {
              const trackTop = trackPositions.get(clip.trackId);
              const track = tracks.find(t => t.id === clip.trackId);
              const trackGroup = track?.group || (track?.type === "audio" ? "audio" : track?.type === "caption" ? "subtitle" : track?.type === "text" ? "text" : "video");
              const clipHeight = getTrackHeight(trackGroup);
              
              // Fallback if track not found
              const displayY = trackTop !== undefined ? trackTop : 0;
              
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
                    height: clipHeight,
                    top: `${displayY}px`,
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