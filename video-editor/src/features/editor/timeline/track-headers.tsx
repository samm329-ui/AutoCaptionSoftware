"use client";

/**
 * TrackHeaders
 * ────────────
 * Renders track labels (V1, V2... / A1, A2...) in the left offset area
 * of the timeline.
 */

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import useStore from "../store/use-store";

const VIDEO_TYPES = new Set(["video", "image", "main", "customTrack", "customTrack2"]);
const AUDIO_TYPES = new Set(["audio", "linealAudioBars", "radialAudioBars", "waveAudioBars", "hillAudioBars"]);

function isVideoTrack(t: any) {
  return VIDEO_TYPES.has(t.type);
}

function isAudioTrack(t: any) {
  return AUDIO_TYPES.has(t.type);
}

function assignLabels(
  tracks: any[]
): Map<string, { label: string; isVideo: boolean; isAudio: boolean }> {
  const labels = new Map<string, { label: string; isVideo: boolean; isAudio: boolean }>();

  const videoTracks = tracks.filter(isVideoTrack);
  const audioTracks = tracks.filter(isAudioTrack);

  for (let i = 0; i < videoTracks.length; i++) {
    const num = videoTracks.length - i;
    labels.set(videoTracks[i].id, {
      label: `V${num}`,
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

  let otherCount = 1;
  for (const t of tracks) {
    if (!labels.has(t.id)) {
      labels.set(t.id, {
        label: `T${otherCount++}`,
        isVideo: false,
        isAudio: false,
      });
    }
  }

  return labels;
}

export default function TrackHeaders({ scrollLeft }: { scrollLeft?: number }) {
  const tracks = useStore().tracks;
  
  const labels = assignLabels(tracks);

  const handleToggleLock = useCallback(
    (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;
      const isLocked = (track as any).locked ?? false;
      useStore.getState().setTracks(
        tracks.map((t) =>
          t.id === trackId ? { ...t, locked: !isLocked } : t
        )
      );
    },
    [tracks]
  );

  const handleToggleMute = useCallback(
    (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;
      const isMuted = (track as any).muted ?? false;
      useStore.getState().setTracks(
        tracks.map((t) =>
          t.id === trackId ? { ...t, muted: !isMuted } : t
        )
      );
    },
    [tracks]
  );

  const handleToggleHide = useCallback(
    (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;
      const isHidden = (track as any).hidden ?? false;
      useStore.getState().setTracks(
        tracks.map((t) =>
          t.id === trackId ? { ...t, hidden: !isHidden } : t
        )
      );
    },
    [tracks]
  );

  return (
    <div
      className="absolute left-0 right-0 bottom-0 pointer-events-none"
      style={{
        top: "50px",
        width: "100%",
      }}
    >
      {tracks.map((track, index) => {
        const labelInfo = labels.get(track.id);
        if (!labelInfo) return null;

        const { label, isVideo, isAudio } = labelInfo;
        const isLocked = (track as any).locked ?? false;
        const isMuted = (track as any).muted ?? false;
        const isHidden = (track as any).hidden ?? false;

        return (
          <div
            key={track.id}
            className={cn(
              "flex items-center justify-between px-1 border-b border-border/30",
              isLocked && "opacity-50"
            )}
            style={{
              height: 40,
              marginTop: index > 0 ? 0 : index * 40,
            }}
          >
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">
                {label}
              </span>
            </div>

            <div className="flex items-center gap-0.5">
              {isVideo && (
                <>
                  <button
                    onClick={() => handleToggleHide(track.id)}
                    className={cn(
                      "p-0.5 rounded transition-colors",
                      isHidden
                        ? "text-red-400 hover:bg-white/10"
                        : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/5"
                    )}
                    title={isHidden ? "Show track" : "Hide track"}
                  >
                    {isHidden ? (
                      <EyeOff className="w-3 h-3" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                  </button>
                </>
              )}

              {isAudio && (
                <>
                  <button
                    onClick={() => handleToggleLock(track.id)}
                    className={cn(
                      "p-0.5 rounded transition-colors",
                      isLocked
                        ? "text-amber-400 hover:bg-white/10"
                        : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/5"
                    )}
                    title={isLocked ? "Unlock track" : "Lock track"}
                  >
                    {isLocked ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <Unlock className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={() => handleToggleMute(track.id)}
                    className={cn(
                      "p-0.5 rounded transition-colors",
                      isMuted
                        ? "text-red-400 hover:bg-white/10"
                        : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/5"
                    )}
                    title={isMuted ? "Unmute track" : "Mute track"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-3 h-3" />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
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