import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { RadialBars } from "./audio-bars/radial-audio-bars";

interface IRadialAudioBars {
  id: string;
  type: "radialAudioBars";
  details: Record<string, unknown>;
  display: { from: number; to: number };
  trim: { from: number; to: number };
}

export default function RadialAudioBars({
  item,
  options
}: {
  item: IRadialAudioBars;
  options: SequenceItemOptions;
}) {
  const children = (
    <>
      <RadialBars item={item} options={options} />
    </>
  );

  return BaseSequence({ item, options, children });
}
