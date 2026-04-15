/**
 * engine/time-scale.ts — SHARED TIME CONVERSION UTILITIES
 * 
 * This module provides a single source of truth for all time ↔ pixel conversions
 * used throughout the timeline, ruler, playhead, and player components.
 * 
 * All components use the same conversion helpers to ensure consistent behavior.
 */

export const DEFAULT_FPS = 30;

/**
 * Convert milliseconds to pixels
 * @param ms - Time in milliseconds
 * @param pixelsPerMs - Pixels per millisecond (zoom level)
 */
export const msToPx = (ms: number, pixelsPerMs: number): number => {
  return ms * pixelsPerMs;
};

/**
 * Convert pixels to milliseconds
 * @param px - Position in pixels
 * @param pixelsPerMs - Pixels per millisecond (zoom level)
 */
export const pxToMs = (px: number, pixelsPerMs: number): number => {
  return pixelsPerMs > 0 ? px / pixelsPerMs : 0;
};

/**
 * Convert milliseconds to frame number
 * @param ms - Time in milliseconds
 * @param fps - Frames per second (default: 30)
 */
export const msToFrame = (ms: number, fps: number = DEFAULT_FPS): number => {
  return Math.round((ms / 1000) * fps);
};

/**
 * Convert frame number to milliseconds
 * @param frame - Frame number
 * @param fps - Frames per second (default: 30)
 */
export const frameToMs = (frame: number, fps: number = DEFAULT_FPS): number => {
  return (frame / fps) * 1000;
};

/**
 * Convert pixels to frame number
 * @param px - Position in pixels
 * @param pixelsPerMs - Pixels per millisecond (zoom level)
 * @param fps - Frames per second (default: 30)
 */
export const pxToFrame = (px: number, pixelsPerMs: number, fps: number = DEFAULT_FPS): number => {
  const ms = pxToMs(px, pixelsPerMs);
  return msToFrame(ms, fps);
};

/**
 * Convert frame number to pixels
 * @param frame - Frame number
 * @param pixelsPerMs - Pixels per millisecond (zoom level)
 * @param fps - Frames per second (default: 30)
 */
export const frameToPx = (frame: number, pixelsPerMs: number, fps: number = DEFAULT_FPS): number => {
  const ms = frameToMs(frame, fps);
  return msToPx(ms, pixelsPerMs);
};

/**
 * Calculate pixelsPerMs from zoom level
 * The zoom level represents pixels per second / 1000 = pixels per 100ms
 * For backwards compatibility, we treat zoom as pixels per 100ms
 * 
 * @param zoom - Zoom level (e.g., 0.1 = 100 pixels per second)
 */
export const zoomToPixelsPerMs = (zoom: number): number => {
  // zoom is in the form of "pixels per 100ms" for backwards compatibility
  // convert to pixels per ms: zoom * 100 = pixels per second, / 1000 = pixels per ms
  return zoom / 10;
};

/**
 * Format time for display
 * @param ms - Time in milliseconds
 */
export const msToDisplayTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
};