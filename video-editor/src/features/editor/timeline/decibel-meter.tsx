"use client";

/**
 * Decibel Meter
 * ─────────────
 * Real-time audio level meter on the right side of the timeline.
 *
 * Source: AudioDataManager → Remotion getAudioData / visualizeAudio (FFT, 512 bins).
 * Computes RMS → decibels → normalized 0–1 fill level. Not random.
 *
 * Rendered as a single continuous gradient bar with a peak-hold line.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { audioDataManager } from "../player/lib/audio-data";
import { getRMS, toDecibel, range, clamp } from "../player/items/audio-bars/audio-utils";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import useStore from "../store/use-store";

const MIN_DB = -60;
const MAX_DB = 0;
const PEAK_HOLD_FRAMES = 30;

export default function DecibelMeter() {
  const { playerRef, fps } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef);
  const [level, setLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const [dBValue, setdBValue] = useState("-∞");
  const peakTimerRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);

    const fft = audioDataManager.getAudioDataForFrame(currentFrame);
    const rms = getRMS(fft);
    const db = rms > 0 ? toDecibel(rms) : -Infinity;
    const normalized = clamp(range(db, MIN_DB, MAX_DB), 0, 1);

    setLevel(normalized);
    setdBValue(rms > 0 ? db.toFixed(1) : "-∞");

    if (normalized >= peakLevel) {
      setPeakLevel(normalized);
      peakTimerRef.current = 0;
    } else {
      peakTimerRef.current++;
      if (peakTimerRef.current > PEAK_HOLD_FRAMES * (fps / 30)) {
        setPeakLevel(normalized);
        peakTimerRef.current = 0;
      }
    }
  }, [currentFrame, fps, peakLevel]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  const fillPercent = level * 100;
  const peakPercent = peakLevel * 100;

  return (
    <div
      className="flex flex-col items-center bg-sidebar border-l-2 border-r border-border h-full w-14 shrink-0 select-none relative shadow-sm"
      style={{ zIndex: 40 }}
    >
      {/* dB readout */}
      <div className="text-[9px] font-mono text-muted-foreground mt-2 mb-1.5 tabular-nums">
        {dBValue}
      </div>

      {/* Continuous bar track */}
      <div
        ref={barRef}
        className="relative w-2 flex-1 rounded-full overflow-hidden bg-white/5 mx-auto"
      >
        {/* Gradient fill — green → yellow → red */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-[height] duration-[50ms] ease-linear"
          style={{
            height: `${fillPercent}%`,
            background:
              "linear-gradient(to top, #22c55e 0%, #22c55e 50%, #eab308 75%, #ef4444 100%)",
          }}
        />

        {/* Peak hold line */}
        <div
          className="absolute left-0 right-0 h-[2px] bg-white/70 transition-[bottom] duration-100"
          style={{ bottom: `${peakPercent}%` }}
        />
      </div>

      {/* Scale labels */}
      <div className="absolute top-8 bottom-2 right-0.5 flex flex-col justify-between pointer-events-none">
        <span className="text-[7px] text-muted-foreground/40">0</span>
        <span className="text-[7px] text-muted-foreground/40">-30</span>
        <span className="text-[7px] text-muted-foreground/40">-60</span>
      </div>
    </div>
  );
}
