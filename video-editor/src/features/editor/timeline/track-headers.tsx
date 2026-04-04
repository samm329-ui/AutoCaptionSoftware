"use client";

/**
 * TrackHeaders
 * ────────────
 * Renders track labels (V1, V2... / A1, A2...) in the left offset area
 * of the timeline, aligned with each track's vertical position on the canvas.
 *
 * Premiere Pro layout:
 *   V3  (top)
 *   V2
 *   V1  (just above divider)
 * ──────── divider ────────
 *   A1  (just below divider)
 *   A2
 *   A3  (bottom)
 *
 * Video tracks: Lock + Hide (eye) icons
 * Audio tracks: Lock + Mute (speaker) icons
 *
 * Labels are synced to canvas track positions via requestAnimationFrame polling.
 */

import { useEffect, useRef, useState, useCallback } from "react";
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
import { ITrack } from "@designcombo/types";

const VIDEO_TYPES = new Set(["video", "image", "main", "customTrack", "customTrack2"]);
const AUDIO_TYPES = new Set(["audio", "linealAudioBars", "radialAudioBars", "waveAudioBars", "hillAudioBars"]);

function isVideoTrack(t: ITrack) {
  return VIDEO_TYPES.has(t.type);
}

function isAudioTrack(t: ITrack) {
  return AUDIO_TYPES.has(t.type);
}

/**
 * Assign labels using Premiere Pro convention:
 * - Video tracks counted from divider upward: V1, V2, V3...
 * - Audio tracks counted from divider downward: A1, A2, A3...
 *
 * Since our sorted order is [Vn...V1, A1...An], we count:
 * - Video: from end of video section backward (last in array = V1, nearest divider)
 * - Audio: from start of audio section forward (first in array = A1, nearest divider)
 */
