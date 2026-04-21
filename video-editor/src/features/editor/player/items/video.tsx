import type { IVideo } from "@/features/editor/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { calculateMediaStyles } from "../styles";
import { AbsoluteFill, Video as RemotionVideo } from "remotion";
import React, { useRef, useLayoutEffect } from "react";

export const Video = ({
  item,
  options
}: {
  item: IVideo;
  options: SequenceItemOptions;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { fps, mutedTrackIds, owningTrackId, size: canvasSize } = options;
  const details = item.details || {};
  const playbackRate = (details as any).playbackRate || 1;
  
  const isTrackMuted = owningTrackId && mutedTrackIds?.has(owningTrackId);
  let baseVolume = details.volume !== undefined ? Number(details.volume) : 1;
  if (baseVolume > 2) baseVolume = baseVolume / 100;
  const effectiveVolume = isTrackMuted ? 0 : baseVolume;

  const startFrame = Math.floor(((item.trim?.from ?? 0) / 1000) * fps);
  const endFrame = Math.floor(((item.trim?.to ?? 0) / 1000) * fps);

  const crop = details?.crop || {
    x: 0,
    y: 0,
    width: details.width || canvasSize?.width || 1920,
    height: details.height || canvasSize?.height || 1080
  };

  const mediaStyle = calculateMediaStyles(details, crop, canvasSize);

  const rawScale = details?.scale;
  const scaleNum = rawScale !== undefined && rawScale !== null ? parseFloat(String(rawScale)) : 100;
  const scaleValue = isNaN(scaleNum) ? 1 : scaleNum / 100;
  const rotateValue = details?.rotate !== undefined && details?.rotate !== null ? parseFloat(String(details.rotate)) : 0;
  
  // Apply scale and rotate to DOM when they change (synchronous before paint)
  useLayoutEffect(() => {
    const el = containerRef.current;
    console.log("SCALE APPLY:", scaleValue, "el:", !!el);
    if (el) {
      el.style.transform = `scale(${scaleValue}) rotate(${rotateValue}deg)`;
      console.log("SCALE APPLIED:", el.style.transform);
    }
  }, [scaleValue, rotateValue]);
  
  const children = (
    <AbsoluteFill>
      <div 
        ref={containerRef}
        className={`video-scale-container video-${item.id}`}
        style={{ 
          ...mediaStyle, 
          transformOrigin: "center center", 
          overflow: "visible" 
        }}
      >
        <RemotionVideo
          startFrom={startFrame}
          endAt={endFrame || startFrame + 1}
          playbackRate={playbackRate}
          src={details.src as string}
          volume={effectiveVolume}
          crossOrigin="anonymous"
        />
      </div>
    </AbsoluteFill>
  );

  return BaseSequence({ item, options, children });
};

export default Video;