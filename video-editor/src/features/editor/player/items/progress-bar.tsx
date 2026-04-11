import type { IProgressBar } from "@/features/editor/types";
import { calculateFrames } from "../../utils/frames";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";

export default function ProgressBar({
  item,
  options
}: {
  item: IProgressBar;
  options: SequenceItemOptions;
}) {
  const { fps, frame } = options;
  const { details } = item;
  const playbackRate = ((details as any).playbackRate || 1) as number;
  const { from, durationInFrames } = calculateFrames(
    {
      from: (item.display.from / 1000) / playbackRate,
      to: (item.display.to / 1000) / playbackRate
    },
    fps
  );
  let progress: number;
  if ((details as any).inverted) {
    const relativeFrame = Math.max((frame || 0) - from, 0);
    progress = 100 - Math.min((relativeFrame / durationInFrames) * 100, 100);
  } else {
    const relativeFrame = Math.max((frame || 0) - from, 0);
    progress = Math.min((relativeFrame / durationInFrames) * 100, 100);
  }

  const children = (
    <>
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor:
            ((details as any).backgroundColors?.[0]) || "rgba(128, 128, 128,0.5)"
        }}
      />
      <div
        style={{
          position: "absolute",
          width: `${progress}%`,
          height: "100%",
          backgroundColor:
            ((details as any).backgroundColors?.[1]) || "rgba(128, 128, 128,1)"
        }}
      />
    </>
  );

  return BaseSequence({ item, options, children });
}
