import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { usePlayerRef } from "../engine/engine-hooks";
import {
  MouseEvent,
  TouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "next-themes";
import { useEngineFps, useEngineDispatch, useEnginePlayhead } from "../engine/engine-provider";
import { setPlayhead } from "../engine/commands";
import { msToPx, msToFrame } from "../engine/time-scale";

interface PlayheadProps {
  scrollLeft: number;
  pixelsPerMs: number;
}

const Playhead = ({ scrollLeft, pixelsPerMs }: PlayheadProps) => {
  const playheadRef = useRef<HTMLDivElement>(null);
  const playerRef = usePlayerRef();
  const fps = useEngineFps();
  const engineDispatch = useEngineDispatch();
  const enginePlayheadTime = useEnginePlayhead(); // Read from engine
  
  const currentFrame = useCurrentPlayerFrame(playerRef) || 0;
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, startTimeMs: 0, startClientX: 0 });
  const dragPositionRef = useRef<number>(0);
  
  // Use local drag position when dragging, otherwise use engine position
  // Position is based on time only - scroll is handled by container
  const position = useMemo(() => {
    if (isDragging) {
      return dragPositionRef.current;
    }
    const timeMs = enginePlayheadTime || 0;
    return msToPx(timeMs, pixelsPerMs);
  }, [isDragging, enginePlayheadTime, pixelsPerMs]);

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const color = useMemo(() => {
    if (!mounted) return "#ffffff";
    return (theme === "system" ? resolvedTheme : theme) === "dark" ? "#ffffff" : "#000000";
  }, [mounted, theme, resolvedTheme]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (
    e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const currentTimeMs = enginePlayheadTime || 0;
    dragStartRef.current = { 
      x: clientX, 
      startTimeMs: currentTimeMs,
      startClientX: clientX 
    };
    dragPositionRef.current = msToPx(currentTimeMs, pixelsPerMs);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStartRef.current.startClientX;
      const newTimeMs = Math.max(0, dragStartRef.current.startTimeMs + (deltaX / pixelsPerMs));
      const newFrame = msToFrame(newTimeMs, fps);
      
      dragPositionRef.current = msToPx(newTimeMs, pixelsPerMs);
      playerRef?.seekTo(newFrame);
      engineDispatch(setPlayhead(newTimeMs));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.touches[0].clientX - dragStartRef.current.startClientX;
      const newTimeMs = Math.max(0, dragStartRef.current.startTimeMs + (deltaX / pixelsPerMs));
      const newFrame = msToFrame(newTimeMs, fps);
      
      dragPositionRef.current = msToPx(newTimeMs, pixelsPerMs);
      playerRef?.seekTo(newFrame);
      engineDispatch(setPlayhead(newTimeMs));
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove as any);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove as any);
      document.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove as any);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove as any);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, pixelsPerMs, playerRef, fps, engineDispatch]);

// Always render playhead (don't hide based on position)
  return (
    <div
      ref={playheadRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onDragStart={(e) => e.preventDefault()}
      id="playhead"
      className="absolute top-0 z-50 pointer-events-auto"
      style={{
        left: `${position}px`,
        width: "14px",
        height: "100%",
        cursor: "col-resize",
        transform: "translateX(-6px)",
      }}
    >
      {/* Larger grab area at top - visible handle */}
      <div
        className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-sm hover:scale-125 transition-transform"
        style={{ backgroundColor: color }}
        title="Drag to move playhead"
      />
      {/* Invisible wider hit area above the visible handle for easier grabbing */}
      <div
        className="absolute -top-8 left-1/2 -translate-x-1/2 w-8 h-8"
        style={{ cursor: "col-resize" }}
      />
      <div 
        className="w-px h-full mx-auto" 
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

export default Playhead;