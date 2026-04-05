import { nanoid } from "nanoid";

export type MediaKind = "video" | "audio" | "image" | "color";

export interface MediaAsset {
  id: string;
  name: string;
  kind: MediaKind;
  url?: string;
  color?: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
}

async function probeVideo(url: string) {
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Unable to load video metadata."));
  });

  let fps = 30;
  if (video.getVideoPlaybackQuality) {
    const quality = video.getVideoPlaybackQuality();
    if (quality.totalVideoFrames && video.duration) {
      fps = Math.round(quality.totalVideoFrames / video.duration);
    }
  }
  if (!Number.isFinite(fps) || fps < 1) fps = 30;

  return {
    duration: Number.isFinite(video.duration) ? video.duration : 10,
    width: video.videoWidth || 1920,
    height: video.videoHeight || 1080,
    fps,
  };
}

async function probeAudio(url: string) {
  const audio = document.createElement("audio");
  audio.preload = "metadata";
  audio.src = url;
  await new Promise<void>((resolve, reject) => {
    audio.onloadedmetadata = () => resolve();
    audio.onerror = () => reject(new Error("Unable to load audio metadata."));
  });
  return {
    duration: Number.isFinite(audio.duration) ? audio.duration : 10,
    width: 0,
    height: 0,
  };
}

async function probeImage(url: string) {
  const image = new Image();
  image.src = url;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to load image metadata."));
  });
  return {
    duration: 5,
    width: image.naturalWidth || 1920,
    height: image.naturalHeight || 1080,
  };
}

export async function probeMediaFile(file: File): Promise<MediaAsset> {
  const url = URL.createObjectURL(file);
  const kind: MediaKind = file.type.startsWith("audio/")
    ? "audio"
    : file.type.startsWith("image/")
      ? "image"
      : "video";

  const stats =
    kind === "audio"
      ? await probeAudio(url)
      : kind === "image"
        ? await probeImage(url)
        : await probeVideo(url);

  return {
    id: nanoid(),
    name: file.name,
    kind,
    url,
    duration: stats.duration,
    width: stats.width,
    height: stats.height,
    fps: (stats as any).fps ?? 30,
  };
}

export function makeColorAsset(name: string, color: string, duration = 4): MediaAsset {
  return {
    id: nanoid(),
    name,
    kind: "color",
    color,
    duration,
    width: 1920,
    height: 1080,
    fps: 30,
  };
}

export function createColorAsset(name: string, color: string, duration = 4): MediaAsset {
  return makeColorAsset(name, color, duration);
}
