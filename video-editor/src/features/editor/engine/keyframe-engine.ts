/**
 * Keyframe Engine
 * Handles keyframe storage, interpolation (Linear, Bezier, Hold), and value sampling.
 * This is the core animation math — all effect parameters animate through this.
 */

export type InterpolationType = "linear" | "bezier" | "hold" | "ease-in" | "ease-out" | "ease-in-out";

export interface KeyframeHandle {
  /** Control handle for bezier, as [dx, dy] offset from keyframe */
  in: [number, number];
  out: [number, number];
}

export interface Keyframe {
  id: string;
  /** Time in milliseconds from clip start */
  time: number;
  value: number;
  interpolation: InterpolationType;
  /** Used for bezier curves */
  handles?: KeyframeHandle;
}

export interface KeyframeTrack {
  property: string;
  keyframes: Keyframe[];
  /** Default value when no keyframes exist */
  defaultValue: number;
}

// ─── Interpolation Math ───────────────────────────────────────────────────────

/** Linear interpolation: constant rate of change */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Evaluate a cubic bezier curve at parameter t (0–1).
 * Points: P0=0, P1=cx1, P2=cx2, P3=1 (normalized x-axis)
 * Returns the y value (the property value).
 */
function cubicBezier(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
  // Find t on curve via Newton-Raphson for the time axis
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(t: number) {
    return ((ax * t + bx) * t + cx) * t;
  }

  function sampleCurveDerivativeX(t: number) {
    return (3 * ax * t + 2 * bx) * t + cx;
  }

  function solveCurveX(x: number) {
    let t2 = x;
    for (let i = 0; i < 8; i++) {
      const x2 = sampleCurveX(t2) - x;
      if (Math.abs(x2) < 1e-6) break;
      const d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-12) break;
      t2 -= x2 / d2;
    }
    return t2;
  }

  const solvedT = solveCurveX(t);
  return ((ay * solvedT + by) * solvedT + cy) * solvedT;
}

/** Standard CSS-style easing presets */
const EASE_PRESETS: Record<string, [number, number, number, number]> = {
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  "linear": [0, 0, 1, 1],
};

// ─── Main Sampling Function ───────────────────────────────────────────────────

/**
 * Given a list of keyframes and a time (ms), return the interpolated value.
 * This is what the renderer calls every frame.
 */
export function sampleKeyframeTrack(track: KeyframeTrack, timeMs: number): number {
  const { keyframes, defaultValue } = track;

  if (!keyframes || keyframes.length === 0) return defaultValue;
  if (keyframes.length === 1) return keyframes[0].value;

  // Sort by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Before first keyframe
  if (timeMs <= sorted[0].time) return sorted[0].value;
  // After last keyframe
  if (timeMs >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  // Find surrounding keyframes
  let k0 = sorted[0];
  let k1 = sorted[1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (timeMs >= sorted[i].time && timeMs <= sorted[i + 1].time) {
      k0 = sorted[i];
      k1 = sorted[i + 1];
      break;
    }
  }

  const segmentDuration = k1.time - k0.time;
  if (segmentDuration === 0) return k0.value;

  const t = (timeMs - k0.time) / segmentDuration; // normalized 0–1

  switch (k0.interpolation) {
    case "hold":
      return k0.value;

    case "linear":
      return lerp(k0.value, k1.value, t);

    case "bezier": {
      // Default smooth bezier handles if not set
      const handles = k0.handles || { in: [0.25, 0], out: [0.75, 1] };
      const y = cubicBezier(t, handles.out[0], handles.out[1], handles.in[0], handles.in[1]);
      return lerp(k0.value, k1.value, y);
    }

    case "ease-in":
    case "ease-out":
    case "ease-in-out": {
      const preset = EASE_PRESETS[k0.interpolation];
      const y = cubicBezier(t, preset[0], preset[1], preset[2], preset[3]);
      return lerp(k0.value, k1.value, y);
    }

    default:
      return lerp(k0.value, k1.value, t);
  }
}

// ─── Keyframe Mutations ───────────────────────────────────────────────────────

export function addKeyframe(track: KeyframeTrack, kf: Omit<Keyframe, "id">): KeyframeTrack {
  const id = crypto.randomUUID();
  const newKf: Keyframe = { id, ...kf };
  const existing = track.keyframes.findIndex((k) => k.time === kf.time);
  if (existing !== -1) {
    // Replace at same time
    const updated = [...track.keyframes];
    updated[existing] = newKf;
    return { ...track, keyframes: updated };
  }
  return {
    ...track,
    keyframes: [...track.keyframes, newKf].sort((a, b) => a.time - b.time),
  };
}

export function removeKeyframe(track: KeyframeTrack, id: string): KeyframeTrack {
  return { ...track, keyframes: track.keyframes.filter((k) => k.id !== id) };
}

export function moveKeyframe(track: KeyframeTrack, id: string, newTime: number): KeyframeTrack {
  return {
    ...track,
    keyframes: track.keyframes
      .map((k) => (k.id === id ? { ...k, time: newTime } : k))
      .sort((a, b) => a.time - b.time),
  };
}

export function updateKeyframeValue(track: KeyframeTrack, id: string, value: number): KeyframeTrack {
  return {
    ...track,
    keyframes: track.keyframes.map((k) => (k.id === id ? { ...k, value } : k)),
  };
}

export function updateKeyframeInterpolation(
  track: KeyframeTrack,
  id: string,
  interpolation: InterpolationType
): KeyframeTrack {
  return {
    ...track,
    keyframes: track.keyframes.map((k) => (k.id === id ? { ...k, interpolation } : k)),
  };
}
