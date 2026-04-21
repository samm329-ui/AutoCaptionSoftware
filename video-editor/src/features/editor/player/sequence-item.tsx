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

export const SequenceItem: Record<
  string,
  (item: ITrackItem, options: SequenceItemOptions) => React.JSX.Element
> = {
  text: (item, options) => { console.log("SequenceItem: text", item.id); return Text({ item: item as IText, options }); },
  caption: (item, options) => { console.log("SequenceItem: caption", item.id); return Caption({ item: item as ICaption, options }); },
  shape: (item, options) => { console.log("SequenceItem: shape", item.id); return Shape({ item: item as IShape, options }); },
  video: (item, options) => { console.log("SequenceItem: video", item.id, item.details?.scale); return Video({ item: item as IVideo, options }); },
  audio: (item, options) => { console.log("SequenceItem: audio", item.id); return Audio({ item: item as IAudio, options }); },
  image: (item, options) => { console.log("SequenceItem: image", item.id); return Image({ item: item as IImage, options }); },
  illustration: (item, options) => { console.log("SequenceItem: illustration", item.id); return Illustration({ item: item as IIllustration, options }); },
  progressBar: (item, options) => { console.log("SequenceItem: progressBar", item.id); return ProgressBar({ item: item as IProgressBar, options }); },
  linealAudioBars: (item, options) => { console.log("SequenceItem: linealAudioBars", item.id); return LinealAudioBars({ item: item as ILinealAudioBars, options }); },
  waveAudioBars: (item, options) => { console.log("SequenceItem: waveAudioBars", item.id); return WaveAudioBars({ item: item as IWaveAudioBars, options }); },
  hillAudioBars: (item, options) => { console.log("SequenceItem: hillAudioBars", item.id); return HillAudioBars({ item: item as IHillAudioBars, options }); },
  progressFrame: (item, options) => { console.log("SequenceItem: progressFrame", item.id); return ProgressFrame({ item: item as IProgressFrame, options }); },
  radialAudioBars: (item, options) => { console.log("SequenceItem: radialAudioBars", item.id); return RadialAudioBars({ item: item as IRadialAudioBars, options }); },
};
