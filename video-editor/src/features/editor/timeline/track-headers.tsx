"use client";

/**
 * TrackHeaders — ENGINE-FIRST
 * Reads track data from engine selectors. Updates via engine commands.
 */

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Lock, Unlock, Eye, EyeOff, Volume2, VolumeX } from "lucide-react";
import { useEngineDispatch } from "../engine/engine-provider";
import { updateTrack } from "../engine/commands";
import type { Track } from "../engine/engine-core";

const VIDEO_TYPES = new Set(["video", "image", "overlay"]);
const AUDIO_TYPES = new Set(["audio"]);

function assignLabels(tracks: Track[]) {
  const labels = new Map<string, { label: string; isVideo: boolean; isAudio: boolean }>();
  const videoTracks = tracks.filter((t) => VIDEO_TYPES.has(t.type));
  const audioTracks = tracks.filter((t) => AUDIO_TYPES.has(t.type));

  for (let i = 0; i < videoTracks.length; i++) {
    labels.set(videoTracks[i].id, {
      label: `V${videoTracks.length - i}`,
      isVideo: true,
      isAudio: false,
    });
  }
  for (let i = 0; i < audioTracks.length; i++) {
    labels.set(audioTracks[i].id, {
      label: `A${i + 1}`,
      isVideo: false,
      isAudio: true,
    });
  }
  let other = 1;
  for (const t of tracks) {
    if (!labels.has(t.id)) {
      labels.set(t.id, { label: `T${other++}`, isVideo: false, isAudio: false });
    }
  }
  return labels;
}

interface TrackHeadersProps {
  scrollLeft?: number;
  tracks: Track[];
}

export default function TrackHeaders({ tracks }: TrackHeadersProps) {
  const dispatch = useEngineDispatch();
  const labels = assignLabels(tracks);

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
    <div className="w-full">
      {tracks.map((track, index) => {
        const info = labels.get(track.id);
        if (!info) return null;
        const { label, isVideo, isAudio } = info;

        return (
          <div
            key={track.id}
            className={cn(
              "flex items-center justify-between px-2 border-b border-border/30 h-[50px]",
              track.locked && "opacity-50"
            )}
          >
            <span className="text-[10px] font-medium text-muted-foreground">{label}</span>

            <div className="flex items-center gap-0.5">
              {isVideo && (
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
              )}

              {isAudio && (
                <>
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
                  <button
                    onClick={() => toggleMute(track.id, track.muted)}
                    className={cn(
                      "p-0.5 rounded transition-colors",
                      track.muted
                        ? "text-red-400 hover:bg-white/10"
                        : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/5"
                    )}
                    title={track.muted ? "Unmute track" : "Mute track"}
                  >
                    {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}