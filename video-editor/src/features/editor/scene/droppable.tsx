import React, { useCallback, useState, useRef } from "react";
import { getDragData, clearDragData } from "@/components/shared/drag-data";
import { useEngineDispatch, useEngineZoom } from "../engine/engine-provider";
import { addClip } from "../engine/commands";
import { createTrack, nanoid, engineStore, type Clip, type Track } from "../engine/engine-core";
import { zoomToPixelsPerMs, pxToMs } from "../engine/time-scale";
import { selectOrderedTracks } from "../engine/selectors";

enum AcceptedDropTypes {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  TRANSITION = "transition"
}

interface DraggedData {
  type: AcceptedDropTypes;
  [key: string]: any;
}

interface DroppableAreaProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onDragStateChange?: (isDragging: boolean) => void;
  id?: string;
}

const useDragAndDrop = (onDragStateChange?: (isDragging: boolean) => void) => {
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const zoom = useEngineZoom();

  const handleDrop = useCallback((draggedData: DraggedData, dropTimeMs: number = 0) => {
    const clipId = nanoid();
    const clipType = draggedData.type === "audio" ? "audio" 
      : draggedData.type === "image" ? "image"
      : draggedData.type === "transition" ? "transition"
      : "video";
    
    // Use proper lane allocation (V1/V2/V3, A1/A2/A3)
    const trackType = clipType === "audio" ? "audio" : "video";
    const allTracks = selectOrderedTracks(engineStore.getState());
    const existingTracks = allTracks.filter(t => t.type === trackType);
    let track;
    let laneIndex = 0;
    
    if (existingTracks.length > 0) {
      const maxOrder = Math.max(...existingTracks.map(t => t.order));
      laneIndex = maxOrder + 1;
    }
    
    track = createTrack(trackType, {
      name: `${trackType.toUpperCase()}${laneIndex + 1}`,
      order: laneIndex,
    });
    engineStore.dispatch({ type: "ADD_TRACK", payload: { track } });
    
    const metadata = draggedData.metadata || {};
    const durationSec = typeof metadata.duration === 'number' ? metadata.duration : 5;
    const durationMs = durationSec * 1000;
    
    const clip: Clip = {
      id: clipId,
      type: clipType as Clip["type"],
      trackId: track.id,
      name: draggedData.name || clipType,
      display: { from: dropTimeMs, to: dropTimeMs + durationMs },
      trim: { from: 0, to: durationMs },
      transform: {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
      },
      details: draggedData.details || {},
      appliedEffects: [],
      effectIds: [],
      keyframeIds: [],
      assetId: draggedData.assetId,
    };

    engineStore.dispatch({ type: "ADD_TRACK", payload: { track } });
    engineStore.dispatch({ type: "ADD_CLIP", payload: { clip, trackId: track.id } });
  }, []);

  const parseDragData = (e: React.DragEvent<HTMLDivElement>): DraggedData | null => {
    try {
      const refData = getDragData();
      if (refData && typeof refData === "object" && refData.type) {
        return refData as DraggedData;
      }
      
      const transferData = e.dataTransfer?.getData("text/plain");
      if (typeof transferData === "string" && transferData.length > 0) {
        try {
          const parsed = JSON.parse(transferData);
          if (parsed && typeof parsed === "object" && parsed.type) {
            return parsed as DraggedData;
          }
        } catch (parseErr) {
          console.warn("JSON parse failed in droppable:", parseErr);
        }
      }
      return null;
    } catch (error) {
      console.error("Error parsing drag data:", error);
      return null;
    }
  };

  const onDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      try {
        const draggedData = parseDragData(e);
        if (!draggedData) return;
        if (!Object.values(AcceptedDropTypes).includes(draggedData.type))
          return;
        setIsDraggingOver(true);
        setIsPointerInside(true);
        onDragStateChange?.(true);
      } catch (error) {
        console.error("onDragEnter error:", error);
      }
    },
    [onDragStateChange]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      try {
        const draggedData = parseDragData(e);
        if (!draggedData) return;
        if (!Object.values(AcceptedDropTypes).includes(draggedData.type))
          return;
        e.preventDefault();
        if (isPointerInside) {
          setIsDraggingOver(true);
          onDragStateChange?.(true);
        }
      } catch (error) {
        console.error("onDragOver error:", error);
      }
    },
    [isPointerInside, onDragStateChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!isDraggingOver) return;
      e.preventDefault();
      setIsDraggingOver(false);
      onDragStateChange?.(false);

      const draggedData = parseDragData(e);
      if (!draggedData) {
        clearDragData();
        return;
      }
      if (!Object.values(AcceptedDropTypes).includes(draggedData.type)) {
        clearDragData();
        return;
      }
      
      const rect = e.currentTarget.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      const pixelsPerMs = zoomToPixelsPerMs(zoom);
      const dropTimeMs = pxToMs(dropX, pixelsPerMs);
      
      handleDrop(draggedData, Math.max(0, dropTimeMs));
      clearDragData();
    },
    [isDraggingOver, onDragStateChange, handleDrop, zoom]
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDraggingOver(false);
        setIsPointerInside(false);
        onDragStateChange?.(false);
      }
    },
    [onDragStateChange]
  );

  return { onDragEnter, onDragOver, onDrop, onDragLeave, isDraggingOver };
};

export const DroppableArea: React.FC<DroppableAreaProps> = ({
  children,
  className,
  style,
  onDragStateChange,
  id
}) => {
  const { onDragEnter, onDragOver, onDrop, onDragLeave } =
    useDragAndDrop(onDragStateChange);

  return (
    <div
      id={id}
      onDragEnter={onDragEnter}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={className}
      style={style}
      role="region"
      aria-label="Droppable area for images, videos, and audio"
    >
      {children}
    </div>
  );
};
