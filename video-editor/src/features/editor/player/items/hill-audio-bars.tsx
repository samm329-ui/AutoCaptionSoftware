import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { HillBars } from "./audio-bars/hill-audio-bars";

interface IHillAudioBars {
  id: string;
  type: "hillAudioBars";
  details: Record<string, unknown>;
  display: { from: number; to: number };
  trim: { from: number; to: number };
}

export default function HillAudioBars({
  item,
  options
}: {
  item: IHillAudioBars;
  options: SequenceItemOptions;
}) {
  const children = (
    <>
      <HillBars item={item} options={options} />
    </>
  );
  return BaseSequence({ item, options, children });
}
