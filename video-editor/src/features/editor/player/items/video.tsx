import type { IVideo } from "@/features/editor/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { calculateFrames } from "../../utils/frames";
import { OffthreadVideo, AbsoluteFill } from "remotion";

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

  const children = (
    <AbsoluteFill>
      <OffthreadVideo
        startFrom={((item.trim?.from ?? 0) / 1000) * fps}
        endAt={(item.trim?.to ?? 0) / 1000 * fps || 1 / fps}
        playbackRate={playbackRate}
        src={details.src as string}
        volume={effectiveVolume / 100}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </AbsoluteFill>
  );

  return BaseSequence({ item, options, children });
};

export default Video;
