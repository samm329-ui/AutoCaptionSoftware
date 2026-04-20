"use client";

/**
 * TrackHeaders — ENGINE-FIRST
 * Reads track data from engine selectors. Updates via engine commands.
 */

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Lock, Unlock, Eye, EyeOff, VolumeX, Volume2 } from "lucide-react";
import { useEngineDispatch } from "../engine/engine-provider";
import { updateTrack } from "../engine/commands";
import type { Track } from "../engine/engine-core";

function assignLabels(tracks: Track[]) {
  const labels = new Map<string, { label: string; group: string }>();
  const groupOrder: { group: string; tracks: Track[] }[] = [];
  
  const groups = { subtitle: [] as Track[], video: [] as Track[], text: [] as Track[], audio: [] as Track[] };
  
  for (const track of tracks) {
    const group = track.group || (track.type === "audio" ? "audio" : track.type === "caption" ? "subtitle" : track.type === "text" ? "text" : "video");
    if (groups[group]) {
      groups[group].push(track);
    }
  }
  
  for (const group of ["video", "text", "subtitle", "audio"] as const) {
    if (groups[group].length > 0) {
      groupOrder.push({ group, tracks: groups[group] });
    }
  }
  
  for (const { group, tracks: groupTracks } of groupOrder) {
    const prefix = group === "subtitle" ? "S" : group === "text" ? "T" : group === "video" ? "V" : "A";
    
    for (let i = 0; i < groupTracks.length; i++) {
      labels.set(groupTracks[i].id, { label: `${prefix}${i + 1}`, group });
    }
  }
  
  return { labels, groupOrder };
}

function GroupLabel({ group }: { group: string }) {
  const label = group === "video" ? "VIDEO" : group === "audio" ? "AUDIO" : group === "text" ? "TEXT" : "SUBTITLE";
  return (
    <div className="h-6 px-2 flex items-center bg-sidebar border-b border-border/50">
      <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{label}</span>
    </div>
  );
}

interface TrackHeadersProps {
  scrollLeft?: number;
  tracks: Track[];
  segmentHeights?: Record<string, number>;
  onSegmentResize?: (group: string, deltaY: number) => void;
}

export default function TrackHeaders({ tracks, segmentHeights = {}, onSegmentResize }: TrackHeadersProps) {
  const dispatch = useEngineDispatch();
  const { labels, groupOrder } = assignLabels(tracks);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroupCollapse = useCallback((group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  const getTrackHeight = (group: string) => (segmentHeights ?? {})[group] ?? 36;

  const toggleLock = useCallback(
    (trackId: string, locked: boolean) => dispatch(updateTrack(trackId, { locked: !locked })),
    [dispatch]
  );
  const toggleMute = useCallback(
    (trackId: string, muted: boolean) => dispatch(updateTrack(trackId, { muted: !muted })),
    [dispatch]
  );
  const toggleHide = useCallback(
    (trackId: string, hidden: boolean) => dispatch(updateTrack(trackId, { hidden: !hidden })),
    [dispatch]
  );

  return (
    <div className="w-full h-auto relative group">
      {groupOrder.map(({ group, tracks: groupTracks }) => {
        const groupHeight = groupTracks.length * getTrackHeight(group);
        const isCollapsed = collapsedGroups?.has(group);
        return (
        <div key={group} className="relative">
          {/* Resize handle spans exactly this group's height */}
          {!isCollapsed && (
            <div
              className="absolute right-0 w-1 cursor-row-resize opacity-0 group-hover:opacity-100 bg-primary/50 hover:bg-primary transition-opacity"
              style={{ 
                height: groupHeight,
                top: 0,
                bottom: 0
              }}
              onMouseDown={(e) => {
                if (!onSegmentResize) return;
                e.preventDefault();
                e.stopPropagation();
                const startY = e.clientY;
                const handleMouseMove = (moveEvt: MouseEvent) => {
                  const deltaY = startY - moveEvt.clientY;
                  onSegmentResize(group, deltaY);
                };
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
)}
          {!isCollapsed && groupTracks.map((track) => {
            const info = labels.get(track.id);
            if (!info) return null;
            const { label, group: trackGroup } = info;
            const isAudio = trackGroup === "audio";
            
            return (
              <div
                key={track.id}
                className={cn(
                  "flex items-center justify-between px-2 border-b border-border/30",
                  track.locked && "opacity-50"
                )}
                style={{ height: getTrackHeight(group) }}
              >
                <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
   
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => toggleHide(track.id, track.hidden)}
                    className={cn(
                      "p-0.5 rounded transition-colors",
                      track.hidden
                        ? "text-red-400 hover:bg-white/10"
                        : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/5"
                    )}
                    title={track.hidden ? "Show track" : "Hide track"}
                  >
                    {track.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => toggleLock(track.id, track.locked)}
                    className={cn(
                      "p-0.5 rounded transition-colors",
                      track.locked
                        ? "text-amber-400 hover:bg-white/10"
                        : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/5"
                    )}
                    title={track.locked ? "Unlock track" : "Lock track"}
                  >
                    {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                  {isAudio && (
                    <button
                      onClick={() => toggleMute(track.id, track.muted)}
                      className={cn(
                        "p-0.5 rounded transition-colors text-[9px] font-medium",
                        track.muted
                          ? "text-red-400 hover:bg-white/10"
                          : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/5"
                      )}
                      title={track.muted ? "Unmute track" : "Mute track"}
                    >
                      M
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        );
      })}
    </div>
  );
}