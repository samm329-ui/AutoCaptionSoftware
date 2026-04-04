export const calculateFrames = (
  display: { from: number; to: number },
  fps: number
) => {
  const safeFps = fps || 30;
  const safeFrom = display?.from ?? 0;
  const safeTo = display?.to ?? safeFrom + 1000;
  const from = (safeFrom / 1000) * safeFps;
  const durationInFrames = Math.max(1, (safeTo / 1000) * safeFps - from);
  return { from: Number.isFinite(from) ? from : 0, durationInFrames: Number.isFinite(durationInFrames) ? durationInFrames : 1 };
};
