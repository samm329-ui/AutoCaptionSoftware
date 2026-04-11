/**
 * timeline/timeline.tsx
 * 
 * SIMPLE NEW TIMELINE - uses Zustand store only
 */

import { useState, useCallback, useMemo } from "react";
import Header from "./header";
import Ruler from "./ruler";
import useStore from "../store/use-store";
import Playhead from "./playhead";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import TimelineToolbar from "../timeline-toolbar";
import { TimelineVerticalScrollbar } from "./vertical-scrollbar";
import TimelineMarkersLayer from "../panels/timeline-markers";
import DecibelMeter from "./decibel-meter";
import TrackHeaders from "./track-headers";

const TRACK_HEIGHT = 40;

const Timeline = () => {
  // Get everything from Zustand store
  const { scale, playerRef, fps, tracks: storeTracks, activeIds: selection, trackItemsMap } = useStore();
  
  const [scrollLeft, setScrollLeft] = useState(0);
  const timelineHeight = 200;
  const pixelsPerMs = scale.zoom * 100;
  
  // Handle ruler click
  const onRulerClick = useCallback((units: number) => {
    const timeMs = units * 1000 / scale.zoom;
    playerRef?.current?.seekTo(Math.round((timeMs / 1000) * fps));
  }, [playerRef, scale.zoom, fps]);
  
  // Handle scroll
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  return (
    <div className="flex h-full">
      <TimelineToolbar className="w-16 shrink-0" />
      <div
        className="relative flex-1 overflow-hidden bg-card"
        style={{ height: `${timelineHeight}px` }}
      >
        <Header />
        <Ruler onClick={onRulerClick} scrollLeft={scrollLeft} onScroll={onScroll} />
        <TimelineMarkersLayer scrollLeft={scrollLeft} />
        <Playhead scrollLeft={scrollLeft} />
        <div className="flex">
          <div style={{ width: 150 }} className="relative flex-none">
            <TrackHeaders scrollLeft={scrollLeft} />
          </div>
          <div
            className="relative flex-1 overflow-auto"
            style={{ height: timelineHeight - 50 }}
            onScroll={onScroll}
          >
            {/* Render tracks from store */}
            {storeTracks.map((track: any) => (
              <div
                key={track?.id}
                className="border-b border-border/30"
                style={{ height: TRACK_HEIGHT }}
              >
                {(track?.clipIds || []).map((clipId: string) => {
                  const clip = trackItemsMap[clipId];
                  if (!clip) return null;
                  
                  const left = (clip.display?.from || 0) * pixelsPerMs - scrollLeft;
                  const width = ((clip.display?.to || 0) - (clip.display?.from || 0)) * pixelsPerMs;
                  const isSelected = selection.includes(clipId);
                  
                  if (left + width < -100 || left > 3000) return null;
                  
                  const getTypeColor = () => {
                    switch (clip.type) {
                      case "video": return "bg-blue-500/60 border-blue-400";
                      case "audio": return "bg-green-500/60 border-green-400";
                      case "text": return "bg-purple-500/60 border-purple-400";
                      case "caption": return "bg-yellow-500/60 border-yellow-400";
                      case "image": return "bg-orange-500/60 border-orange-400";
                      default: return "bg-gray-500/60 border-gray-400";
                    }
                  };
                  
                  return (
                    <div
                      key={clipId}
                      className={`absolute rounded border text-white select-none ${getTypeColor()} ${
                        isSelected ? "ring-2 ring-cyan-400" : ""
                      }`}
                      style={{
                        left: `${left}px`,
                        width: `${Math.max(width || 20, 16)}px`,
                        height: TRACK_HEIGHT - 8,
                        top: "4px",
                        cursor: "move",
                      }}
                    >
                      <div className="px-2 py-1 text-[9px] truncate">
                        {clip.name || clip.type}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <TimelineVerticalScrollbar className="top-[50px]" />
      </div>
      <DecibelMeter />
    </div>
  );
};

export default Timeline;