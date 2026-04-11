/**
 * timeline/items/clip-item.tsx
 * 
 * React-based timeline clip rendering.
 * Replaces CanvasTimeline item rendering.
 */

import { useCallback, useState, memo } from "react";
import { useEngineDispatch, useEngineSelector } from "../../engine/engine-provider";
import { moveClip, trimClip, setSelection } from "../../engine/commands";
import { snapEngine } from "../../engine/subsystems/snap-engine";

interface ClipItemProps {
  clipId: string;
  pixelsPerMs: number;
  trackHeight: number;
  offsetLeft: number;
}

const ClipItem = memo(function ClipItem({ 
  clipId, 
  pixelsPerMs, 
  trackHeight,
  offsetLeft 
}: ClipItemProps) {
  const dispatch = useEngineDispatch();
  const clip = useEngineSelector((s) => s.clips[clipId]);
  const selection = useEngineSelector((s) => s.ui.selection);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isTrimming, setIsTrimming] = useState<"left" | "right" | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [originalFrom, setOriginalFrom] = useState(0);
  const [originalTo, setOriginalTo] = useState(0);

  if (!clip) return null;

  const isSelected = selection.includes(clipId);
  const left = clip.display.from * pixelsPerMs + offsetLeft;
  const width = (clip.display.to - clip.display.from) * pixelsPerMs;
  const top = 0;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    dispatch(setSelection([clipId]));
    setIsDragging(true);
    setDragStartX(e.clientX);
    setOriginalFrom(clip.display.from);
    setOriginalTo(clip.display.to);
  }, [clipId, clip, dispatch]);

  const handleTrimStart = useCallback((edge: "left" | "right") => (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTrimming(edge);
    setDragStartX(e.clientX);
    setOriginalFrom(clip.display.from);
    setOriginalTo(clip.display.to);
  }, [clip]);

  const getTypeColor = () => {
    switch (clip.type) {
      case "video": return "bg-blue-500/50";
      case "audio": return "bg-green-500/50";
      case "text": return "bg-purple-500/50";
      case "caption": return "bg-yellow-500/50";
      case "image": return "bg-orange-500/50";
      default: return "bg-gray-500/50";
    }
  };

  return (
    <div
      className={`absolute rounded cursor-move select-none ${getTypeColor()} ${
        isSelected ? "ring-2 ring-cyan-400" : ""
      } ${isDragging || isTrimming ? "opacity-80" : ""}`}
      style={{
        left: `${left}px`,
        width: `${Math.max(width, 10)}px`,
        height: `${trackHeight - 4}px`,
        top: `${top + 2}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Trim handles */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
        onMouseDown={handleTrimStart("left")}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
        onMouseDown={handleTrimStart("right")}
      />
      
      {/* Clip label */}
      <div className="px-1 text-[10px] text-white truncate">
        {clip.name || clip.type}
      </div>
    </div>
  );
});

export default ClipItem;