function assignLabels(
  tracks: ITrack[]
): Map<string, { label: string; isVideo: boolean; isAudio: boolean }> {
  const labels = new Map<string, { label: string; isVideo: boolean; isAudio: boolean }>();

  const videoTracks = tracks.filter(isVideoTrack);
  const audioTracks = tracks.filter(isAudioTrack);

  // Video: last in array = V1 (nearest divider), first = Vn (top)
  for (let i = 0; i < videoTracks.length; i++) {
    const num = videoTracks.length - i;
    labels.set(videoTracks[i].id, {
      label: `V${num}`,
      isVideo: true,
      isAudio: false,
    });
  }

  // Audio: first in array = A1 (nearest divider)
  for (let i = 0; i < audioTracks.length; i++) {
    labels.set(audioTracks[i].id, {
      label: `A${i + 1}`,
      isVideo: false,
      isAudio: true,
    });
  }

  // Other tracks
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

interface TrackHeadersProps {
  canvasRef: React.RefObject<any>;
  scrollLeft: number;
}

export default function TrackHeaders({ canvasRef }: TrackHeadersProps) {
  const { tracks, setState } = useStore();
  const [trackPositions, setTrackPositions] = useState<
    Array<{ id: string; top: number; height: number }>
  >([]);
  const animFrameRef = useRef<number | null>(null);

  const syncTrackPositions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const trackObjects = canvas.getObjects("Track");
    const positions = trackObjects
      .map((obj: any) => ({
        id: obj.id,
        top: obj.top,
        height: obj.height,
      }))
      .filter((p) => !isNaN(p.top) && !isNaN(p.height) && p.height > 0);

    setTrackPositions(positions);
    animFrameRef.current = requestAnimationFrame(syncTrackPositions);
  }, [canvasRef]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(syncTrackPositions);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [syncTrackPositions]);

  const labels = assignLabels(tracks);

  const handleToggleLock = useCallback(
    (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;
      const isLocked = (track as any).locked ?? false;
      const canvas = canvasRef.current;
      if (canvas) {
        const trackObj = canvas.getObjects("Track").find((o: any) => o.id === trackId);
        if (trackObj) {
          trackObj.selectable = isLocked;
          trackObj.evented = isLocked;
          canvas.requestRenderAll();
        }
      }
      setState({
        tracks: tracks.map((t) =>
          t.id === trackId ? { ...t, locked: !isLocked } as any : t
        ),
      });
    },
    [tracks, canvasRef, setState]
  );

  const handleToggleMute = useCallback(
    (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;
      const isMuted = (track as any).muted ?? false;
      setState({
        tracks: tracks.map((t) =>
          t.id === trackId ? { ...t, muted: !isMuted } as any : t
        ),
      });
    },
    [tracks, setState]
  );

  const handleToggleHide = useCallback(
    (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;
      const isHidden = (track as any).hidden ?? false;
      const canvas = canvasRef.current;
      if (canvas) {
        const trackObj = canvas.getObjects("Track").find((o: any) => o.id === trackId);
        if (trackObj) {
          trackObj.visible = isHidden;
          const items = canvas.getObjects().filter((o: any) => o.trackId === trackId || o.parentId === trackId);
          items.forEach((item: any) => {
            item.visible = isHidden;
          });
          canvas.requestRenderAll();
        }
      }
      setState({
        tracks: tracks.map((t) =>
          t.id === trackId ? { ...t, hidden: !isHidden } as any : t
        ),
      });
    },
    [tracks, canvasRef, setState]
  );

  const canvasTop = canvasRef.current
    ? (canvasRef.current.viewportTransform?.[5] ?? 0)
    : 0;

  return (
    <div
      className="absolute left-0 right-0 bottom-0 pointer-events-none"
      style={{
        top: "50px",
        width: "100%",
      }}
    >
      {trackPositions.map(({ id, top, height }) => {
        const labelInfo = labels.get(id);
        if (!labelInfo) return null;

        const { label, isVideo, isAudio } = labelInfo;
        const track = tracks.find((t) => t.id === id);
        if (!track) return null;

        const isLocked = (track as any).locked ?? false;
        const isMuted = (track as any).muted ?? false;
        const isHidden = (track as any).hidden ?? false;
        const visualTop = top + canvasTop;

        if (isNaN(visualTop) || visualTop < -height || visualTop > 5000) return null;

        return (
          <div
            key={id}
            className="absolute left-0 right-0 flex items-center gap-0.5 px-1 pointer-events-auto"
            style={{
              top: visualTop,
              height,
            }}
          >
            <span
              className={cn(
                "text-[10px] font-mono font-bold w-6 text-center shrink-0 select-none",
                isVideo && "text-blue-400",
                isAudio && "text-purple-400",
                !isVideo && !isAudio && "text-muted-foreground"
              )}
            >
              {label}
            </span>

            <div className="flex items-center gap-0.5 ml-auto">
              {isVideo && (
                <>
                  <button
                    onClick={() => handleToggleLock(id)}
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
                    onClick={() => handleToggleHide(id)}
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
                    onClick={() => handleToggleLock(id)}
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
                    onClick={() => handleToggleMute(id)}
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

      <TrackSeparator canvasRef={canvasRef} />
    </div>
  );
}

function TrackSeparator({ canvasRef }: { canvasRef: React.RefObject<any> }) {
  const [separatorTop, setSeparatorTop] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const check = () => {
      const trackObjects = canvas.getObjects("Track");
      const allTracks = useStore.getState().tracks;

      let lastVideoBottom: number | null = null;
      let firstAudioTop: number | null = null;
      const canvasTop = canvas.viewportTransform?.[5] ?? 0;

      for (const trackObj of trackObjects) {
        const track = allTracks.find((t) => t.id === trackObj.id);
        if (!track) continue;

        const visualTop = trackObj.top + canvasTop;

        if (isVideoTrack(track)) {
          lastVideoBottom = visualTop + trackObj.height;
        } else if (isAudioTrack(track) && firstAudioTop === null) {
          firstAudioTop = visualTop;
        }
      }

      if (
        lastVideoBottom !== null &&
        firstAudioTop !== null &&
        !isNaN(lastVideoBottom) &&
        !isNaN(firstAudioTop)
      ) {
        setSeparatorTop((lastVideoBottom + firstAudioTop) / 2);
      } else {
        setSeparatorTop(null);
      }

      requestAnimationFrame(check);
    };

    const id = requestAnimationFrame(check);
    return () => cancelAnimationFrame(id);
  }, [canvasRef]);

  if (separatorTop === null) return null;

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none"
      style={{
        top: separatorTop,
        height: 2,
        background:
          "linear-gradient(to right, transparent, rgba(255,255,255,0.12) 5%, rgba(255,255,255,0.12) 95%, transparent)",
      }}
    />
  );
}
