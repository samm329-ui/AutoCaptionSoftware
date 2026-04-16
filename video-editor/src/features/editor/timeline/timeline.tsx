/**
 * timeline/timeline.tsx — ENGINE-FIRST
 * Fixed version with proper clip rendering
 */

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Header from "./header";
import Ruler from "./ruler";
import Playhead from "./playhead";
import TrackHeaders from "./track-headers";
import { TimelineVerticalScrollbar } from "./vertical-scrollbar";
import TimelineMarkersLayer from "../panels/timeline-markers";
import DecibelMeter from "./decibel-meter";

import {
  useEngineSelector,
  useEngineDispatch,
  useEngineZoom,
} from "../engine/engine-provider";
import {
  selectOrderedTracks,
  selectSelection,
  selectAllClips,
} from "../engine/selectors";
import { setSelection, setPlayhead, seekPlayer } from "../engine/commands";
import { msToPx, pxToMs, pxToFrame, zoomToPixelsPerMs } from "../engine/time-scale";
import useStore from "../store/use-store";

const TRACK_HEIGHT = 50;

const Timeline = () => {
  const dispatch = useEngineDispatch();
  const tracks = useEngineSelector(selectOrderedTracks);
  const clips = useEngineSelector(selectAllClips);
  const selection = useEngineSelector(selectSelection);
  const zoom = useEngineZoom();
  const { playerRef } = useStore();

  const [scrollLeft, setScrollLeft] = useState(0);
  
  // Calculate pixels per millisecond using shared helper
  const pixelsPerMs = zoomToPixelsPerMs(zoom);

  const onRulerClick = useCallback((pixels: number) => {
    // Convert pixels to milliseconds using shared helper
    const timeMs = pxToMs(pixels, pixelsPerMs);
    const frame = pxToFrame(pixels, pixelsPerMs);
    dispatch(setPlayhead(timeMs));
    seekPlayer(frame);
  }, [dispatch, pixelsPerMs]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget as HTMLElement;
    setScrollLeft(target.scrollLeft);
  }, []);

  const handleClipClick = useCallback((e: React.MouseEvent, clipId: string) => {
    e.stopPropagation();
    dispatch(setSelection([clipId]));
  }, [dispatch]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video": return "bg-blue-500/80 border-blue-400";
      case "audio": return "bg-green-500/80 border-green-400";
      case "text": return "bg-purple-500/80 border-purple-400";
      case "caption": return "bg-yellow-500/80 border-yellow-400";
      case "image": return "bg-orange-500/80 border-orange-400";
      default: return "bg-gray-500/80 border-gray-400";
    }
  };

  // Create track index map
  const trackIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    tracks.forEach((track, index) => {
      map.set(track.id, index);
    });
    return map;
  }, [tracks]);

  // Calculate max time for timeline width
  const maxTime = useMemo(() => {
    if (clips.length === 0) return 10000;
    const max = Math.max(...clips.map(c => c.display.to));
    return Math.max(max + 5000, 10000);
  }, [clips]);

  const timelineWidth = Math.max(maxTime * pixelsPerMs, 1000);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="shrink-0">
        <Header />
      </div>
      
      {/* Ruler */}
      <div className="shrink-0">
        <Ruler onClick={onRulerClick} scrollLeft={scrollLeft} onScroll={onScroll} />
      </div>
      
      {/* Main timeline area */}
      <div className="flex flex-1 min-h-0">
        {/* Track headers */}
        <div 
          className="shrink-0 bg-sidebar border-r border-border overflow-y-auto"
          style={{ width: 120 }}
        >
          <TrackHeaders tracks={tracks} />
        </div>
        
        {/* Timeline content */}
        <div 
          className="flex-1 overflow-auto relative bg-card"
          onScroll={onScroll}
          onClick={() => dispatch(setSelection([]))}
        >
          {/* Inner container */}
          <div 
            style={{ 
              width: timelineWidth, 
              minHeight: "100%",
              position: "relative"
            }}
          >
            {/* Track lanes */}
            {tracks.map((track, index) => (
              <div
                key={`lane-${track.id}`}
                className="border-b border-border/30 bg-muted/5"
                style={{ height: TRACK_HEIGHT }}
              />
            ))}
            
            {/* Show message if no tracks */}
            {tracks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                No tracks yet. Add media to create tracks.
              </div>
            )}
            
            {/* Render clips */}
            {clips.map((clip) => {
              const trackIndex = trackIndexMap.get(clip.trackId);
              
              // If no track found, try to find any track to place it on
              let displayIndex = trackIndex;
              if (displayIndex === undefined) {
                displayIndex = 0; // Place on first track as fallback
              }
              
              const isSelected = selection.includes(clip.id);
              const left = clip.display.from * pixelsPerMs;
              const width = (clip.display.to - clip.display.from) * pixelsPerMs;
              
              return (
                <div
                  key={`clip-${clip.id}`}
                  className={`absolute rounded border-2 text-white select-none cursor-pointer transition-all hover:brightness-110 ${getTypeColor(clip.type)} ${
                    isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                  }`}
                  style={{
                    left: `${left}px`,
                    width: `${Math.max(width, 20)}px`,
                    height: TRACK_HEIGHT - 10,
                    top: `${displayIndex * TRACK_HEIGHT + 5}px`,
                  }}
                  onClick={(e) => handleClipClick(e, clip.id)}
                >
                  <div className="px-1.5 py-0.5 text-[9px] truncate font-medium leading-tight overflow-hidden">
                    {clip.name || clip.type}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Playhead */}
          <Playhead scrollLeft={scrollLeft} pixelsPerMs={pixelsPerMs} />
          
          {/* Markers */}
          <TimelineMarkersLayer scrollLeft={scrollLeft} />
        </div>
        
        {/* Vertical scrollbar */}
        <div className="shrink-0 w-4 bg-sidebar border-l border-border">
          <TimelineVerticalScrollbar />
        </div>
      </div>
      
      {/* Audio meter */}
      <div className="shrink-0 h-6">
        <DecibelMeter />
      </div>
    </div>
  );
};

export default Timeline;