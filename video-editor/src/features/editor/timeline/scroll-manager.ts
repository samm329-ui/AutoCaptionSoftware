/**
 * timeline/scroll-manager.ts
 * 
 * Pure engine-based scroll management for timeline.
 * No CanvasTimeline dependencies.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useEngineSelector, useEngineDispatch } from "../engine/engine-provider";
import { setScroll } from "../engine/commands";
import { selectAllClips, selectDuration } from "../engine/selectors";

export function useTimelineScroll(containerRef: React.RefObject<HTMLDivElement | null>) {
  const dispatch = useEngineDispatch();
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  
  const engineZoom = useEngineSelector((s) => s.ui.zoom);
  const sequenceDuration = useEngineSelector(selectDuration);
  
  const duration = sequenceDuration > 0 ? sequenceDuration : 10000;
  
  // Calculate total width - engineZoom is already pixels per ms
  const totalWidth = duration * engineZoom;
  
  const scrollTo = useCallback((position: number) => {
    const container = containerRef.current;
    if (!container) return;
    
    const maxScroll = Math.max(0, totalWidth - container.clientWidth);
    const clampedPosition = Math.max(0, Math.min(position, maxScroll));
    
    container.scrollLeft = clampedPosition;
    setScrollLeft(clampedPosition);
    
    dispatch(setScroll(clampedPosition));
  }, [dispatch, totalWidth]);

  const onScrollChange = useCallback((newScrollLeft: number) => {
    setScrollLeft(newScrollLeft);
    dispatch(setScroll(newScrollLeft));
  }, [dispatch]);

  const handleHorizontalScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const newLeft = container.scrollLeft;
    if (newLeft !== scrollLeft) {
      setScrollLeft(newLeft);
      dispatch(setScroll(newLeft));
    }
  }, [dispatch, scrollLeft]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener("scroll", handleHorizontalScroll);
    return () => container.removeEventListener("scroll", handleHorizontalScroll);
  }, [handleHorizontalScroll]);

  return {
    scrollLeft,
    scrollTop,
    scrollTo,
    onScrollChange,
    totalWidth,
    scrollbarRef,
  };
}