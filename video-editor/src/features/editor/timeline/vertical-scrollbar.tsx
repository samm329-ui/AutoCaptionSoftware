"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import useStore from "../store/use-store";

interface TimelineVerticalScrollbarProps {
  className?: string;
}

export function TimelineVerticalScrollbar({ className }: TimelineVerticalScrollbarProps) {
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const { timeline } = useStore();
  const [thumbHeight, setThumbHeight] = useState(50);
  const [thumbPosition, setThumbPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  
  const containerHeight = 300;

  const updateScrollPosition = useCallback(() => {
    if (!timeline) return;
    
    const contentHeight = timeline.height || 500;
    const visibleHeight = containerHeight;
    
    const scrollableHeight = contentHeight - visibleHeight;
    if (scrollableHeight <= 0) {
      setThumbHeight(100);
      setThumbPosition(0);
      return;
    }
    
    const thumbHeightPercent = Math.max(10, (visibleHeight / contentHeight) * 100);
    setThumbHeight(thumbHeightPercent);
    
    const maxPosition = 100 - thumbHeightPercent;
    const positionPercent = (scrollTop / scrollableHeight) * maxPosition;
    setThumbPosition(Math.max(0, Math.min(maxPosition, positionPercent)));
  }, [timeline, containerHeight, scrollTop]);

  useEffect(() => {
    updateScrollPosition();
    
    const handleScroll = () => updateScrollPosition();
    window.addEventListener("resize", handleScroll);
    
    return () => window.removeEventListener("resize", handleScroll);
  }, [updateScrollPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
    
    const startY = e.clientY;
    const startPosition = thumbPosition;
    const currentScrollTop = scrollTop;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const containerEl = scrollbarRef.current;
      if (!containerEl) return;
      
      const containerElHeight = containerEl.clientHeight;
      const maxPosition = 100 - thumbHeight;
      const deltaPercent = (deltaY / containerElHeight) * 100;
      const newPosition = Math.max(0, Math.min(maxPosition, startPosition + deltaPercent));
      setThumbPosition(newPosition);
      
      if (timeline) {
        const contentHeight = timeline.height || 500;
        const scrollableHeight = contentHeight - containerHeight;
        const newScrollTop = (newPosition / maxPosition) * scrollableHeight;
        setScrollTop(newScrollTop);
        timeline.scrollTo({ scrollTop: newScrollTop });
      }
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
    if (!containerEl || !timeline) return;
    
    const rect = containerEl.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const clickPercent = (clickY / containerEl.clientHeight) * 100;
    
    const maxPosition = 100 - thumbHeight;
    const newPosition = Math.max(0, Math.min(maxPosition, clickPercent - thumbHeight / 2));
    setThumbPosition(newPosition);
    
    const contentHeight = timeline.height || 500;
    const scrollableHeight = contentHeight - containerHeight;
    const newScrollTop = (newPosition / maxPosition) * scrollableHeight;
    setScrollTop(newScrollTop);
    timeline.scrollTo({ scrollTop: newScrollTop });
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
