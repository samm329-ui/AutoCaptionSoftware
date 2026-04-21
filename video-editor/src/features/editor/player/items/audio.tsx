import type { IAudio } from "@/features/editor/types";
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
  const playbackRate = ((details as any).playbackRate || 1) as number;
  const isTrackMuted = owningTrackId && mutedTrackIds?.has(owningTrackId);
  const baseVolume = details.volume !== undefined ? Number(details.volume) : 1;
  const effectiveVolume = isTrackMuted ? 0 : baseVolume;

  const children = (
    <RemotionAudio
      startFrom={((item.trim?.from ?? 0) / 1000) * fps}
      endAt={((item.trim?.to ?? 0) / 1000) * fps || 1 / fps}
      playbackRate={playbackRate}
      src={details.src as string}
      volume={effectiveVolume}
    />
  );
  return BaseSequence({ item, options, children });
}
