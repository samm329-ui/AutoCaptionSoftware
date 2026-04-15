/**
 * timeline/selection-manager.ts
 * 
 * Pure engine-based selection for timeline clips.
 * Uses drag-engine and dispatches MOVE_CLIP commands.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useEngineDispatch, useEngineSelector, useEngineZoom } from "../engine/engine-provider";
import { setSelection, moveClip } from "../engine/commands";
import { dragEngine } from "../engine/subsystems/drag-engine";
import { zoomToPixelsPerMs } from "../engine/time-scale";

export function useTimelineSelection() {
  const dispatch = useEngineDispatch();
  const selection = useEngineSelector((s) => s.ui.selection);
  const clips = useEngineSelector((s) => s.clips);
  const zoom = useEngineZoom();
  
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ clipId: "", startX: 0, originalFrom: 0 });
  
  // Start dragging a clip
  const startDrag = useCallback((clipId: string, clientX: number) => {
    const clip = clips[clipId];
    if (!clip) return;
    
    isDraggingRef.current = true;
    dragStartRef.current = {
      clipId,
      startX: clientX,
      originalFrom: clip.display.from,
    };
    
    dispatch(setSelection([clipId]));
  }, [dispatch, clips]);

  // Update drag position while moving mouse
  const updateDrag = useCallback((clientX: number) => {
    if (!isDraggingRef.current) return;
    
    const { clipId, startX, originalFrom } = dragStartRef.current;
    const deltaX = clientX - startX;
    const pixelsPerMs = zoomToPixelsPerMs(zoom);
    const deltaMs = deltaX / pixelsPerMs;
    const newFrom = Math.max(0, originalFrom + deltaMs);
    
    // Temporary move - will commit on end
    dragEngine.startDrag(clipId, clientX);
  }, [zoom]);

  // End dragging and commit to engine
  const endDrag = useCallback((clientX: number) => {
    if (!isDraggingRef.current) return;
    
    const { clipId, startX, originalFrom } = dragStartRef.current;
    const deltaX = clientX - startX;
    const pixelsPerMs = zoomToPixelsPerMs(zoom);
    const deltaMs = deltaX / pixelsPerMs;
    const newFrom = Math.max(0, originalFrom + deltaMs);
    
    // Commit move to engine
    dispatch(moveClip(clipId, newFrom));
    
    isDraggingRef.current = false;
    dragStartRef.current = { clipId: "", startX: 0, originalFrom: 0 };
  }, [dispatch, zoom]);

  // Cancel drag without committing
  const cancelDrag = useCallback(() => {
    isDraggingRef.current = false;
    dragEngine.cancelDrag();
  }, []);

  // Select multiple clips with shift
  const selectMultiple = useCallback((clipId: string, multiSelect: boolean) => {
    if (multiSelect) {
      const newSelection = selection.includes(clipId)
        ? selection.filter(id => id !== clipId)
        : [...selection, clipId];
      dispatch(setSelection(newSelection));
    } else {
      dispatch(setSelection([clipId]));
    }
  }, [dispatch, selection]);

  // Clear selection
  const clearSelection = useCallback(() => {
    dispatch(setSelection([]));
  }, [dispatch]);

  return {
    selection,
    isDragging: isDraggingRef.current,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    selectMultiple,
    clearSelection,
  };
}