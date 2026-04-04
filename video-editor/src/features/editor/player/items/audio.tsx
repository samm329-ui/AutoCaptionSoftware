import { IAudio } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { Audio as RemotionAudio } from "remotion";

export default function Audio({
  item,
  options
}: {
  item: IAudio;
  options: SequenceItemOptions;
}) {
  const { fps, mutedTrackIds, owningTrackId } = options;
  const { details } = item;
  const playbackRate = item.playbackRate || 1;
  const isTrackMuted = owningTrackId && mutedTrackIds?.has(owningTrackId);
  const effectiveVolume = isTrackMuted ? 0 : (details.volume ?? 100);

  const children = (
    <RemotionAudio
      startFrom={(item.trim?.from! / 1000) * fps}
      endAt={(item.trim?.to! / 1000) * fps || 1 / fps}
      playbackRate={playbackRate}
      src={details.src}
      volume={effectiveVolume / 100}
    />
  );
  return BaseSequence({ item, options, children });
}
