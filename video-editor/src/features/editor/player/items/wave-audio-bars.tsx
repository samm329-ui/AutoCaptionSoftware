import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { WaveBars } from "./audio-bars/wave-audio-bars";

interface IWaveAudioBars {
  id: string;
  type: "waveAudioBars";
  details: Record<string, unknown>;
  display: { from: number; to: number };
  trim: { from: number; to: number };
}

export default function WaveAudioBars({
  item,
  options
}: {
  item: IWaveAudioBars;
  options: SequenceItemOptions;
}) {
  const children = (
    <>
      <WaveBars item={item} options={options} />
    </>
  );
  return BaseSequence({ item, options, children });
}
