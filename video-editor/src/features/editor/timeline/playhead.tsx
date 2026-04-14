import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import useStore from "../store/use-store";
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

interface PlayheadProps {
  scrollLeft: number;
  pixelsPerMs: number;
}

const Playhead = ({ scrollLeft, pixelsPerMs }: PlayheadProps) => {
  const playheadRef = useRef<HTMLDivElement>(null);
  const { playerRef } = useStore();
  const fps = useEngineFps();
  const engineDispatch = useEngineDispatch();
  const enginePlayheadTime = useEnginePlayhead(); // Read from engine
  
  const currentFrame = useCurrentPlayerFrame(playerRef) || 0;
  
  // Use engine playheadTime (in ms) 
  const position = useMemo(() => {
    const timeMs = enginePlayheadTime || 0;
    // Simple: time * zoom = pixels
    return timeMs * pixelsPerMs;
  }, [enginePlayheadTime, pixelsPerMs]);
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });

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
    dragStartRef.current = { x: clientX, scrollLeft };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !playerRef?.current) return;
      
      const deltaX = e.clientX - dragStartRef.current.x;
      const newTimeMs = (dragStartRef.current.scrollLeft + deltaX) / pixelsPerMs;
      const newFrame = Math.round(newTimeMs * (fps / 1000));
      
      playerRef.current.seekTo(newFrame);
      engineDispatch(setPlayhead(newTimeMs), { skipHistory: true });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !playerRef?.current) return;
      
      const deltaX = e.touches[0].clientX - dragStartRef.current.x;
      const newTimeMs = (dragStartRef.current.scrollLeft + deltaX) / pixelsPerMs;
      const newFrame = Math.round(newTimeMs * (fps / 1000));
      
      playerRef.current.seekTo(newFrame);
      engineDispatch(setPlayhead(newTimeMs), { skipHistory: true });
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