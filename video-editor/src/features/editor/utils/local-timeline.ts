export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const timeMsToUnits = (timeMs: number, tScale: number = 1): number => {
  const FRAME_INTERVAL = 1000 / 60;
  const PREVIEW_FRAME_WIDTH = 4;
  const zoomedFrameWidth = PREVIEW_FRAME_WIDTH * tScale;
  const frames = timeMs * (60 / 1000);
  return frames * zoomedFrameWidth;
};

export const unitsToTimeMs = (units: number, tScale: number = 1): number => {
  const FRAME_INTERVAL = 1000 / 60;
  const PREVIEW_FRAME_WIDTH = 4;
  const zoomedFrameWidth = PREVIEW_FRAME_WIDTH * tScale;
  const frames = units / zoomedFrameWidth;
  return frames * FRAME_INTERVAL;
};