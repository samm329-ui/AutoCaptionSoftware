import type { IVideo } from "@/features/editor/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { calculateContainerStyles, calculateMediaStyles } from "../styles";
import { calculateFrames } from "../../utils/frames";
import { OffthreadVideo } from "remotion";

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
  
  const crop = details?.crop || {
    x: 0,
    y: 0,
    width: details.width,
    height: details.height
  };
  const { durationInFrames } = calculateFrames(item.display, fps);

  const isTrackMuted = owningTrackId && mutedTrackIds?.has(owningTrackId);
  const baseVolume = (details.volume ?? 100) as number;
  const effectiveVolume = isTrackMuted ? 0 : baseVolume;

  const children = (
    <div
      style={calculateContainerStyles(details, crop, {
        overflow: "hidden"
      })}
    >
      <div style={calculateMediaStyles(details, crop)}>
        <OffthreadVideo
          startFrom={((item.trim?.from ?? 0) / 1000) * fps}
          endAt={(item.trim?.to ?? 0) / 1000 * fps || 1 / fps}
          playbackRate={playbackRate}
          src={details.src as string}
          volume={effectiveVolume / 100}
        />
      </div>
    </div>
  );

  return BaseSequence({ item, options, children });
};

export default Video;
