export interface ITrackItem {
  id: string;
  type: string;
  name?: string;
  display: { from: number; to: number };
  trim: { from: number; to: number };
  details: Record<string, unknown>;
  transform?: {
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotate?: number;
    opacity?: number;
    flipX?: boolean;
    flipY?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface IVideo extends ITrackItem {
  type: "video";
}

export interface IImage extends ITrackItem {
  type: "image";
}

export interface IAudio extends ITrackItem {
  type: "audio";
}

export interface IText extends ITrackItem {
  type: "text";
}

export interface ICaption extends ITrackItem {
  type: "caption";
}

export interface IShape extends ITrackItem {
  type: "shape";
}

export interface IProgressBar extends ITrackItem {
  type: "progressBar";
}

export interface IProgressFrame extends ITrackItem {
  type: "progressFrame";
}

export interface ILinealAudioBars extends ITrackItem {
  type: "linealAudioBars";
}

export interface IRadialAudioBars extends ITrackItem {
  type: "radialAudioBars";
}

export interface IWaveAudioBars extends ITrackItem {
  type: "waveAudioBars";
}

export interface IHillAudioBars extends ITrackItem {
  type: "hillAudioBars";
}

export interface IIllustration extends ITrackItem {
  type: "illustration";
}

export interface ITransition {
  id: string;
  toId: string;
  fromId: string;
  type: "transition";
  kind: string;
  duration: number;
  direction?: string;
}

export interface ITrack {
  id: string;
  type: string;
  name?: string;
  order: number;
  locked: boolean;
  muted: boolean;
  hidden: boolean;
  items: string[];
}

export interface ISize {
  width: number;
  height: number;
}

export interface ITimelineScaleState {
  index: number;
  unit: number;
  zoom: number;
  segments: number;
}

export interface IDisplay {
  from: number;
  to: number;
}

export interface ITrim {
  from: number;
  to: number;
}

export interface IMetadata {
  author?: string;
  sourceUrl?: string;
  parentId?: string;
  previewUrl?: string;
  pexels_id?: number;
  avg_color?: string;
  original_url?: string;
  user?: {
    id: number;
    name: string;
    url: string;
  };
  video_files?: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    fps: number;
    link: string;
  }>;
  video_pictures?: Array<{
    id: number;
    picture: string;
    nr: number;
  }>;
}

export interface ITrackItemBase {
  display: IDisplay;
  trim: ITrim;
  details: Record<string, unknown>;
}

export interface IDesign {
  id: string;
  size: ISize;
  fps: number;
  tracks: ITrack[];
  trackItems: ITrackItem[];
}

export interface ICompositionAnimationComp {
  property: string;
  from: number;
  to: number;
  durationInFrames: number;
  easing: string;
}

export interface ICompositionAnimation {
  name: string;
  composition: ICompositionAnimationComp[];
}

export interface IBasicAnimation {
  name: string;
  composition: ICompositionAnimationComp[];
}

export interface ITrackItemsMap {
  [key: string]: ITrackItem;
}
