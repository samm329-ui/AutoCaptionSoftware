import type { IVideo } from "@/features/editor/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { AbsoluteFill, Video as RemotionVideo } from "remotion";

export const Video = ({
  item,
  options
}: {
  item: IVideo;
  options: SequenceItemOptions;
}) => {
  const { fps, mutedTrackIds, owningTrackId } = options;
  const { details } = item;
  const playbackRate = (details as any).playbackRate || 1;
  
  const isTrackMuted = owningTrackId && mutedTrackIds?.has(owningTrackId);
  const baseVolume = (details.volume ?? 100) as number;
  const effectiveVolume = isTrackMuted ? 0 : baseVolume;

  const startFrame = Math.floor(((item.trim?.from ?? 0) / 1000) * fps);
  const endFrame = Math.floor(((item.trim?.to ?? 0) / 1000) * fps);

  const children = (
    <AbsoluteFill>
      <RemotionVideo
        startFrom={startFrame}
        endAt={endFrame || startFrame + 1}
        playbackRate={playbackRate}
        src={details.src as string}
        volume={effectiveVolume / 100}
        crossOrigin="anonymous"
      />
    </AbsoluteFill>
  );

  return BaseSequence({ item, options, children });
};

export default Video;
