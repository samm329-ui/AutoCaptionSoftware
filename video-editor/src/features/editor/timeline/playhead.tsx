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
import { msToPx, pxToMs, frameToMs, msToFrame, zoomToPixelsPerMs } from "../engine/time-scale";

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
  
  // Use engine playheadTime (in ms) with shared conversion helper
  // Position should account for scrollLeft to keep playhead in sync with timeline
  const position = useMemo(() => {
    const timeMs = enginePlayheadTime || 0;
    const rawPosition = msToPx(timeMs, pixelsPerMs);
    // Subtract scrollLeft to position correctly in the scrolled timeline
    return rawPosition - scrollLeft;
  }, [enginePlayheadTime, pixelsPerMs, scrollLeft]);
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, startTimeMs: 0 });

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
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    // Store current playhead time as the drag origin, NOT scrollLeft
    dragStartRef.current = { x: clientX, startTimeMs: enginePlayheadTime || 0 };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !playerRef?.current) return;
      
      const deltaX = e.clientX - dragStartRef.current.x;
      // Calculate new time from the stored origin, not from scroll offset
      const newTimeMs = dragStartRef.current.startTimeMs + (deltaX / pixelsPerMs);
      const newFrame = msToFrame(newTimeMs, fps);
      
playerRef.current.seekTo(newFrame);
      engineDispatch(setPlayhead(Math.max(0, newTimeMs)), { skipHistory: true });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !playerRef?.current) return;
      
      const deltaX = e.touches[0].clientX - dragStartRef.current.x;
      const newTimeMs = dragStartRef.current.startTimeMs + (deltaX / pixelsPerMs);
      const newFrame = msToFrame(newTimeMs, fps);
      
      playerRef.current.seekTo(newFrame);
      engineDispatch(setPlayhead(Math.max(0, newTimeMs)), { skipHistory: true });
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

  // Only render if in visible range
  if (position < -10 || position > 3000) {
    return null;
  }

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
        width: "2px",
        height: "100%",
        cursor: "col-resize",
      }}
    >
      <div
        className="absolute -top-1 -left-1 w-3 h-3 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <div 
        className="w-px h-full" 
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

export default Playhead;