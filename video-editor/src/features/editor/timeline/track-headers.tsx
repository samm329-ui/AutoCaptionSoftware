"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Lock, Unlock, Eye, EyeOff, VolumeX, Volume2 } from "lucide-react";
import { useEngineDispatch, useEngineSelector } from "../engine/engine-provider";
import { updateTrack, addTrack, removeTrack } from "../engine/commands";
import type { Track } from "../engine/engine-core";
import { createTrack } from "../engine/engine-core";
import ContextMenu from "./context-menu";
import AddTracksModal from "./add-tracks-modal";
import DeleteTrackModal from "./delete-track-modal";

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
    for (const track of groupTracks) {
      labels.set(track.id, { label: track.name, group });
    }
  }
  
  return { labels, groupOrder };
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
  const allTracks = useEngineSelector((state) => state.tracks);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showAddTracksModal, setShowAddTracksModal] = useState(false);
  const [showDeleteTrackModal, setShowDeleteTrackModal] = useState(false);

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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleAddTrack = useCallback(() => {
    // Count existing tracks by type
    const videoTracks = Object.values(allTracks).filter(t => t.group === "video");
    const audioTracks = Object.values(allTracks).filter(t => t.group === "audio");
    const textTracks = Object.values(allTracks).filter(t => t.group === "text");
    const subtitleTracks = Object.values(allTracks).filter(t => t.group === "subtitle");

    // Helper to extract track number from name like "V1" -> 1
    const getTrackNumber = (name: string) => {
      const match = name.match(/[0-9]+/);
      return match ? parseInt(match[0]) : 1;
    };

    // Find highest number for each track type
    const maxVideoNum = videoTracks.length > 0 
      ? Math.max(...videoTracks.map(t => getTrackNumber(t.name))) 
      : 0;
    const maxAudioNum = audioTracks.length > 0 
      ? Math.max(...audioTracks.map(t => getTrackNumber(t.name))) 
      : 0;

    // Add video track with next number
    const newVideoNumber = maxVideoNum + 1;
    const newTrack = createTrack("video", { 
      name: `V${newVideoNumber}`,
      order: videoTracks.length
    });
    dispatch(addTrack(newTrack));
  }, [dispatch, allTracks]);

  const handleDeleteTracks = useCallback((config: {
    video: { enabled: boolean; tracksToDelete: string[] };
    audio: { enabled: boolean; tracksToDelete: string[] };
    text: { enabled: boolean; tracksToDelete: string[] };
    subtitle: { enabled: boolean; tracksToDelete: string[] };
  }) => {
    // Delete tracks for each type with smart renaming
    const deleteTracksOfType = (group: string, trackIds: string[]) => {
      if (trackIds.length === 0) return;
      
      const tracksOfType = Object.values(allTracks)
        .filter(t => t.group === group)
        .sort((a, b) => a.order - b.order);
      
      const prefix = group === "video" ? "V" : group === "audio" ? "A" : group === "text" ? "T" : "S";
      
      // Get indices of tracks to delete
      const deleteIndices = trackIds.map(id => {
        const track = tracksOfType.find(t => t.id === id);
        return track ? tracksOfType.indexOf(track) : -1;
      }).filter(i => i >= 0).sort((a, b) => b - a); // Sort descending
      
      // Delete each track (highest index first)
      for (const idx of deleteIndices) {
        const track = tracksOfType[idx];
        
        // First delete the clips on this track (they'll be lost)
        // Then rename tracks that come after (shift numbers down)
        for (let j = idx + 1; j < tracksOfType.length; j++) {
          const nextTrack = tracksOfType[j];
          const currentNum = parseInt(nextTrack.name.replace(prefix, ""));
          if (!isNaN(currentNum)) {
            nextTrack.name = `${prefix}${currentNum - 1}`;
            dispatch(updateTrack(nextTrack.id, { name: nextTrack.name }));
            dispatch(updateTrack(nextTrack.id, { order: j - 1 }));
          }
        }
        
        // Finally delete the track
        dispatch(removeTrack(track.id));
        
        // Update local list
        tracksOfType.splice(idx, 1);
      }
    };
    
    if (config.video.enabled && config.video.tracksToDelete.length > 0) {
      deleteTracksOfType("video", config.video.tracksToDelete);
    }
    if (config.audio.enabled && config.audio.tracksToDelete.length > 0) {
      deleteTracksOfType("audio", config.audio.tracksToDelete);
    }
    if (config.text.enabled && config.text.tracksToDelete.length > 0) {
      deleteTracksOfType("text", config.text.tracksToDelete);
    }
    if (config.subtitle.enabled && config.subtitle.tracksToDelete.length > 0) {
      deleteTracksOfType("subtitle", config.subtitle.tracksToDelete);
    }
  }, [dispatch, allTracks]);

  const handleToggleAllVideoOutput = useCallback(() => {
    // Toggle output for all video tracks
    Object.values(allTracks)
      .filter(t => t.type === "video" || t.type === "overlay")
      .forEach(track => {
        dispatch(updateTrack(track.id, { hidden: !track.hidden }));
      });
  }, [dispatch, allTracks]);

  const handleToggleAllAudioOutput = useCallback(() => {
    // Toggle output for all audio tracks
    Object.values(allTracks)
      .filter(t => t.type === "audio")
      .forEach(track => {
        dispatch(updateTrack(track.id, { hidden: !track.hidden }));
      });
  }, [dispatch, allTracks]);

  return (
    <>
      <div className="w-full h-auto relative group" onContextMenu={handleContextMenu}>
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

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onAddTrack={() => setShowAddTracksModal(true)}
          onDeleteTrack={() => setShowDeleteTrackModal(true)}
          onToggleAllVideoOutput={handleToggleAllVideoOutput}
          onToggleAllAudioOutput={handleToggleAllAudioOutput}
        />
      )}

      {/* Add Tracks Modal */}
      {showAddTracksModal && (
        <AddTracksModal
          onClose={() => setShowAddTracksModal(false)}
          onAddTracks={(config) => {
            // Parse placement and add tracks with smart renaming
            const addTracksOfType = (type: "video" | "audio" | "submix", amount: number, placement: string) => {
              const tracksOfType = Object.values(allTracks).filter(t => 
                type === "video" ? t.group === "video" : t.group === "audio"
              );
              
              // Sort by order to get correct sequence
              tracksOfType.sort((a, b) => a.order - b.order);
              
              const prefix = type === "video" ? "V" : "A";
              
              // Parse placement - "After V1" -> find V1
              let insertIndex = tracksOfType.length;
              if (placement !== "At End") {
                const afterTrackName = placement.replace("After ", "");
                const afterTrack = tracksOfType.find(t => t.name === afterTrackName);
                if (afterTrack) {
                  insertIndex = tracksOfType.indexOf(afterTrack) + 1;
                }
              }
              
              // Add tracks with smart renaming
              for (let i = 0; i < amount; i++) {
                const newIndex = insertIndex + i;
                
                // Rename tracks that come after the insert point
                for (let j = tracksOfType.length - 1; j >= newIndex; j--) {
                  const track = tracksOfType[j];
                  const currentNum = parseInt(track.name.replace(prefix, ""));
                  track.name = `${prefix}${currentNum + 1}`;
                  dispatch(updateTrack(track.id, { name: track.name }));
                }
                
                // Create new track
                const newNum = newIndex + 1;
                const newTrack = createTrack(type === "submix" ? "audio" : type, {
                  name: `${prefix}${newNum}`,
                  order: newIndex,
                });
                dispatch(addTrack(newTrack));
                
                // Refresh tracks list for next iteration
                tracksOfType.splice(newIndex, 0, newTrack);
              }
            };
            
            if (config.video.enabled && config.video.amount > 0) {
              addTracksOfType("video", config.video.amount, config.video.placement);
            }
            if (config.audio.enabled && config.audio.amount > 0) {
              addTracksOfType("audio", config.audio.amount, config.audio.placement);
            }
            if (config.submix.enabled && config.submix.amount > 0) {
              addTracksOfType("submix", config.submix.amount, config.submix.placement);
            }
          }}
          tracks={tracks}
        />
      )}

      {/* Delete Track Modal */}
      {showDeleteTrackModal && (
        <DeleteTrackModal
          onClose={() => setShowDeleteTrackModal(false)}
          onDeleteTracks={handleDeleteTracks}
          tracks={tracks}
        />
      )}
    </>
  );
}