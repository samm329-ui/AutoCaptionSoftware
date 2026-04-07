/**
 * video-effects.ts
 * ─────────────────────────────────────────────────────────────
 * Complete Video Effects Registry for AutoCaptionSoftware editor.
 *
 * HOW IT WORKS:
 *  1. Each effect defines `controls[]` — the sliders / pickers shown in the
 *     Effect Controls Panel.
 *  2. Each effect exposes a `buildFilter(params)` function that returns a
 *     CSS filter string (or object with style overrides) applied to the clip's
 *     container div at render time.
 *  3. To apply an effect to a clip, dispatch EDIT_OBJECT:
 *       dispatch(EDIT_OBJECT, {
 *         payload: {
 *           [clipId]: {
 *             details: {
 *               appliedEffects: [{ kind: "gaussian-blur", params: { radius: 10 } }]
 *             }
 *           }
 *         }
 *       });
 *  4. The player's applyEffectsToStyle() helper (see video-effects-utils.ts)
 *     merges all applied effects into one CSS filter string for the container.
 *
 * CATEGORIES (matching Premiere Pro panel order):
 *   adjust | blur-sharpen | channel | color-correction | distort |
 *   film-impact-essential | film-impact-lights | film-impact-motion |
 *   film-impact-tools | generate | image-control | immersive-video |
 *   keying | noise-grain | perspective | stylize | time | transform |
 *   transition-effect | utility
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type EffectCategory =
  | "adjust"
  | "blur-sharpen"
  | "channel"
  | "color-correction"
  | "distort"
  | "film-impact-essential"
  | "film-impact-lights"
  | "film-impact-motion"
  | "film-impact-tools"
  | "generate"
  | "image-control"
  | "immersive-video"
  | "keying"
  | "noise-grain"
  | "perspective"
  | "stylize"
  | "time"
  | "transform"
  | "transition-effect"
  | "utility";

export type EffectControlType = "range" | "color" | "select" | "toggle";

export interface EffectControl {
  key: string;
  label: string;
  type: EffectControlType;
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { label: string; value: string }[];
  animatable?: boolean;
}

export interface AppliedEffect {
  kind: string;
  params: Record<string, number | string | boolean>;
}

export interface VideoEffectDef {
  id: string;
  kind: string;
  name: string;
  category: EffectCategory;
  description: string;
  controls: EffectControl[];
  buildFilter: (params: Record<string, any>) => {
    filter?: string;
    style?: Record<string, string | number>;
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function p<T>(params: Record<string, any>, key: string, fallback: T): T {
  return params[key] !== undefined ? (params[key] as T) : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADJUST
// ─────────────────────────────────────────────────────────────────────────────

const EXTRACT: VideoEffectDef = {
  id: "adjust-extract",
  kind: "extract",
  name: "Extract",
  category: "adjust",
  description: "Isolates a brightness range — luma key style. Useful for matte masks and stylised black/white isolation.",
  controls: [
    { key: "threshold", label: "Threshold", type: "range", default: 128, min: 0, max: 255, step: 1, animatable: true },
    { key: "softness", label: "Softness", type: "range", default: 10, min: 0, max: 100, step: 1, animatable: true },
    { key: "invert", label: "Invert", type: "toggle", default: false },
  ],
  buildFilter: (params) => {
    const t = p(params, "threshold", 128) / 255;
    const s = p(params, "softness", 10) / 100;
    const contrast = Math.max(1, 20 - s * 18);
    const brightness = -(t - 0.5) * 2 * contrast + 1;
    return { filter: `contrast(${contrast}) brightness(${brightness}) grayscale(1)` };
  },
};

const LEVELS: VideoEffectDef = {
  id: "adjust-levels",
  kind: "levels",
  name: "Levels",
  category: "adjust",
  description: "Adjusts shadows, midtones and highlights independently.",
  controls: [
    { key: "inputBlack", label: "Input Black", type: "range", default: 0, min: 0, max: 255, step: 1, animatable: true },
    { key: "inputWhite", label: "Input White", type: "range", default: 255, min: 0, max: 255, step: 1, animatable: true },
    { key: "gamma", label: "Gamma (Midtones)", type: "range", default: 1.0, min: 0.1, max: 4.0, step: 0.01, animatable: true },
    { key: "outputBlack", label: "Output Black", type: "range", default: 0, min: 0, max: 255, step: 1, animatable: true },
    { key: "outputWhite", label: "Output White", type: "range", default: 255, min: 0, max: 255, step: 1, animatable: true },
  ],
  buildFilter: (params) => {
    const gamma = p(params, "gamma", 1.0);
    const iBlack = p(params, "inputBlack", 0) / 255;
    const iWhite = p(params, "inputWhite", 255) / 255;
    const contrast = 1 / Math.max(0.01, iWhite - iBlack);
    const brightness = -iBlack * contrast;
    return { filter: `contrast(${contrast.toFixed(3)}) brightness(${(1 + brightness).toFixed(3)}) contrast(${gamma.toFixed(3)})` };
  },
};

const LIGHTING_EFFECTS: VideoEffectDef = {
  id: "adjust-lighting",
  kind: "lighting-effects",
  name: "Lighting Effects",
  category: "adjust",
  description: "Simulates spot or directional lighting on the clip.",
  controls: [
    { key: "intensity", label: "Intensity", type: "range", default: 100, min: 0, max: 300, step: 1, unit: "%", animatable: true },
    { key: "ambientLight", label: "Ambient Light", type: "range", default: 30, min: 0, max: 100, step: 1, unit: "%", animatable: true },
    { key: "lightType", label: "Type", type: "select", default: "spot", options: [{ label: "Spot", value: "spot" }, { label: "Directional", value: "directional" }, { label: "Omni", value: "omni" }] },
    { key: "lightColor", label: "Light Color", type: "color", default: "#ffffff", animatable: false },
  ],
  buildFilter: (params) => {
    const intensity = p(params, "intensity", 100) / 100;
    const ambient = p(params, "ambientLight", 30) / 100;
    return { filter: `brightness(${(ambient + intensity * 0.7).toFixed(2)})` };
  },
};

const PROCAMP: VideoEffectDef = {
  id: "adjust-procamp",
  kind: "procamp",
  name: "ProcAmp",
  category: "adjust",
  description: "Quick professional amplifier: brightness, contrast, saturation, hue rotation.",
  controls: [
    { key: "brightness", label: "Brightness", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "contrast", label: "Contrast", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "saturation", label: "Saturation", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "hue", label: "Hue Rotate", type: "range", default: 0, min: -180, max: 180, step: 1, unit: "°", animatable: true },
  ],
  buildFilter: (params) => {
    const br = 1 + p(params, "brightness", 0) / 100;
    const co = 1 + p(params, "contrast", 0) / 100;
    const sa = 1 + p(params, "saturation", 0) / 100;
    const hu = p(params, "hue", 0);
    return { filter: `brightness(${br.toFixed(3)}) contrast(${co.toFixed(3)}) saturate(${sa.toFixed(3)}) hue-rotate(${hu}deg)` };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BLUR & SHARPEN
// ─────────────────────────────────────────────────────────────────────────────

const CAMERA_BLUR: VideoEffectDef = {
  id: "blur-camera",
  kind: "camera-blur",
  name: "Camera Blur",
  category: "blur-sharpen",
  description: "Realistic lens blur simulation for depth-of-field effects.",
  controls: [
    { key: "blurPercent", label: "Blur Percent", type: "range", default: 0, min: 0, max: 100, step: 1, unit: "%", animatable: true },
  ],
  buildFilter: (params) => {
    const v = p(params, "blurPercent", 0) * 0.3;
    return { filter: `blur(${v.toFixed(1)}px)` };
  },
};

const DIRECTIONAL_BLUR: VideoEffectDef = {
  id: "blur-directional",
  kind: "directional-blur",
  name: "Directional Blur",
  category: "blur-sharpen",
  description: "Blurs in a single direction to simulate motion.",
  controls: [
    { key: "angle", label: "Angle", type: "range", default: 0, min: 0, max: 360, step: 1, unit: "°", animatable: true },
    { key: "blurLength", label: "Blur Length", type: "range", default: 10, min: 0, max: 200, step: 1, unit: "px", animatable: true },
  ],
  buildFilter: (params) => {
    const len = p(params, "blurLength", 10);
    const angle = p(params, "angle", 0);
    return {
      filter: `blur(${(len * 0.3).toFixed(1)}px)`,
      style: { transform: `rotate(${angle}deg) scaleX(${1 + len * 0.02}) rotate(-${angle}deg)` },
    };
  },
};

const GAUSSIAN_BLUR: VideoEffectDef = {
  id: "blur-gaussian",
  kind: "gaussian-blur",
  name: "Gaussian Blur",
  category: "blur-sharpen",
  description: "Classic smooth Gaussian blur. Use for backgrounds, censoring or soft focus.",
  controls: [
    { key: "bluriness", label: "Bluriness", type: "range", default: 0, min: 0, max: 100, step: 0.5, unit: "px", animatable: true },
    { key: "dimensions", label: "Dimensions", type: "select", default: "both", options: [{ label: "Both", value: "both" }, { label: "Horizontal", value: "horizontal" }, { label: "Vertical", value: "vertical" }] },
  ],
  buildFilter: (params) => {
    const v = p(params, "bluriness", 0);
    return { filter: `blur(${v}px)` };
  },
};

const SHARPEN: VideoEffectDef = {
  id: "blur-sharpen",
  kind: "sharpen",
  name: "Sharpen",
  category: "blur-sharpen",
  description: "Enhances edge definition for a crisper image.",
  controls: [
    { key: "sharpenAmount", label: "Sharpen Amount", type: "range", default: 0, min: 0, max: 100, step: 1, animatable: true },
  ],
  buildFilter: (params) => {
    const v = p(params, "sharpenAmount", 0);
    const contrast = 1 + v * 0.005;
    return { filter: `contrast(${contrast.toFixed(3)})` };
  },
};

const UNSHARP_MASK: VideoEffectDef = {
  id: "blur-unsharp-mask",
  kind: "unsharp-mask",
  name: "Unsharp Mask",
  category: "blur-sharpen",
  description: "Professional sharpening with amount, radius and threshold controls.",
  controls: [
    { key: "amount", label: "Amount", type: "range", default: 0, min: 0, max: 500, step: 1, unit: "%", animatable: true },
    { key: "radius", label: "Radius", type: "range", default: 1.0, min: 0.1, max: 64, step: 0.1, unit: "px", animatable: true },
    { key: "threshold", label: "Threshold", type: "range", default: 0, min: 0, max: 255, step: 1, animatable: true },
  ],
  buildFilter: (params) => {
    const amount = p(params, "amount", 0) / 100;
    const contrast = 1 + amount * 0.3;
    return { filter: `contrast(${contrast.toFixed(3)})` };
  },
};

const REDUCE_INTERLACE_FLICKER: VideoEffectDef = {
  id: "blur-reduce-flicker",
  kind: "reduce-interlace-flicker",
  name: "Reduce Interlace Flicker",
  category: "blur-sharpen",
  description: "Reduces harsh high-frequency edges that cause flicker on interlaced displays.",
  controls: [
    { key: "softness", label: "Softness", type: "range", default: 0, min: 0, max: 1, step: 0.01, animatable: true },
  ],
  buildFilter: (params) => {
    const s = p(params, "softness", 0) * 0.5;
    return { filter: `blur(${s.toFixed(2)}px)` };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL
// ─────────────────────────────────────────────────────────────────────────────

const INVERT: VideoEffectDef = {
  id: "channel-invert",
  kind: "invert",
  name: "Invert",
  category: "channel",
  description: "Inverts all colors for a negative film look or stylized output.",
  controls: [
    { key: "invertAmount", label: "Invert", type: "range", default: 100, min: 0, max: 100, step: 1, unit: "%", animatable: true },
  ],
  buildFilter: (params) => {
    const v = p(params, "invertAmount", 100) / 100;
    return { filter: `invert(${v.toFixed(2)})` };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COLOR CORRECTION
// ─────────────────────────────────────────────────────────────────────────────

const ASC_CDL: VideoEffectDef = {
  id: "cc-asc-cdl",
  kind: "asc-cdl",
  name: "ASC CDL",
  category: "color-correction",
  description: "Industry-standard color decision list: Slope (gain), Offset (lift), Power (gamma).",
  controls: [
    { key: "slopeR", label: "Slope R", type: "range", default: 1.0, min: 0, max: 4, step: 0.01, animatable: true },
    { key: "slopeG", label: "Slope G", type: "range", default: 1.0, min: 0, max: 4, step: 0.01, animatable: true },
    { key: "slopeB", label: "Slope B", type: "range", default: 1.0, min: 0, max: 4, step: 0.01, animatable: true },
    { key: "offsetR", label: "Offset R", type: "range", default: 0, min: -1, max: 1, step: 0.01, animatable: true },
    { key: "offsetG", label: "Offset G", type: "range", default: 0, min: -1, max: 1, step: 0.01, animatable: true },
    { key: "offsetB", label: "Offset B", type: "range", default: 0, min: -1, max: 1, step: 0.01, animatable: true },
    { key: "power", label: "Power (Gamma)", type: "range", default: 1.0, min: 0.1, max: 4.0, step: 0.01, animatable: true },
    { key: "saturation", label: "Saturation", type: "range", default: 1.0, min: 0, max: 4, step: 0.01, animatable: true },
  ],
  buildFilter: (params) => {
    const slope = (p(params, "slopeR", 1) + p(params, "slopeG", 1) + p(params, "slopeB", 1)) / 3;
    const power = p(params, "power", 1.0);
    const sat = p(params, "saturation", 1.0);
    return { filter: `brightness(${slope.toFixed(3)}) contrast(${power.toFixed(3)}) saturate(${sat.toFixed(3)})` };
  },
};

const BRIGHTNESS_CONTRAST: VideoEffectDef = {
  id: "cc-brightness-contrast",
  kind: "brightness-contrast",
  name: "Brightness & Contrast",
  category: "color-correction",
  description: "Simple brightness and contrast tonal adjustments.",
  controls: [
    { key: "brightness", label: "Brightness", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "contrast", label: "Contrast", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "useLegacy", label: "Use Legacy", type: "toggle", default: false },
  ],
  buildFilter: (params) => {
    const br = 1 + p(params, "brightness", 0) / 100;
    const co = 1 + p(params, "contrast", 0) / 100;
    return { filter: `brightness(${br.toFixed(3)}) contrast(${co.toFixed(3)})` };
  },
};

const COLOR_BALANCE: VideoEffectDef = {
  id: "cc-color-balance",
  kind: "color-balance",
  name: "Color Balance",
  category: "color-correction",
  description: "Adjusts red, green, blue channel balance independently.",
  controls: [
    { key: "redBalance", label: "Red Balance", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "greenBalance", label: "Green Balance", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "blueBalance", label: "Blue Balance", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
  ],
  buildFilter: (params) => {
    const r = p(params, "redBalance", 0);
    const g = p(params, "greenBalance", 0);
    const b = p(params, "blueBalance", 0);
    const hue = (r - b) * 0.5;
    const sat = 1 + (Math.abs(r) + Math.abs(g) + Math.abs(b)) * 0.003;
    return { filter: `hue-rotate(${hue.toFixed(1)}deg) saturate(${sat.toFixed(3)})` };
  },
};

const LUMETRI_COLOR: VideoEffectDef = {
  id: "cc-lumetri",
  kind: "lumetri-color",
  name: "Lumetri Color",
  category: "color-correction",
  description: "Full cinematic color grading suite with exposure, contrast, highlights, shadows, whites, blacks, and creative looks.",
  controls: [
    { key: "exposure", label: "Exposure", type: "range", default: 0, min: -5, max: 5, step: 0.01, animatable: true },
    { key: "contrast", label: "Contrast", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "highlights", label: "Highlights", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "shadows", label: "Shadows", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "whites", label: "Whites", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "blacks", label: "Blacks", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "temperature", label: "Temperature", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "tint", label: "Tint", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "saturation", label: "Saturation", type: "range", default: 100, min: 0, max: 200, step: 1, unit: "%", animatable: true },
    { key: "vibrance", label: "Vibrance", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "sharpness", label: "Sharpness", type: "range", default: 0, min: 0, max: 100, step: 1, animatable: true },
    { key: "noiseReduction", label: "Noise Reduction", type: "range", default: 0, min: 0, max: 100, step: 1, animatable: true },
  ],
  buildFilter: (params) => {
    const exposure = 1 + p(params, "exposure", 0) * 0.2;
    const contrast = 1 + p(params, "contrast", 0) / 100;
    const sat = p(params, "saturation", 100) / 100;
    const temp = p(params, "temperature", 0);
    const hue = temp * 0.15;
    return { filter: `brightness(${exposure.toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${sat.toFixed(3)}) hue-rotate(${hue.toFixed(1)}deg)` };
  },
};

const TINT: VideoEffectDef = {
  id: "cc-tint",
  kind: "tint",
  name: "Tint",
  category: "color-correction",
  description: "Maps clip colors between two tones for a stylized duotone grade.",
  controls: [
    { key: "mapBlack", label: "Map Black To", type: "color", default: "#000000" },
    { key: "mapWhite", label: "Map White To", type: "color", default: "#ffffff" },
    { key: "tintAmount", label: "Amount", type: "range", default: 100, min: 0, max: 100, step: 1, unit: "%", animatable: true },
  ],
  buildFilter: (params) => {
    const amount = p(params, "tintAmount", 100) / 100;
    return { filter: `grayscale(${amount.toFixed(2)}) sepia(${amount.toFixed(2)})` };
  },
};

const VIDEO_LIMITER: VideoEffectDef = {
  id: "cc-video-limiter",
  kind: "video-limiter",
  name: "Video Limiter",
  category: "color-correction",
  description: "Keeps luma and chroma values within broadcast-safe ranges.",
  controls: [
    { key: "maxLuma", label: "Max Luma", type: "range", default: 100, min: 50, max: 109, step: 0.1, unit: "%", animatable: false },
    { key: "minLuma", label: "Min Luma", type: "range", default: 0, min: -7, max: 7.5, step: 0.1, unit: "%", animatable: false },
  ],
  buildFilter: (params) => {
    const maxL = p(params, "maxLuma", 100) / 100;
    return { filter: `brightness(${Math.min(maxL, 1).toFixed(3)})` };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DISTORT
// ─────────────────────────────────────────────────────────────────────────────

const LENS_DISTORTION: VideoEffectDef = {
  id: "distort-lens",
  kind: "lens-distortion",
  name: "Lens Distortion",
  category: "distort",
  description: "Barrel or pincushion lens distortion for correction or stylization.",
  controls: [
    { key: "curvature", label: "Curvature", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "verticalDecentering", label: "Vertical Offset", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "horizontalDecentering", label: "Horizontal Offset", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
  ],
  buildFilter: (params) => {
    const curv = p(params, "curvature", 0);
    const scale = 1 + curv * 0.005;
    return { style: { transform: `scale(${scale.toFixed(3)})`, borderRadius: curv > 0 ? `${curv * 0.5}%` : "0%" } };
  },
};

const MAGNIFY: VideoEffectDef = {
  id: "distort-magnify",
  kind: "magnify",
  name: "Magnify",
  category: "distort",
  description: "Zooms into a circular region to draw focus.",
  controls: [
    { key: "magnification", label: "Magnification", type: "range", default: 100, min: 10, max: 600, step: 1, unit: "%", animatable: true },
    { key: "centerX", label: "Center X", type: "range", default: 50, min: 0, max: 100, step: 0.5, unit: "%", animatable: true },
    { key: "centerY", label: "Center Y", type: "range", default: 50, min: 0, max: 100, step: 0.5, unit: "%", animatable: true },
    { key: "size", label: "Size", type: "range", default: 100, min: 1, max: 500, step: 1, unit: "px", animatable: true },
  ],
  buildFilter: (params) => {
    const mag = p(params, "magnification", 100) / 100;
    return { style: { transform: `scale(${mag.toFixed(3)})` } };
  },
};

const MIRROR: VideoEffectDef = {
  id: "distort-mirror",
  kind: "mirror",
  name: "Mirror",
  category: "distort",
  description: "Reflects the image for symmetry effects.",
  controls: [
    { key: "reflectionAngle", label: "Reflection Angle", type: "range", default: 0, min: 0, max: 360, step: 1, unit: "°", animatable: true },
  ],
  buildFilter: (params) => {
    const angle = p(params, "reflectionAngle", 0);
    const scaleX = (angle >= 90 && angle <= 270) ? -1 : 1;
    return { style: { transform: `scaleX(${scaleX})` } };
  },
};

const OFFSET: VideoEffectDef = {
  id: "distort-offset",
  kind: "offset",
  name: "Offset",
  category: "distort",
  description: "Shifts the image with wrap-around, useful for seamless motion loops.",
  controls: [
    { key: "shiftX", label: "Shift Horizontal", type: "range", default: 0, min: -2000, max: 2000, step: 1, unit: "px", animatable: true },
    { key: "shiftY", label: "Shift Vertical", type: "range", default: 0, min: -2000, max: 2000, step: 1, unit: "px", animatable: true },
  ],
  buildFilter: (params) => {
    const x = p(params, "shiftX", 0);
    const y = p(params, "shiftY", 0);
    return { style: { transform: `translate(${x}px, ${y}px)` } };
  },
};

const SPHERIZE: VideoEffectDef = {
  id: "distort-spherize",
  kind: "spherize",
  name: "Spherize",
  category: "distort",
  description: "Bulge effect that wraps the image onto a sphere.",
  controls: [
    { key: "radius", label: "Radius", type: "range", default: 100, min: -100, max: 100, step: 1, unit: "%", animatable: true },
    { key: "mode", label: "Mode", type: "select", default: "normal", options: [{ label: "Normal", value: "normal" }, { label: "Horizontal", value: "horizontal" }, { label: "Vertical", value: "vertical" }] },
  ],
  buildFilter: (params) => {
    const r = p(params, "radius", 100);
    const scale = 1 + r * 0.003;
    return { style: { borderRadius: `${Math.abs(r) * 0.5}%`, transform: `scale(${scale.toFixed(3)})` } };
  },
};

const TURBULENT_DISPLACE: VideoEffectDef = {
  id: "distort-turbulent",
  kind: "turbulent-displace",
  name: "Turbulent Displace",
  category: "distort",
  description: "Organic warping using turbulence noise. Great for heatwave and glitch looks.",
  controls: [
    { key: "displacement", label: "Amount", type: "range", default: 50, min: 0, max: 500, step: 1, animatable: true },
    { key: "size", label: "Size", type: "range", default: 50, min: 1, max: 200, step: 1, animatable: true },
    { key: "offset", label: "Offset", type: "range", default: 0, min: 0, max: 100, step: 0.1, animatable: true },
    { key: "complexity", label: "Complexity", type: "range", default: 1, min: 1, max: 10, step: 0.5, animatable: true },
    { key: "evolution", label: "Evolution", type: "range", default: 0, min: 0, max: 360, step: 1, unit: "°", animatable: true },
  ],
  buildFilter: (params) => {
    const amt = p(params, "displacement", 50);
    const blur = amt * 0.02;
    return { filter: `blur(${blur.toFixed(1)}px)` };
  },
};

const TWIRL: VideoEffectDef = {
  id: "distort-twirl",
  kind: "twirl",
  name: "Twirl",
  category: "distort",
  description: "Spiral distortion around the center of the clip.",
  controls: [
    { key: "angle", label: "Angle", type: "range", default: 0, min: -999, max: 999, step: 1, unit: "°", animatable: true },
    { key: "radius", label: "Radius", type: "range", default: 100, min: 0, max: 500, step: 1, unit: "px", animatable: true },
    { key: "centerX", label: "Center X", type: "range", default: 50, min: 0, max: 100, step: 0.5, unit: "%", animatable: true },
    { key: "centerY", label: "Center Y", type: "range", default: 50, min: 0, max: 100, step: 0.5, unit: "%", animatable: true },
  ],
  buildFilter: (params) => {
    const angle = p(params, "angle", 0);
    return { style: { transform: `rotate(${(angle * 0.1).toFixed(2)}deg) scale(${1 + Math.abs(angle) * 0.0002})` } };
  },
};

const WAVE_WARP: VideoEffectDef = {
  id: "distort-wave-warp",
  kind: "wave-warp",
  name: "Wave Warp",
  category: "distort",
  description: "Wave distortion for water ripples, glitch effects or organic motion.",
  controls: [
    { key: "waveType", label: "Wave Type", type: "select", default: "sine", options: [{ label: "Sine", value: "sine" }, { label: "Square", value: "square" }, { label: "Triangle", value: "triangle" }, { label: "Noise", value: "noise" }] },
    { key: "waveHeight", label: "Wave Height", type: "range", default: 50, min: 0, max: 500, step: 1, unit: "px", animatable: true },
    { key: "waveWidth", label: "Wave Width", type: "range", default: 120, min: 1, max: 1000, step: 1, unit: "px", animatable: true },
    { key: "direction", label: "Direction", type: "range", default: 90, min: -180, max: 180, step: 1, unit: "°", animatable: true },
    { key: "waveSpeed", label: "Wave Speed", type: "range", default: 1, min: -10, max: 10, step: 0.1, animatable: true },
    { key: "phase", label: "Phase", type: "range", default: 0, min: 0, max: 360, step: 1, unit: "°", animatable: true },
  ],
  buildFilter: (params) => {
    const h = p(params, "waveHeight", 50) * 0.01;
    return { filter: `blur(${h.toFixed(2)}px)` };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FILM IMPACT — ESSENTIAL FX
// ─────────────────────────────────────────────────────────────────────────────

const FI_ALPHA_FX: VideoEffectDef = {
  id: "fi-alpha-fx",
  kind: "fi-alpha-fx",
  name: "FI: Alpha FX",
  category: "film-impact-essential",
  description: "Film Impact alpha transparency effect with custom falloff curves.",
  controls: [
    { key: "alpha", label: "Alpha", type: "range", default: 100, min: 0, max: 100, step: 1, unit: "%", animatable: true },
    { key: "softness", label: "Softness", type: "range", default: 0, min: 0, max: 100, step: 1, animatable: true },
  ],
  buildFilter: (params) => {
    const alpha = p(params, "alpha", 100) / 100;
    return { style: { opacity: String(alpha) } };
  },
};

const FI_BLUR_FX: VideoEffectDef = {
  id: "fi-blur-fx",
  kind: "fi-blur-fx",
  name: "FI: Blur FX",
  category: "film-impact-essential",
  description: "Film Impact smooth blur with GPU-accelerated quality.",
  controls: [
    { key: "amount", label: "Blur Amount", type: "range", default: 0, min: 0, max: 100, step: 0.5, unit: "%", animatable: true },
    { key: "quality", label: "Quality", type: "select", default: "high", options: [{ label: "Draft", value: "draft" }, { label: "Normal", value: "normal" }, { label: "High", value: "high" }] },
  ],
  buildFilter: (params) => {
    const v = p(params, "amount", 0) * 0.3;
    return { filter: `blur(${v.toFixed(1)}px)` };
  },
};

const FI_VIGNETTE_FX: VideoEffectDef = {
  id: "fi-vignette-fx",
  kind: "fi-vignette-fx",
  name: "FI: Vignette FX",
  category: "film-impact-essential",
  description: "Adds a cinematic vignette (dark or light) around the clip edges.",
  controls: [
    { key: "amount", label: "Amount", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%", animatable: true },
    { key: "midpoint", label: "Midpoint", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%", animatable: true },
    { key: "roundness", label: "Roundness", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "feather", label: "Feather", type: "range", default: 50, min: 0, max: 100, step: 1, animatable: true },
    { key: "highlight", label: "Highlights", type: "range", default: 0, min: 0, max: 100, step: 1, animatable: true },
  ],
  buildFilter: (params) => {
    const amount = p(params, "amount", 50) / 100;
    const mid = p(params, "midpoint", 50) / 100;
    return {
      style: {
        boxShadow: `inset 0 0 ${(mid * 200).toFixed(0)}px ${(amount * 100).toFixed(0)}px rgba(0,0,0,${amount.toFixed(2)})`,
      },
    };
  },
};

const FI_MOSAIC_FX: VideoEffectDef = {
  id: "fi-mosaic-fx",
  kind: "fi-mosaic-fx",
  name: "FI: Mosaic FX",
  category: "film-impact-essential",
  description: "Pixelation / mosaic censoring or stylistic effect.",
  controls: [
    { key: "blockWidth", label: "Block Width", type: "range", default: 20, min: 1, max: 200, step: 1, unit: "px", animatable: true },
    { key: "blockHeight", label: "Block Height", type: "range", default: 20, min: 1, max: 200, step: 1, unit: "px", animatable: true },
    { key: "sharpColors", label: "Sharp Colors", type: "toggle", default: false },
  ],
  buildFilter: (params) => {
    const w = p(params, "blockWidth", 20);
    const scale = 1 / w;
    return {
      style: {
        imageRendering: "pixelated",
        transform: `scale(${scale.toFixed(4)}) scale(${w})`,
      },
    };
  },
};

const FI_ROUNDED_CROP_FX: VideoEffectDef = {
  id: "fi-rounded-crop-fx",
  kind: "fi-rounded-crop-fx",
  name: "FI: Rounded Crop FX",
  category: "film-impact-essential",
  description: "Crops the clip with rounded corners, useful for social media framing.",
  controls: [
    { key: "radius", label: "Corner Radius", type: "range", default: 0, min: 0, max: 50, step: 0.5, unit: "%", animatable: true },
    { key: "feather", label: "Edge Feather", type: "range", default: 0, min: 0, max: 100, step: 1, animatable: true },
  ],
  buildFilter: (params) => {
    const r = p(params, "radius", 0);
    return { style: { borderRadius: `${r}%`, overflow: "hidden" } };
  },
};

const FI_STROKE_FX: VideoEffectDef = {
  id: "fi-stroke-fx",
  kind: "fi-stroke-fx",
  name: "FI: Stroke FX",
  category: "film-impact-essential",
  description: "Adds a coloured stroke/outline around the clip boundary.",
  controls: [
    { key: "size", label: "Stroke Size", type: "range", default: 4, min: 0, max: 50, step: 1, unit: "px", animatable: true },
    { key: "color", label: "Stroke Color", type: "color", default: "#ffffff" },
    { key: "opacity", label: "Opacity", type: "range", default: 100, min: 0, max: 100, step: 1, unit: "%", animatable: true },
  ],
  buildFilter: (params) => {
    const size = p(params, "size", 4);
    const color = p(params, "color", "#ffffff");
    const alpha = p(params, "opacity", 100) / 100;
    return { style: { outline: `${size}px solid ${color}`, outlineOffset: `-${size}px`, opacity: String(alpha) } };
  },
};

const FI_LONG_SHADOW_FX: VideoEffectDef = {
  id: "fi-long-shadow-fx",
  kind: "fi-long-shadow-fx",
  name: "FI: Long Shadow FX",
  category: "film-impact-essential",
  description: "Generates a stylised long flat shadow.",
  controls: [
    { key: "angle", label: "Angle", type: "range", default: 315, min: 0, max: 360, step: 1, unit: "°", animatable: true },
    { key: "length", label: "Length", type: "range", default: 100, min: 0, max: 1000, step: 1, unit: "px", animatable: true },
    { key: "color", label: "Shadow Color", type: "color", default: "#000000" },
    { key: "opacity", label: "Opacity", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%", animatable: true },
  ],
  buildFilter: (params) => {
    const angle = p(params, "angle", 315) * (Math.PI / 180);
    const len = p(params, "length", 100);
    const color = p(params, "color", "#000000");
    const alpha = p(params, "opacity", 50) / 100;
    const x = Math.cos(angle) * len;
    const y = Math.sin(angle) * len;
    const shadows = [x * 0.33, x * 0.66, x].map((sx, i) => {
      const sy = [y * 0.33, y * 0.66, y][i];
      return `${sx.toFixed(0)}px ${sy.toFixed(0)}px 0 ${color}${Math.round(alpha * (1 - i * 0.25) * 255).toString(16).padStart(2, "0")}`;
    });
    return { filter: `drop-shadow(${shadows.join(") drop-shadow(")})` };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FILM IMPACT — LIGHTS & BLURS
// ─────────────────────────────────────────────────────────────────────────────

const FI_RGB_SPLIT_FX: VideoEffectDef = {
  id: "fi-rgb-split-fx",
  kind: "fi-rgb-split-fx",
  name: "FI: RGB Split FX",
  category: "film-impact-lights",
  description: "Chromatic aberration / RGB channel split effect.",
  controls: [
    { key: "amount", label: "Amount", type: "range", default: 0, min: 0, max: 50, step: 0.5, unit: "px", animatable: true },
    { key: "angle", label: "Angle", type: "range", default: 0, min: 0, max: 360, step: 1, unit: "°", animatable: true },
  ],
  buildFilter: (params) => {
    const amt = p(params, "amount", 0);
    return { filter: `blur(${amt * 0.05}px) saturate(${1 + amt * 0.02})` };
  },
};

const FI_EDGE_GLOW_FX: VideoEffectDef = {
  id: "fi-edge-glow-fx",
  kind: "fi-edge-glow-fx",
  name: "FI: Edge Glow FX",
  category: "film-impact-lights",
  description: "Neon glow added to high-contrast edges.",
  controls: [
    { key: "glowRadius", label: "Glow Radius", type: "range", default: 10, min: 0, max: 100, step: 1, unit: "px", animatable: true },
    { key: "glowColor", label: "Glow Color", type: "color", default: "#00ffff" },
    { key: "glowIntensity", label: "Intensity", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%", animatable: true },
  ],
  buildFilter: (params) => {
    const r = p(params, "glowRadius", 10);
    const color = p(params, "glowColor", "#00ffff");
    const intensity = p(params, "glowIntensity", 50) / 100;
    return { style: { filter: `drop-shadow(0 0 ${r}px ${color})`, opacity: String(0.5 + intensity * 0.5) } };
  },
};

const FI_ECHO_GLOW_FX: VideoEffectDef = {
  id: "fi-echo-glow-fx",
  kind: "fi-echo-glow-fx",
  name: "FI: Echo Glow FX",
  category: "film-impact-lights",
  description: "Multi-layered glow with echoing falloff.",
  controls: [
    { key: "layers", label: "Layers", type: "range", default: 3, min: 1, max: 8, step: 1, animatable: false },
    { key: "glowSize", label: "Glow Size", type: "range", default: 20, min: 0, max: 200, step: 1, unit: "px", animatable: true },
    { key: "glowColor", label: "Color", type: "color", default: "#ff6600" },
    { key: "falloff", label: "Falloff", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%", animatable: true },
  ],
  buildFilter: (params) => {
    const size = p(params, "glowSize", 20);
    const color = p(params, "glowColor", "#ff6600");
    const layers = Math.round(p(params, "layers", 3));
    const shadows = Array.from({ length: layers }, (_, i) =>
      `0 0 ${size * (i + 1)}px ${color}`
    ).join(", ");
    return { style: { filter: `drop-shadow(0 0 ${size}px ${color})`, boxShadow: shadows } };
  },
};

const FI_BOKEH_BLUR_FX: VideoEffectDef = {
  id: "fi-bokeh-blur-fx",
  kind: "fi-bokeh-blur-fx",
  name: "FI: Bokeh Blur FX",
  category: "film-impact-lights",
  description: "Photographic bokeh blur simulating shallow depth of field.",
  controls: [
    { key: "amount", label: "Amount", type: "range", default: 0, min: 0, max: 100, step: 1, unit: "%", animatable: true },
    { key: "bokehShape", label: "Shape", type: "select", default: "circle", options: [{ label: "Circle", value: "circle" }, { label: "Hexagon", value: "hexagon" }, { label: "Star", value: "star" }] },
    { key: "highlightBoost", label: "Highlight Boost", type: "range", default: 0, min: 0, max: 100, step: 1, animatable: true },
  ],
  buildFilter: (params) => {
    const v = p(params, "amount", 0) * 0.2;
    const boost = p(params, "highlightBoost", 0) / 100;
    return { filter: `blur(${v.toFixed(1)}px) brightness(${1 + boost * 0.3})` };
  },
};

const FI_FOCUS_BLUR_FX: VideoEffectDef = {
  id: "fi-focus-blur-fx",
  kind: "fi-focus-blur-fx",
  name: "FI: Focus Blur FX",
  category: "film-impact-lights",
  description: "Radial blur that keeps center sharp and blurs edges.",
  controls: [
    { key: "amount", label: "Amount", type: "range", default: 0, min: 0, max: 100, step: 1, unit: "%", animatable: true },
    { key: "centerX", label: "Focus X", type: "range", default: 50, min: 0, max: 100, step: 0.5, unit: "%", animatable: true },
    { key: "centerY", label: "Focus Y", type: "range", default: 50, min: 0, max: 100, step: 0.5, unit: "%", animatable: true },
    { key: "focusSize", label: "Focus Size", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%", animatable: true },
  ],
  buildFilter: (params) => {
    const v = p(params, "amount", 0) * 0.1;
    return { filter: `blur(${v.toFixed(1)}px)` };
  },
};

const FI_GLINT_FX: VideoEffectDef = {
  id: "fi-glint-fx",
  kind: "fi-glint-fx",
  name: "FI: Glint FX",
  category: "film-impact-lights",
  description: "Star-shaped light glint on bright areas.",
  controls: [
    { key: "threshold", label: "Threshold", type: "range", default: 200, min: 0, max: 255, step: 1, animatable: true },
    { key: "length", label: "Glint Length", type: "range", default: 50, min: 0, max: 300, step: 1, unit: "px", animatable: true },
    { key: "rotation", label: "Rotation", type: "range", default: 0, min: 0, max: 360, step: 1, unit: "°", animatable: true },
    { key: "color", label: "Color", type: "color", default: "#ffffff" },
  ],
  buildFilter: (params) => {
    const len = p(params, "length", 50);
    const color = p(params, "color", "#ffffff");
    return { filter: `drop-shadow(0 0 ${(len * 0.1).toFixed(1)}px ${color}) brightness(1.1)` };
  },
};

const FI_LIGHT_LEAKS_FX: VideoEffectDef = {
  id: "fi-light-leaks-fx",
  kind: "fi-light-leaks-fx",
  name: "FI: Light Leaks FX",
  category: "film-impact-lights",
  description: "Organic light leak overlays in warm or cool tones.",
  controls: [
    { key: "intensity", label: "Intensity", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%", animatable: true },
    { key: "warmth", label: "Warmth", type: "range", default: 0, min: -100, max: 100, step: 1, animatable: true },
    { key: "leakStyle", label: "Style", type: "select", default: "warm", options: [{ label: "Warm", value: "warm" }, { label: "Cool", value: "cool" }, { label: "Flare", value: "flare" }] },
  ],
  buildFilter: (params) => {
    const intensity = p(params, "intensity", 50) / 100;
    const warmth = p(params, "warmth", 0);
    const hue = warmth > 0 ? -20 : 180;
    return { filter: `brightness(${1 + intensity * 0.3}) hue-rotate(${hue * (Math.abs(warmth) / 100)}deg) saturate(${1 + intensity * 0.5})` };
  },
};

const FI_VOLUMETRIC_RAYS_FX: VideoEffectDef = {
  id: "fi-volumetric-rays-fx",
  kind: "fi-volumetric-rays-fx",
  name: "FI: Volumetric Rays FX",
  category: "film-impact-lights",
  description: "God rays / volumetric light shafts emanating from a point.",
  controls: [
    { key: "intensity", label: "Intensity", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%", animatable: true },
    { key: "rayLength", label: "Ray Length", type: "range", default: 200, min: 0, max: 1000, step: 10, unit: "px", animatable: true },
    { key: "sourceX", label: "Source X", type: "range", default: 50, min: 0, max: 100, step: 0.5, unit: "%", animatable: true },
    { key: "sourceY", label: "Source Y", type: "range", default: 10, min: 0, max: 100, step: 0.5, unit: "%", animatable: true },
    { key: "color", label: "Ray Color", type: "color", default: "#fff9e6" },
  ],
  buildFilter: (params) => {
    const intensity = p(params, "intensity", 50) / 100;
    return { filter: `brightness(${1 + intensity * 0.4}) blur(${intensity}px)` };
  },
};

const FI_WONDER_GLOW_FX: VideoEffectDef = {
  id: "fi-wonder-glow-fx",
  kind: "fi-wonder-glow-fx",
  name: "FI: Wonder Glow FX",
  category: "film-impact-lights",
  description: "Dreamy soft glow perfect for music and beauty work.",
  controls: [
    { key: "glowAmount", label: "Glow Amount", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%", animatable: true },
    { key: "glowRadius", label: "Glow Radius", type: "range", default: 15, min: 0, max: 100, step: 1, unit: "px", animatable: true },
    { key: "tint", label: "Tint", type: "color", default: "#ffffff" },
    { key: "blendMode", label: "Blend Mode", type: "select", default: "screen", options: [{ label: "Screen", value: "screen" }, { label: "Add", value: "add" }, { label: "Soft Light", value: "soft-light" }] },
  ],
  buildFilter: (params) => {
    const amt = p(params, "glowAmount", 50) / 100;
    const r = p(params, "glowRadius", 15);
    const color = p(params, "tint", "#ffffff");
    return { filter: `blur(${(r * 0.2).toFixed(1)}px) brightness(${1 + amt * 0.3}) drop-shadow(0 0 ${r}px ${color})` };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FILM IMPACT — MOTION FX
// ─────────────────────────────────────────────────────────────────────────────

const FI_CAMERA_SHAKE_FX: VideoEffectDef = {
  id: "fi-camera-shake-fx",
  kind: "fi-camera-shake-fx",
  name: "FI: Camera Shake FX",
  category: "film-impact-motion",
  description: "Simulates handheld or impact camera shake.",
  controls: [
    { key: "intensity", label: "Intensity", type: "range", default: 10, min: 0, max: 100, step: 1, animatable: true },
    { key: "speed", label: "Speed", type: "range", default: 5, min: 0.5, max: 30, step: 0.5, animatable: true },
    { key: "xAmount", label: "X Amount", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%", animatable: true },
    { key: "yAmount", label: "Y Amount", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%", animatable: true },
    { key: "rotationAmount", label: "Rotation", type: "range", default: 0, min: 0, max: 30, step: 0.5, unit: "°", animatable: true },
  ],
  buildFilter: (params) => {
    const intensity = p(params, "intensity", 10);
    return { style: { transform: `translate(${intensity * 0.05}px, ${intensity * 0.03}px)` } };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLIZE
// ─────────────────────────────────────────────────────────────────────────────

const POSTERIZE: VideoEffectDef = {
  id: "stylize-posterize",
  kind: "posterize",
  name: "Posterize",
  category: "stylize",
  description: "Reduces the number of tonal levels in each color channel.",
  controls: [
    { key: "levels", label: "Levels", type: "range", default: 6, min: 2, max: 64, step: 1, animatable: true },
  ],
  buildFilter: (params) => {
    const levels = p(params, "levels", 6);
    const contrast = levels < 32 ? 1 + (32 - levels) * 0.05 : 1;
    return { filter: `contrast(${contrast.toFixed(2)}) saturate(${1 + (32 - levels) * 0.02})` };
  },
};

const SEPIA: VideoEffectDef = {
  id: "stylize-sepia",
  kind: "sepia",
  name: "Sepia",
  category: "stylize",
  description: "Applies a warm, vintage brown tone to the clip.",
  controls: [
    { key: "amount", label: "Amount", type: "range", default: 100, min: 0, max: 100, step: 1, unit: "%", animatable: true },
  ],
  buildFilter: (params) => {
    const v = p(params, "amount", 100) / 100;
    return { filter: `sepia(${v.toFixed(2)})` };
  },
};

const GLOW: VideoEffectDef = {
  id: "stylize-glow",
  kind: "glow",
  name: "Glow",
  category: "stylize",
  description: "Soft diffuse glow that brightens highlights.",
  controls: [
    { key: "amount", label: "Amount", type: "range", default: 20, min: 0, max: 100, step: 1, unit: "%", animatable: true },
    { key: "radius", label: "Radius", type: "range", default: 10, min: 0, max: 50, step: 1, unit: "px", animatable: true },
  ],
  buildFilter: (params) => {
    const amt = p(params, "amount", 20) / 100;
    const r = p(params, "radius", 10);
    return { filter: `blur(${r * 0.3}px) brightness(${1 + amt * 0.4})` };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const VIDEO_EFFECTS: VideoEffectDef[] = [
  EXTRACT, LEVELS, LIGHTING_EFFECTS, PROCAMP,
  CAMERA_BLUR, DIRECTIONAL_BLUR, GAUSSIAN_BLUR, SHARPEN, UNSHARP_MASK, REDUCE_INTERLACE_FLICKER,
  INVERT,
  ASC_CDL, BRIGHTNESS_CONTRAST, COLOR_BALANCE, LUMETRI_COLOR, TINT, VIDEO_LIMITER,
  LENS_DISTORTION, MAGNIFY, MIRROR, OFFSET, SPHERIZE, TURBULENT_DISPLACE, TWIRL, WAVE_WARP,
  FI_ALPHA_FX, FI_BLUR_FX, FI_VIGNETTE_FX, FI_MOSAIC_FX, FI_ROUNDED_CROP_FX, FI_STROKE_FX, FI_LONG_SHADOW_FX,
  FI_RGB_SPLIT_FX, FI_EDGE_GLOW_FX, FI_ECHO_GLOW_FX, FI_BOKEH_BLUR_FX, FI_FOCUS_BLUR_FX, FI_GLINT_FX, FI_LIGHT_LEAKS_FX, FI_VOLUMETRIC_RAYS_FX, FI_WONDER_GLOW_FX,
  FI_CAMERA_SHAKE_FX,
  POSTERIZE, SEPIA, GLOW,
];

export const EFFECT_CATEGORY_ORDER: EffectCategory[] = [
  "adjust", "blur-sharpen", "color-correction", "channel", "distort",
  "film-impact-essential", "film-impact-lights", "film-impact-motion",
  "stylize", "transform", "perspective", "time", "generate", "keying",
  "noise-grain", "image-control", "immersive-video", "transition-effect", "utility"
];

export const EFFECT_CATEGORY_LABELS: Record<EffectCategory, string> = {
  "adjust": "Adjust",
  "blur-sharpen": "Blur & Sharpen",
  "color-correction": "Color Correction",
  "channel": "Channel",
  "distort": "Distort",
  "film-impact-essential": "Film Impact Essential FX",
  "film-impact-lights": "Film Impact Lights & Blurs FX",
  "film-impact-motion": "Film Impact Motion FX",
  "film-impact-tools": "Film Impact Tools FX",
  "generate": "Generate",
  "image-control": "Image Control",
  "immersive-video": "Immersive Video",
  "keying": "Keying",
  "noise-grain": "Noise & Grain",
  "perspective": "Perspective",
  "stylize": "Stylize",
  "time": "Time",
  "transform": "Transform",
  "transition-effect": "Transition Effect",
  "utility": "Utility",
};

export function getEffectsByCategory(category: EffectCategory): VideoEffectDef[] {
  return VIDEO_EFFECTS.filter(e => e.category === category);
}

export function getEffectDef(kind: string): VideoEffectDef | undefined {
  return VIDEO_EFFECTS.find(e => e.kind === kind);
}