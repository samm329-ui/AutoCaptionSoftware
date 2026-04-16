"use client";

import { useCallback, useRef, useState } from "react";
import { engineStore, type Clip } from "../engine/engine-core";
import { 
  setSelection, 
  setPlayhead, 
  moveClip, 
  splitClip, 
  setScroll, 
  addClip,
  selectClip,
  addTrack
} from "../engine/commands";
import { selectOrderedTracks, selectAllClips, selectTrackClips, selectTracksByGroup } from "../engine/selectors";
import { nanoid } from "../engine/engine-core";
import type { EditorTool } from "../editing-toolbar";

interface ToolState {
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  dragClipId: string | null;
  dragStartTime: number;
}

export function useToolBehavior(activeTool: EditorTool) {
  const toolState = useRef<ToolState>({
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragClipId: null,
    dragStartTime: 0,
  });
  
  const [isDragging, setIsDragging] = useState(false);

  const handleClipClick = useCallback((clipId: string, e: React.MouseEvent) => {
    const state = engineStore.getState();
    
    switch (activeTool) {
      case "select": {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          const currentSelection = state.ui?.selection ?? [];
          if (currentSelection.includes(clipId)) {
            engineStore.dispatch(setSelection(currentSelection.filter(id => id !== clipId)));
          } else {
            engineStore.dispatch(setSelection([...currentSelection, clipId]));
          }
        } else {
          engineStore.dispatch(setSelection([clipId]));
        }
        break;
      }
      
      case "trackSelect": {
        const clip = state.clips[clipId];
        if (!clip) return;
        
        const trackClips = selectTrackClips(clip.trackId)(state);
        const playheadTime = state.ui?.playheadTime ?? 0;
        
        const forwardClips = trackClips.filter(c => c.display.from >= playheadTime);
        const clipIds = forwardClips.map(c => c.id);
        
        if (clipIds.length > 0) {
          engineStore.dispatch(setSelection(clipIds));
        }
        break;
      }
      
      case "razor": {
        const clip = state.clips[clipId];
        if (!clip) return;
        
        const playheadTime = state.ui?.playheadTime ?? 0;
        if (playheadTime > clip.display.from && playheadTime < clip.display.to) {
          engineStore.dispatch(splitClip(clipId, playheadTime));
        }
        break;
      }
      
      case "pen":
      case "rectangle":
      case "hand":
      case "text":
        break;
    }
  }, [activeTool]);

  const handleTimelineClick = useCallback((timeMs: number, e: React.MouseEvent) => {
    const state = engineStore.getState();
    
    switch (activeTool) {
      case "select":
        if ((e.target as HTMLElement).classList.contains('timeline-area')) {
          engineStore.dispatch(setSelection([]));
        }
        break;
        
      case "trackSelect": {
        const orderedTracks = selectOrderedTracks(state);
        const allClips = selectAllClips(state);
        
        const forwardClips = allClips.filter(c => c.display.from >= timeMs);
        const clipIds = forwardClips.map(c => c.id);
        
        if (clipIds.length > 0) {
          engineStore.dispatch(setSelection(clipIds));
        }
        break;
      }
      
      case "razor":
        break;
        
      case "hand":
        break;
    }
  }, [activeTool]);

  const handleClipDragStart = useCallback((clipId: string, x: number, y: number) => {
    const state = engineStore.getState();
    const clip = state.clips[clipId];
    if (!clip) return;
    
    toolState.current = {
      isDragging: true,
      dragStartX: x,
      dragStartY: y,
      dragClipId: clipId,
      dragStartTime: clip.display.from,
    };
    setIsDragging(true);
  }, []);

  const handleClipDrag = useCallback((x: number, y: number, zoom: number) => {
    if (!toolState.current.isDragging || !toolState.current.dragClipId) return;
    
    const deltaX = x - toolState.current.dragStartX;
    const deltaTime = deltaX / zoom;
    
    const state = engineStore.getState();
    const clip = state.clips[toolState.current.dragClipId];
    if (!clip) return;
    
    const newStart = Math.max(0, toolState.current.dragStartTime + deltaTime);
    const duration = clip.display.to - clip.display.from;
    
    if (activeTool === "select" || activeTool === "hand") {
      engineStore.dispatch(moveClip(toolState.current.dragClipId, newStart));
    }
  }, [activeTool]);

  const handleClipDragEnd = useCallback(() => {
    toolState.current = {
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      dragClipId: null,
      dragStartTime: 0,
    };
    setIsDragging(false);
  }, []);

  const handleCanvasClick = useCallback((x: number, y: number) => {
    const state = engineStore.getState();
    
    if (activeTool === "text") {
      const ordered = selectOrderedTracks(state);
      let track = ordered.find(t => t.type === "text");
      
      if (!track) {
        const textGroup = selectTracksByGroup("text")(state);
        if (textGroup.length > 0) {
          track = textGroup[0];
        } else {
          track = {
            id: nanoid(),
            type: "text",
            group: "text",
            name: "T1",
            order: 0,
            clipIds: [],
            locked: false,
            muted: false,
            hidden: false,
          };
          engineStore.dispatch(addTrack(track));
        }
      }
      
      const playheadTime = state.ui?.playheadTime ?? 0;
      
      const clipId = nanoid();
      const clip: Clip = {
        id: clipId,
        type: "text",
        trackId: track.id,
        name: "Text",
        display: { from: playheadTime, to: playheadTime + 5000 },
        trim: { from: 0, to: 5000 },
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, opacity: 1, flipX: false, flipY: false },
        details: { text: "New Text", fontSize: 80, color: "#ffffff", fontFamily: "Inter", textAlign: "center" },
        appliedEffects: [],
        effectIds: [],
        keyframeIds: [],
      };
      
      engineStore.dispatch(addClip(clip, track.id));
      engineStore.dispatch(setSelection([clipId]));
    } else if (activeTool === "rectangle") {
      const ordered = selectOrderedTracks(state);
      let track = ordered.find(t => t.type === "text");
      
      if (!track) {
        const textGroup = selectTracksByGroup("text")(state);
        if (textGroup.length > 0) {
          track = textGroup[0];
        } else {
          track = {
            id: nanoid(),
            type: "text",
            group: "text",
            name: "T1",
            order: 0,
            clipIds: [],
            locked: false,
            muted: false,
            hidden: false,
          };
          engineStore.dispatch(addTrack(track));
        }
      }
      
      const playheadTime = state.ui?.playheadTime ?? 0;
      
      const clipId = nanoid();
      const clip: Clip = {
        id: clipId,
        type: "text",
        trackId: track.id,
        name: "Rectangle",
        display: { from: playheadTime, to: playheadTime + 5000 },
        trim: { from: 0, to: 5000 },
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, opacity: 1, flipX: false, flipY: false },
        details: { 
          text: "", 
          fontSize: 0, 
          color: "#ffffff", 
          fontFamily: "Inter", 
          textAlign: "center",
          isShape: true,
          shapeType: "rectangle",
          shapeWidth: 200,
          shapeHeight: 100,
          shapeFill: "#ff0000",
          shapeStroke: "#000000",
          shapeStrokeWidth: 0,
        },
        appliedEffects: [],
        effectIds: [],
        keyframeIds: [],
      };
      
      engineStore.dispatch(addClip(clip, track.id));
      engineStore.dispatch(setSelection([clipId]));
    }
  }, [activeTool]);

  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    if (activeTool === "hand") {
      const state = engineStore.getState();
      const currentScrollX = state.ui?.scrollX ?? 0;
      const currentScrollY = state.ui?.scrollY ?? 0;
      
      engineStore.dispatch(setScroll(
        Math.max(0, currentScrollX - deltaX),
        Math.max(0, currentScrollY - deltaY)
      ));
    }
  }, [activeTool]);

  const handleTrim = useCallback((clipId: string, newFrom: number, newTo: number) => {
    const state = engineStore.getState();
    const clip = state.clips[clipId];
    if (!clip) return;
    
    const oldDuration = clip.display.to - clip.display.from;
    const newDuration = newTo - newFrom;
    const durationDiff = newDuration - oldDuration;
    
    if (activeTool === "rippleEdit" && durationDiff !== 0) {
      const trackClips = selectTrackClips(clip.trackId)(state);
      const clipIndex = trackClips.findIndex(c => c.id === clipId);
      
      if (clipIndex >= 0 && clipIndex < trackClips.length - 1) {
        const followingClips = trackClips.slice(clipIndex + 1);
        
        for (const followingClip of followingClips) {
          const newStart = followingClip.display.from + durationDiff;
          if (newStart >= 0) {
            engineStore.dispatch(moveClip(followingClip.id, newStart));
          }
        }
      }
    }
  }, [activeTool]);

  return {
    handleClipClick,
    handleTimelineClick,
    handleClipDragStart,
    handleClipDrag,
    handleClipDragEnd,
    handleCanvasClick,
    handlePan,
    handleTrim,
    isDragging,
  };
}

export default useToolBehavior;