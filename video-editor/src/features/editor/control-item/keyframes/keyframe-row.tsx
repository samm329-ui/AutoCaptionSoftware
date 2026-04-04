"use client";

/**
 * KeyframeRow
 * ────────────
 * A single animatable property row inside the Effect Controls panel.
 * Shows: property label, current value slider + number input, diamond keyframe button.
 *
 * When keyframe mode is ON for this property:
 *  - Diamond button is filled/gold
 *  - Clicking the value adds a keyframe at current playhead time
 *  - A small timeline mini-strip shows existing keyframes as diamonds
 *
 * Props:
 *   clipId        — the track item ID
 *   property      — AnimatableProperty key (e.g. "opacity", "positionX")
 *   label         — Display name ("Opacity")
 *   value         — Current value (from clip state or keyframe sample)
 *   min/max/step  — Slider bounds
 *   unit          — Display unit ("°", "%", "px")
 *   currentTimeMs — Playhead time relative to clip start (ms)
 *   onChange      — Callback when user changes value directly
 *   clipDurationMs — Total clip duration for the mini keyframe strip
 */

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Diamond, Clock } from "lucide-react";
import {
  useKeyframeStore,
  AnimatableProperty,
} from "../../store/use-keyframe-store";
import {
  addKeyframe,
  removeKeyframe,
  moveKeyframe,
  InterpolationType,
  Keyframe,
} from "../../engine/keyframe-engine";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface KeyframeRowProps {
  clipId: string;
  property: AnimatableProperty;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  currentTimeMs: number;
  clipDurationMs: number;
  onChange: (v: number) => void;
}

// ─── Mini Keyframe Strip ───────────────────────────────────────────────────

const STRIP_W = 80;
const STRIP_H = 16;

function MiniStrip({
  keyframes,
  clipDurationMs,
  currentTimeMs,
  onClickKf,
}: {
  keyframes: Keyframe[];
  clipDurationMs: number;
  currentTimeMs: number;
  onClickKf: (kf: Keyframe) => void;
}) {
  if (clipDurationMs <= 0) return null;

  const toX = (t: number) => (t / clipDurationMs) * STRIP_W;
  const playheadX = toX(currentTimeMs);

  return (
    <svg
      width={STRIP_W}
      height={STRIP_H}
      className="shrink-0 opacity-80"
      style={{ overflow: "visible" }}
    >
      {/* Track line */}
      <line
        x1={0}
        y1={STRIP_H / 2}
        x2={STRIP_W}
        y2={STRIP_H / 2}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={1}
      />
      {/* Playhead */}
      <line
        x1={playheadX}
        y1={0}
        x2={playheadX}
        y2={STRIP_H}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1}
      />
      {/* Keyframe diamonds */}
      {keyframes.map((kf) => {
        const x = toX(kf.time);
        return (
          <polygon
            key={kf.id}
            points={`${x},${STRIP_H / 2 - 4} ${x + 4},${STRIP_H / 2} ${x},${STRIP_H / 2 + 4} ${x - 4},${STRIP_H / 2}`}
            fill="#FBBF24"
            stroke="#92400E"
            strokeWidth={0.5}
            className="cursor-pointer hover:fill-amber-300"
            onClick={() => onClickKf(kf)}
          />
        );
      })}
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function KeyframeRow({
  clipId,
  property,
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  currentTimeMs,
  clipDurationMs,
  onChange,
}: KeyframeRowProps) {
  const { getTrack, addKeyframe: storeAddKeyframe, removeKeyframe: storeRemoveKeyframe } = useKeyframeStore();
  const [localValue, setLocalValue] = useState(value);

  // Sync when parent value changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const kfTrack = getTrack(clipId, property);
  const hasKeyframes = !!kfTrack && kfTrack.keyframes.length > 0;

  // Is there a keyframe at the current time?
  const kfAtCurrent = kfTrack?.keyframes.find(
    (k: Keyframe) => Math.abs(k.time - currentTimeMs) < 16
  );

  const handleAddKeyframe = useCallback(() => {
    storeAddKeyframe(clipId, property, currentTimeMs, localValue, "bezier");
  }, [clipId, property, currentTimeMs, localValue, storeAddKeyframe]);

  const handleRemoveKeyframe = useCallback(
    (kf: Keyframe) => {
      storeRemoveKeyframe(clipId, property, kf.id);
    },
    [clipId, property, storeRemoveKeyframe]
  );

  const handleSliderChange = useCallback(
    (v: number[]) => {
      setLocalValue(v[0]);
    },
    []
  );

  const handleSliderCommit = useCallback(
    (v: number[]) => {
      const val = v[0];
      setLocalValue(val);
      onChange(val);
      // If keyframe mode active, update/add keyframe at current time
      if (hasKeyframes) {
        storeAddKeyframe(clipId, property, currentTimeMs, val, "bezier");
      }
    },
    [onChange, hasKeyframes, clipId, property, currentTimeMs, storeAddKeyframe]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (!Number.isFinite(val)) return;
      const clamped = Math.min(max, Math.max(min, val));
      setLocalValue(clamped);
      onChange(clamped);
      if (hasKeyframes) {
        storeAddKeyframe(clipId, property, currentTimeMs, clamped, "bezier");
      }
    },
    [onChange, hasKeyframes, clipId, property, currentTimeMs, min, max, storeAddKeyframe]
  );

  return (
    <div className="flex items-center gap-2 h-8 group">
      {/* Label */}
      <div className="w-20 shrink-0 text-xs text-muted-foreground truncate">{label}</div>

      {/* Slider */}
      <div className="flex-1 min-w-0">
        <Slider
          value={[localValue]}
          min={min}
          max={max}
          step={step}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
          className="h-3"
        />
      </div>

      {/* Number input */}
      <div className="relative shrink-0">
        <Input
          type="number"
          value={localValue}
          min={min}
          max={max}
          step={step}
          onChange={handleInputChange}
          className="h-6 w-14 px-1.5 text-xs text-center tabular-nums"
        />
        {unit && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
            {unit}
          </span>
        )}
      </div>

      {/* Keyframe diamond button */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={kfAtCurrent ? () => handleRemoveKeyframe(kfAtCurrent) : handleAddKeyframe}
              className={cn(
                "shrink-0 flex items-center justify-center w-5 h-5 rounded-sm transition-all",
                kfAtCurrent
                  ? "text-amber-400 hover:text-amber-300"
                  : "text-muted-foreground/40 hover:text-muted-foreground"
              )}
            >
              <Diamond
                className="w-3 h-3"
                fill={kfAtCurrent ? "currentColor" : "none"}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs z-[300]">
            {kfAtCurrent ? "Remove keyframe at current time" : "Add keyframe at current time"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Mini strip (visible when keyframes exist) */}
      {hasKeyframes && kfTrack && (
        <MiniStrip
          keyframes={kfTrack.keyframes}
          clipDurationMs={clipDurationMs}
          currentTimeMs={currentTimeMs}
          onClickKf={handleRemoveKeyframe}
        />
      )}
    </div>
  );
}
