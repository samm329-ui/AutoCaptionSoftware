/**
 * timeline/timeline.tsx — ENGINE-FIRST
 * Fixed version with proper clip rendering and tool behavior
 */

"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Header from "./header";
import { Magnet, Bookmark, AlertCircle } from "lucide-react";
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
  selectFps,
} from "../engine/selectors";
import { setSelection, setPlayhead, seekPlayer, splitClip, moveClip, setScroll } from "../engine/commands";
import { msToPx, pxToMs, pxToFrame, zoomToPixelsPerMs } from "../engine/time-scale";
import { engineStore, nanoid, validateClipMoveToTrack, getTrackGroup } from "../engine/engine-core";
import { snapEngine } from "../engine/subsystems/snap-engine";
import { getDragData } from "@/components/shared/drag-data";
import { addFileToTimeline, validateFileTypeForTrack, type UploadedFile } from "@/store/upload-store";
import { usePlayerRef } from "../engine/engine-hooks";
import ClipContextMenu from "./clip-context-menu";

const TRACK_HEIGHT = 36;
const TRACK_LABEL_WIDTH = 140;

// Track type validation
const FILE_TYPE_TO_TRACK_GROUP: Record<string, string> = {
  video: "video",
  image: "video",
  audio: "audio",
  text: "text",
  caption: "subtitle",
  adjustment: "video",
  colormatte: "video",
  overlay: "video",
  shape: "video",
  transition: "video",
};

function getTrackGroupForFileType(fileType: string): string {
  return FILE_TYPE_TO_TRACK_GROUP[fileType] || "video";
}

function isTrackValidForFileType(trackGroup: string, fileType: string): boolean {
  const requiredGroup = getTrackGroupForFileType(fileType);
  return trackGroup === requiredGroup;
}

