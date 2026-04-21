import type { IVideo } from "@/features/editor/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { calculateContainerStyles, calculateMediaStyles } from "../styles";
import { AbsoluteFill, Video as RemotionVideo } from "remotion";

export const Video = ({
  item,
  options
}: {
  item: IVideo;
  options: SequenceItemOptions;
}) => {
  const { fps, mutedTrackIds, owningTrackId, size: canvasSize } = options;
  const { details } = item;
  const playbackRate = (details as any).playbackRate || 1;
  
  const isTrackMuted = owningTrackId && mutedTrackIds?.has(owningTrackId);
  const baseVolume = details.volume !== undefined ? Number(details.volume) : 1;
  const effectiveVolume = isTrackMuted ? 0 : baseVolume;

  const startFrame = Math.floor(((item.trim?.from ?? 0) / 1000) * fps);
  const endFrame = Math.floor(((item.trim?.to ?? 0) / 1000) * fps);

  const clipOpacity = details.opacity !== undefined ? Number(details.opacity) : 1;
  const clipBlur = details.blur !== undefined ? Number(details.blur) : 0;
  const clipBrightness = details.brightness !== undefined ? Number(details.brightness) : 100;
  const clipContrast = details.contrast !== undefined ? Number(details.contrast) : 100;
  const clipSaturation = details.saturation !== undefined ? Number(details.saturation) : 100;

  const crop = details?.crop || {
    x: 0,
    y: 0,
    width: details.width || canvasSize?.width || 1920,
    height: details.height || canvasSize?.height || 1080
  };

  const filterStyle: React.CSSProperties = {
    opacity: clipOpacity,
    filter: `blur(${clipBlur}px) brightness(${clipBrightness}%) contrast(${clipContrast}%) saturate(${clipSaturation}%)`,
  };

  const containerStyle = calculateContainerStyles(details, crop, {
    ...filterStyle,
    overflow: "hidden",
  }, item.type, canvasSize);

  const mediaStyle = calculateMediaStyles(details, crop, canvasSize);

  const children = (
    <AbsoluteFill style={containerStyle}>
      <div style={mediaStyle}>
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
