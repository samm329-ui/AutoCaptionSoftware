"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useEngineSelector } from "../engine/engine-provider";
import { selectOrderedTracks } from "../engine/selectors";

interface TimelineVerticalScrollbarProps {
  className?: string;
}

export function TimelineVerticalScrollbar({ className }: TimelineVerticalScrollbarProps) {
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const tracks = useEngineSelector(selectOrderedTracks);
  const [thumbHeight, setThumbHeight] = useState(20);
  const [thumbPosition, setThumbPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  
  const TRACK_HEIGHT = 50;
  const containerHeight = 300;
  const numTracks = tracks?.length ?? 1;
  const contentHeight = Math.max(numTracks * TRACK_HEIGHT, containerHeight);

  const updateScrollPosition = useCallback(() => {
    const scrollableHeight = contentHeight - containerHeight;
    if (scrollableHeight <= 0) {
      setThumbHeight(100);
      setThumbPosition(0);
      return;
    }
    
    const thumbHeightPercent = Math.max(10, (containerHeight / contentHeight) * 100);
    setThumbHeight(thumbHeightPercent);
    
    const maxPosition = 100 - thumbHeightPercent;
    const positionPercent = (scrollTop / scrollableHeight) * maxPosition;
    setThumbPosition(Math.max(0, Math.min(maxPosition, positionPercent)));
  }, [contentHeight, containerHeight, scrollTop]);

  useEffect(() => {
    updateScrollPosition();
  }, [updateScrollPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
    
    const containerEl = scrollbarRef.current;
    if (!containerEl) return;
    
    const containerElHeight = containerEl.clientHeight;
    const maxPosition = 100 - thumbHeight;
    const startPosition = thumbPosition;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - e.clientY;
      const deltaPercent = (deltaY / containerElHeight) * 100;
      const newPosition = Math.max(0, Math.min(maxPosition, startPosition + deltaPercent));
      setThumbPosition(newPosition);
      
      const scrollableHeight = contentHeight - containerHeight;
      const newScrollTop = (newPosition / maxPosition) * scrollableHeight;
      setScrollTop(newScrollTop);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    const containerEl = scrollbarRef.current;
    if (!containerEl) return;
    
    const rect = containerEl.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const clickPercent = (clickY / containerEl.clientHeight) * 100;
    
    const maxPosition = 100 - thumbHeight;
    const newPosition = Math.max(0, Math.min(maxPosition, clickPercent - thumbHeight / 2));
    setThumbPosition(newPosition);
    
    const scrollableHeight = contentHeight - containerHeight;
    const newScrollTop = (newPosition / maxPosition) * scrollableHeight;
    setScrollTop(newScrollTop);
  };

  return (
    <div
      ref={scrollbarRef}
      className={cn(
        "absolute right-0 top-0 bottom-0 w-2 bg-muted/30 cursor-pointer z-20",
        isDragging && "bg-muted/50",
        className
      )}
      onClick={handleTrackClick}
      style={{ pointerEvents: "auto" }}
    >
      <div
        ref={thumbRef}
        className={cn(
          "absolute left-0 right-0 bg-foreground/40 rounded-sm cursor-grab",
          "hover:bg-foreground/60 transition-colors",
          isDragging && "bg-foreground/80 cursor-grabbing"
        )}
        style={{
          top: `${thumbPosition}%`,
          height: `${thumbHeight}%`,
          minHeight: "20px",
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}

export default TimelineVerticalScrollbar;