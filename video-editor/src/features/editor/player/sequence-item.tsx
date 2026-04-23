import React from "react";
import type {
  IAudio,
  ICaption,
  IHillAudioBars,
  IIllustration,
  IImage,
  ITrackItem,
  ILinealAudioBars,
  IProgressBar,
  IProgressFrame,
  IRadialAudioBars,
  IShape,
  IText,
  IVideo,
  IWaveAudioBars
} from "@/features/editor/types";
import {
  Audio,
  Caption,
  HillAudioBars,
  Illustration,
  Image,
  LinealAudioBars,
  ProgressBar,
  ProgressFrame,
  RadialAudioBars,
  Shape,
  Text,
  Video,
  WaveAudioBars
} from "./items";
import { SequenceItemOptions } from "./base-sequence";

export const SequenceItem: Record<string, React.ComponentType<any>> = {
  text: Text,
  caption: Caption,
  shape: Shape,
  video: Video,
  audio: Audio,
  image: Image,
  illustration: Illustration,
  progressBar: ProgressBar,
  linealAudioBars: LinealAudioBars,
  waveAudioBars: WaveAudioBars,
  hillAudioBars: HillAudioBars,
  progressFrame: ProgressFrame,
  radialAudioBars: RadialAudioBars,
};

interface SequenceItemRendererProps {
  item: ITrackItem;
  options: SequenceItemOptions;
}

export const SequenceItemRenderer: React.FC<SequenceItemRendererProps> = ({ item, options }) => {
  const Component = SequenceItem[item.type];
  if (!Component) {
    console.warn("No component found for type:", item.type);
    return null;
  }
  return <Component item={item} options={options} />;
};