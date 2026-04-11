import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { LinealBars } from "./audio-bars/lineal-audio-bars";

interface ILinealAudioBars {
  id: string;
  type: "linealAudioBars";
  details: Record<string, unknown>;
  display: { from: number; to: number };
  trim: { from: number; to: number };
}

export default function LinealAudioBars({
  item,
  options
}: {
  item: ILinealAudioBars;
  options: SequenceItemOptions;
}) {
  const children = (
    <>
      <LinealBars item={item} options={options} />
    </>
  );
  return BaseSequence({ item, options, children });
}
