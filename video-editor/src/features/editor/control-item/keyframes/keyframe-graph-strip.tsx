"use client";

/**
 * Keyframe Graph Strip
 * ────────────────────
 * A miniature keyframe graph shown below properties in Effect Controls.
 * Shows diamonds for each keyframe on a time ruler, supports drag-to-move.
 *
 * Usage:
 *   <KeyframeGraphStrip
 *     clipId={clipId}
 *     property="opacity"
 *     clipFromMs={clip.display?.from}
 *     clipToMs={clip.display?.to}
 *     currentTimeMs={currentTimeMs}
 *   />
 */

import React, { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useKeyframeStore, AnimatableProperty, PROPERTY_RANGES } from "../../store/use-keyframe-store";

interface KeyframeGraphStripProps {
  clipId: string;
  property: AnimatableProperty;
  clipFromMs: number;
  clipToMs: number;
  currentTimeMs: number;
  height?: number;
}

const KeyframeGraphStrip: React.FC<KeyframeGraphStripProps> = ({
  clipId,
  property,
  clipFromMs,
  clipToMs,
  currentTimeMs,
  height = 32,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { getTrack, moveKeyframe, removeKeyframe } = useKeyframeStore();
  const track = getTrack(clipId, property);
  const clipDuration = clipToMs - clipFromMs;

  const timeToX = useCallback(
    (timeMs: number, width: number): number => {
      if (clipDuration === 0) return 0;
      return ((timeMs - clipFromMs) / clipDuration) * width;
    },
    [clipFromMs, clipDuration]
  );

  const valueToY = useCallback(
    (value: number): number => {
      const [min, max] = PROPERTY_RANGES[property];
      const range = max - min;
      if (range === 0) return height / 2;
      const normalized = (value - min) / range;
      // Invert: high value = top
      return height - normalized * (height - 8) - 4;
    },
    [property, height]
  );

  if (!track || track.keyframes.length === 0) {
    return (
      <div
        className="w-full rounded bg-white/5 border border-border/20"
        style={{ height }}
      />
    );
  }

  const sorted = [...track.keyframes].sort((a, b) => a.time - b.time);

  return (
    <div
      className="w-full rounded bg-white/5 border border-border/20 relative overflow-hidden"
      style={{ height }}
    >
      <svg ref={svgRef} width="100%" height={height} className="absolute inset-0">
        {/* Line connecting keyframes */}
        {sorted.length > 1 && (
          <polyline
            points={sorted
              .map((kf) => {
                const x = timeToX(kf.time, 100); // will use % via viewBox
                const y = valueToY(kf.value);
                return `${x}%,${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
          />
        )}

        {/* Keyframe diamonds */}
        {sorted.map((kf) => {
          const xPct = (timeToX(kf.time, 100)).toString() + "%";
          const y = valueToY(kf.value);
          return (
            <g key={kf.id}>
              {/* Invisible wider hit target */}
              <rect
                x={`calc(${xPct} - 8px)`}
                y={y - 8}
                width={16}
                height={16}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onDoubleClick={() => removeKeyframe(clipId, property, kf.id)}
              />
              {/* Diamond */}
              <rect
                x={`calc(${xPct} - 4px)`}
                y={y - 4}
                width={8}
                height={8}
                fill="#eab308"
                transform={`rotate(45, ${xPct.replace("%", "")} ${y})`}
                style={{ transformOrigin: `${xPct} ${y}px`, cursor: "pointer" }}
              />
            </g>
          );
        })}

        {/* Playhead line */}
        {(() => {
          const localTime = currentTimeMs - clipFromMs;
          if (localTime < 0 || localTime > clipDuration) return null;
          const xPct = (localTime / clipDuration) * 100;
          return (
            <line
              x1={`${xPct}%`}
              y1={0}
              x2={`${xPct}%`}
              y2={height}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
          );
        })()}
      </svg>
    </div>
  );
};

export default KeyframeGraphStrip;