// Helper to get file type from drag data
function getFileTypeFromDrag(dragData: Record<string, any> | null): string {
  if (!dragData) return "video";
  return dragData.type || dragData.fileType || "video";
}

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
  const fps = useEngineSelector(selectFps) || 30;
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
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [dragStartTrackId, setDragStartTrackId] = useState<string | null>(null);
  
  // Track hover state for drag and drop
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [hoveredTrackGroup, setHoveredTrackGroup] = useState<string>("video");
  const [isDragOverTimeline, setIsDragOverTimeline] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  
  // Clip context menu state
  const [clipContextMenu, setClipContextMenu] = useState<{
    x: number;
    y: number;
    clipId: string;
    clipName: string;
    clipType: string;
    isEnabled: boolean;
    isLocked: boolean;
  } | null>(null);
  
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
    
    const isAlreadySelected = selection?.includes(clipId);
    
    // Right-click opens context menu ONLY if clip is already selected
    if (e.button === 2) {
      e.preventDefault();
      if (isAlreadySelected) {
        const clip = clips.find(c => c.id === clipId);
        const track = tracks.find(t => t.id === clip?.trackId);
        if (clip && track) {
          const menuHeight = 420;
          const menuY = e.clientY - menuHeight + 10;
          
          setClipContextMenu({
            x: e.clientX,
            y: Math.max(50, menuY),
            clipId: clip.id,
            clipName: clip.name || clip.type,
            clipType: clip.type,
            isEnabled: !track.locked && !track.muted,
            isLocked: track.locked || false,
          });
        }
      }
      return;
    }
    
    e.preventDefault();
    
    // Always select the clip first
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
  }, [dispatch, activeTool, selection, playheadTime, clips, tracks]);

  const handleClipMouseDown = useCallback((e: React.MouseEvent, clipId: string) => {
    if (activeTool === "select" || activeTool === "rippleEdit") {
      e.stopPropagation();
      const clip = engineStore.getState().clips[clipId];
      if (!clip) return;
      
      setIsDraggingClip(true);
      setDragClipId(clipId);
      setDragStartX(e.clientX);
      setDragStartY(e.clientY);
      setDragStartTime(clip.display.from);
      setDragStartTrackId(clip.trackId);
    }
  }, [activeTool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingClip && dragClipId) {
      const state = engineStore.getState();
      const clip = state.clips[dragClipId];
      if (!clip) return;
      
      // Detect which track we're hovering over while dragging
      const trackElements = document.querySelectorAll('[data-track-id]');
      let detectedTrackId: string | null = null;
      let detectedTrackGroup: string | null = null;
      for (const el of trackElements) {
        const rect = el.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          detectedTrackId = (el as HTMLElement).dataset.trackId;
          detectedTrackGroup = (el as HTMLElement).dataset.trackGroup || "video";
          break;
        }
      }
      
      // Switch track if mouse moved to a different track - WITH VALIDATION
      if (detectedTrackId && detectedTrackId !== clip.trackId) {
        // Validate clip type against target track group using engine validation
        const targetTrack = state.tracks[detectedTrackId];
        if (targetTrack) {
          const targetGroup = getTrackGroup(targetTrack);
          const isValid = validateClipMoveToTrack(clip.type, targetGroup);
          
          if (isValid) {
            dispatch(moveClip(dragClipId, clip.display.from, detectedTrackId));
            setDropError(null);
          } else {
            setDropError(`${clip.type.charAt(0).toUpperCase() + clip.type.slice(1)} clips cannot be moved to ${targetGroup.charAt(0).toUpperCase() + targetGroup.slice(1)} tracks`);
          }
        }
      } else if (!detectedTrackId || detectedTrackId === clip.trackId) {
        setDropError(null);
      }
      
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerMs;
      let newStart = Math.max(0, dragStartTime + deltaTime);
      
      // MAGNET SNAP - respects button toggle
      if (snapEnabled) {
        const clipDuration = clip.display.to - clip.display.from;
        const myStart = newStart;
        const myEnd = newStart + clipDuration;
        
        let snapped = false;
        
        for (const otherId in state.clips) {
          const other = state.clips[otherId];
          if (!other) continue;
          if (other.id === dragClipId) continue;
          if (other.trackId !== clip.trackId) continue;
          
          const oStart = other.display.from;
          const oEnd = other.display.to;
          
          if (Math.abs(myStart - oStart) < 100) { newStart = oStart; snapped = true; }
          if (Math.abs(myStart - oEnd) < 100) { newStart = oEnd; snapped = true; }
          if (Math.abs(myEnd - oStart) < 100) { newStart = oStart - clipDuration; snapped = true; }
          if (Math.abs(myEnd - oEnd) < 100) { newStart = oEnd - clipDuration; snapped = true; }
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
  }, [isDraggingClip, dragClipId, dragStartX, dragStartTime, pixelsPerMs, activeTool, scrollX, dispatch]);

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
      seekPlayer(Math.floor(clickTime / 1000 * fps));
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

  // Helper to detect which track the mouse is over during drag
  const detectTrackFromMousePosition = useCallback((clientY: number, timelineElement: HTMLElement): { trackId: string; trackGroup: string } | null => {
    // Find the inner container that holds the track lanes
    const innerContainer = timelineElement.querySelector('.relative[style*="minHeight"], .relative:not(.bg-sidebar)') as HTMLElement;
    
    let trackAreaTop: number;
    let scrollTop = 0;
    
    if (innerContainer) {
      const innerRect = innerContainer.getBoundingClientRect();
      trackAreaTop = innerRect.top;
      // Get scroll position from the timeline area parent
      const scrollContainer = timelineElement.closest('.timeline-area') as HTMLElement;
      if (scrollContainer) {
        scrollTop = scrollContainer.scrollTop;
      }
    } else {
      // Fallback: use timeline element rect minus header
      const rect = timelineElement.getBoundingClientRect();
      trackAreaTop = rect.top + 50;
    }
    
    const relativeY = clientY - trackAreaTop + scrollTop;
    
    let cumulativeY = 0;
    const trackGroupsList = getTrackGroups(tracks);
    
    for (const { group, tracks: groupTracks } of trackGroupsList) {
      const trackHeight = segmentHeights[group] ?? 36;
      
      for (const track of groupTracks) {
        if (relativeY >= cumulativeY && relativeY < cumulativeY + trackHeight) {
          return { trackId: track.id, trackGroup: group };
        }
        cumulativeY += trackHeight;
      }
    }
    
    return null;
  }, [tracks, segmentHeights]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const dragData = getDragData();
    const fileType = getFileTypeFromDrag(dragData);
    
    const timelineElement = e.currentTarget as HTMLElement;
    const trackInfo = detectTrackFromMousePosition(e.clientY, timelineElement);
    
    // Update track hover state
    if (trackInfo) {
      setHoveredTrackId(trackInfo.trackId);
      setHoveredTrackGroup(trackInfo.trackGroup);
      
      // Check if file type is valid for this track
      const validation = validateFileTypeForTrack(fileType, trackInfo.trackGroup);
      setDropError(validation.error);
      
      if (validation.error) {
        e.dataTransfer.dropEffect = "none";
      } else {
        e.dataTransfer.dropEffect = "copy";
      }
    } else {
      // Not over a specific track, try to find any valid track in the correct group
      setHoveredTrackId(null);
      setHoveredTrackGroup(getTrackGroupForFileType(fileType));
      setDropError(null);
      e.dataTransfer.dropEffect = "copy";
    }
    
    if (dragData && dragData.type) {
      setIsDragOver(true);
      
      // Calculate time based on drop position
      const rect = timelineElement.getBoundingClientRect();
      const x = e.clientX - rect.left - TRACK_LABEL_WIDTH;
      if (x > 0) {
        const timeMs = pxToMs(x, pixelsPerMs);
        setDragOverTime(timeMs);
      }
    }
  }, [pixelsPerMs, detectTrackFromMousePosition]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragOverTime(null);
    setHoveredTrackId(null);
    setDropError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setHoveredTrackId(null);
    setDropError(null);
    
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
    
    // Validate file type against target track
    const targetTrackId = hoveredTrackId;
    let targetTrackGroup = hoveredTrackGroup;
    
    // If we have a specific track, validate against it
    if (targetTrackId) {
      const targetTrack = tracks.find(t => t.id === targetTrackId);
      if (targetTrack) {
        targetTrackGroup = targetTrack.group || "video";
      }
    }

    // Check file type against determined track group
    const validation = validateFileTypeForTrack(fileType, targetTrackGroup);
    if (!validation.valid) {
      console.log("Drop rejected:", validation.error);
      setDropError(validation.error);
      e.dataTransfer.dropEffect = "none";
      return;
    }
    
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
    // Pass the specific target track if we're hovering over one
    const result = addFileToTimeline(mockUpload, hoveredTrackId || undefined);
    
    if (!result.success) {
      console.log("Drop rejected:", result.error);
      setDropError(result.error);
      setDragOverTime(null);
      return;
    }
    
    setDragOverTime(null);
  }, [hoveredTrackId, hoveredTrackGroup, tracks]);

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
    if (target.closest('#playhead')) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left - TRACK_LABEL_WIDTH;
    const clickTime = Math.max(0, (clickX + scrollLeft) / pixelsPerMs);
    
    console.log("Timeline click - clickX:", clickX, "scrollLeft:", scrollLeft, "pixelsPerMs:", pixelsPerMs, "clickTime:", clickTime);
    
    if (clickTime >= 0) {
      dispatch(setPlayhead(clickTime));
      seekPlayer(Math.floor(clickTime / 1000 * fps));
    }
  }, [dispatch, scrollLeft, pixelsPerMs, fps]);

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
          <Magnet className="w-3.5 h-3.5 -rotate-45" />
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
        
        {/* Drop error display */}
        {dropError && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">{dropError}</span>
          </div>
        )}
        
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
              return trackGroups.map(({ group, tracks: groupTracks }, groupIndex) => {
                const trackHeight = getTrackHeight(group);
                return (
                  <div key={group}>
                    {/* Group separator - thicker border between different track types */}
                    {groupIndex > 0 && (
                      <div 
                        className="border-b-2 border-primary/40"
                        style={{ height: 4 }}
                      />
                    )}
                    {groupTracks.map((track, trackIndex) => {
                      const trackTop = cumulativeHeight;
                      cumulativeHeight += trackHeight;
                      
                      // Determine if this track is being hovered during drag
                      const isThisTrackHovered = hoveredTrackId === track.id;
                      const trackGroup = track.group || track.type;
                      const fileType = getFileTypeFromDrag(getDragData());
                      const isValidDrop = isTrackValidForFileType(trackGroup, fileType) && !dropError;
                      
// Track hover styling - just background color, no border on highlight
                      let trackHoverClass = "";
                      if (isThisTrackHovered) {
                        if (dropError || !isValidDrop) {
                          trackHoverClass = "bg-red-500/20";
                        } else {
                          trackHoverClass = "bg-green-500/20";
                        }
                      }

                      return (
                        <div
                          key={`lane-${track.id}`}
                          className={`border-b border-border transition-colors ${trackHoverClass}`}
                          style={{ height: trackHeight }}
                          data-track-id={track.id}
                          data-track-top={trackTop}
                          data-track-group={trackGroup}
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
                  onContextMenu={(e) => { e.preventDefault(); handleClipClick(e, clip.id); }}
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
          
          {/* Clip Context Menu */}
          {clipContextMenu && (
            <ClipContextMenu
              x={clipContextMenu.x}
              y={clipContextMenu.y}
              clipId={clipContextMenu.clipId}
              clipName={clipContextMenu.clipName}
              clipType={clipContextMenu.clipType}
              isEnabled={clipContextMenu.isEnabled}
              isLocked={clipContextMenu.isLocked}
              onClose={() => setClipContextMenu(null)}
              onCut={() => console.log("Cut")}
              onCopy={() => console.log("Copy")}
              onPaste={() => console.log("Paste")}
              onClear={() => console.log("Clear")}
              onRippleDelete={() => console.log("Ripple Delete")}
              onToggleEnable={() => console.log("Toggle Enable")}
              onRename={() => console.log("Rename")}
              onSpeedDuration={() => console.log("Speed/Duration")}
              onNest={() => console.log("Nest")}
              onLabel={(color: string) => console.log("Label:", color)}
              onScaleToFrame={() => console.log("Scale to Frame")}
              onFitToFrame={() => console.log("Fit to Frame")}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Timeline;