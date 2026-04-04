"use client";

/**
 * Effect Controls Panel
 * ─────────────────────
 * Shows Motion (Position, Scale, Rotation), Opacity, and any applied effects
 * for the currently selected clip. Supports adding keyframes per-property.
 *
 * Drop this panel anywhere in the editor layout where you want properties to show.
 */

import React, { useState, useCallback, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Diamond,
  Clock,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { ITrackItem } from "@designcombo/types";

import useStore from "../store/use-store";
import {
  useKeyframeStore,
  AnimatableProperty,
  PROPERTY_LABELS,
  PROPERTY_RANGES,
  PROPERTY_DEFAULTS,
} from "../store/use-keyframe-store";
import { getCurrentTime } from "../utils/time";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyRowProps {
  clipId: string;
  property: AnimatableProperty;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  currentTimeMs: number;
  onChange: (v: number) => void;
}

// ─── Property Row ─────────────────────────────────────────────────────────────

const PropertyRow: React.FC<PropertyRowProps> = ({
  clipId,
  property,
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  currentTimeMs,
  onChange,
}) => {
  const { hasKeyframes, addKeyframe, getValue } = useKeyframeStore();
  const isAnimated = hasKeyframes(clipId, property);
  const rawKfValue = isAnimated ? getValue(clipId, property, currentTimeMs) : value;
  const safeKfValue = Number.isFinite(rawKfValue) ? rawKfValue : PROPERTY_DEFAULTS[property] ?? value;

  const [localValue, setLocalValue] = useState(safeKfValue);

  // Sync when value changes
  useEffect(() => {
    setLocalValue(safeKfValue);
  }, [safeKfValue]);

  const handleAddKeyframe = useCallback(() => {
    addKeyframe(clipId, property, currentTimeMs, localValue);
  }, [clipId, property, currentTimeMs, localValue, addKeyframe]);

  const handleReset = useCallback(() => {
    setLocalValue(PROPERTY_DEFAULTS[property]);
    onChange(PROPERTY_DEFAULTS[property]);
  }, [property, onChange]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded group">
      {/* Keyframe diamond button */}
      <button
        onClick={handleAddKeyframe}
        className={cn(
          "w-3.5 h-3.5 flex-none flex items-center justify-center rounded-sm transition-colors",
          isAnimated
            ? "text-yellow-400 hover:text-yellow-300"
            : "text-muted-foreground hover:text-white"
        )}
        title={isAnimated ? "Add keyframe at playhead" : "Enable keyframing"}
      >
        <Diamond className="w-2.5 h-2.5" fill={isAnimated ? "currentColor" : "none"} />
      </button>

      {/* Label */}
      <span className="text-xs text-muted-foreground w-20 flex-none">{label}</span>

      {/* Slider */}
      <div className="flex-1">
        <Slider
          value={[localValue]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => setLocalValue(v)}
          onValueCommit={([v]) => onChange(v)}
          className="h-1"
        />
      </div>

      {/* Numeric input */}
      <Input
        type="number"
        value={Math.round(localValue * 100) / 100}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) {
            setLocalValue(v);
            onChange(v);
          }
        }}
        className="w-14 h-6 px-1.5 text-xs text-center bg-transparent border-border/40"
      />

      {/* Unit */}
      {unit && (
        <span className="text-xs text-muted-foreground w-4">{unit}</span>
      )}

      {/* Reset */}
      <button
        onClick={handleReset}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-white"
        title="Reset to default"
      >
        <RotateCcw className="w-3 h-3" />
      </button>
    </div>
  );
};

// ─── Section ──────────────────────────────────────────────────────────────────

interface EffectSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const EffectSection: React.FC<EffectSectionProps> = ({
  title,
  children,
  defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/40">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-white transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        {title}
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

const EffectControlsPanel: React.FC = () => {
  const { activeIds, trackItemsMap, fps, playerRef } = useStore();

  const clipId = activeIds[0];
  const clip = clipId ? trackItemsMap[clipId] : null;

  const getCurrentTimeMs = useCallback(() => {
    try {
      const frame = playerRef?.current?.getCurrentFrame() ?? 0;
      const safeFps = fps || 30;
      return (frame / safeFps) * 1000;
    } catch {
      return getCurrentTime();
    }
  }, [playerRef, fps]);

  const currentTimeMs = getCurrentTimeMs();

  const dispatchEdit = useCallback(
    (property: string, value: any) => {
      if (!clipId) return;
      const safeValue = Number.isFinite(value) ? value : 0;
      dispatch(EDIT_OBJECT, {
        payload: {
          [clipId]: {
            details: { [property]: safeValue },
          },
        },
      });
    },
    [clipId]
  );

  if (!clip) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2 px-4 text-center">
        <Clock className="w-6 h-6 opacity-40" />
        <p>Select a clip in the timeline to see its properties</p>
      </div>
    );
  }

  const details = clip.details as any ?? {};
  const from = clip.display?.from ?? 0;
  const clipLocalTime = Math.max(0, currentTimeMs - from);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <span className="text-xs font-medium truncate max-w-[160px]" title={clip.name ?? "Clip"}>
          {clip.name ?? "Clip"}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {clip.type?.toUpperCase()}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Motion / Transform */}
        <EffectSection title="Motion" defaultOpen>
          <PropertyRow
            clipId={clipId}
            property="positionX"
            label="Position X"
            value={details.left ?? 0}
            min={-4000} max={4000} step={1} unit="px"
            currentTimeMs={clipLocalTime}
            onChange={(v) => dispatchEdit("left", v)}
          />
          <PropertyRow
            clipId={clipId}
            property="positionY"
            label="Position Y"
            value={details.top ?? 0}
            min={-4000} max={4000} step={1} unit="px"
            currentTimeMs={clipLocalTime}
            onChange={(v) => dispatchEdit("top", v)}
          />
          <PropertyRow
            clipId={clipId}
            property="scale"
            label="Scale"
            value={(details.width && details.naturalWidth)
              ? Math.round((details.width / details.naturalWidth) * 100)
              : 100}
            min={1} max={500} step={1} unit="%"
            currentTimeMs={clipLocalTime}
            onChange={(v) => {
              const w = details.naturalWidth ? (details.naturalWidth * v) / 100 : v;
              const h = details.naturalHeight ? (details.naturalHeight * v) / 100 : v;
              dispatchEdit("width", w);
              dispatchEdit("height", h);
            }}
          />
          <PropertyRow
            clipId={clipId}
            property="rotation"
            label="Rotation"
            value={details.rotate ?? 0}
            min={-360} max={360} step={1} unit="°"
            currentTimeMs={clipLocalTime}
            onChange={(v) => dispatchEdit("rotate", v)}
          />
        </EffectSection>

        {/* Opacity */}
        <EffectSection title="Opacity" defaultOpen>
          <PropertyRow
            clipId={clipId}
            property="opacity"
            label="Opacity"
            value={details.opacity !== undefined ? details.opacity * 100 : 100}
            min={0} max={100} step={1} unit="%"
            currentTimeMs={clipLocalTime}
            onChange={(v) => dispatchEdit("opacity", v / 100)}
          />
        </EffectSection>

        {/* Video-specific effects */}
        {(clip.type === "video" || clip.type === "image") && (
          <EffectSection title="Adjustments" defaultOpen={false}>
            <PropertyRow
              clipId={clipId}
              property="blur"
              label="Blur"
              value={details.blur ?? 0}
              min={0} max={100} step={1}
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("blur", v)}
            />
            <PropertyRow
              clipId={clipId}
              property="brightness"
              label="Brightness"
              value={details.brightness ?? 100}
              min={0} max={200} step={1} unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("brightness", v)}
            />
            <PropertyRow
              clipId={clipId}
              property="contrast"
              label="Contrast"
              value={details.contrast ?? 100}
              min={0} max={200} step={1} unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("contrast", v)}
            />
            <PropertyRow
              clipId={clipId}
              property="saturation"
              label="Saturation"
              value={details.saturation ?? 100}
              min={0} max={200} step={1} unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("saturation", v)}
            />
          </EffectSection>
        )}

        {/* Audio controls */}
        {(clip.type === "video" || clip.type === "audio") && (
          <EffectSection title="Audio" defaultOpen>
            <PropertyRow
              clipId={clipId}
              property="volume"
              label="Volume"
              value={(details.volume ?? 1) * 100}
              min={0} max={200} step={1} unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("volume", v / 100)}
            />
          </EffectSection>
        )}

        {/* Crop */}
        {(clip.type === "video" || clip.type === "image") && (
          <EffectSection title="Crop" defaultOpen={false}>
            <PropertyRow
              clipId={clipId}
              property="cropLeft"
              label="Left"
              value={details.cropLeft ?? 0}
              min={0} max={100} step={1} unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("cropLeft", v)}
            />
            <PropertyRow
              clipId={clipId}
              property="cropRight"
              label="Right"
              value={details.cropRight ?? 0}
              min={0} max={100} step={1} unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("cropRight", v)}
            />
            <PropertyRow
              clipId={clipId}
              property="cropTop"
              label="Top"
              value={details.cropTop ?? 0}
              min={0} max={100} step={1} unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("cropTop", v)}
            />
            <PropertyRow
              clipId={clipId}
              property="cropBottom"
              label="Bottom"
              value={details.cropBottom ?? 0}
              min={0} max={100} step={1} unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("cropBottom", v)}
            />
          </EffectSection>
        )}

        {/* Clip info */}
        <EffectSection title="Clip Info" defaultOpen={false}>
          <div className="px-3 py-2 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Type</span>
              <span className="text-foreground">{clip.type}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration</span>
              <span className="text-foreground">
                {clip.display
                  ? `${((clip.display.to - clip.display.from) / 1000).toFixed(2)}s`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Timeline In</span>
              <span className="text-foreground">
                {clip.display ? `${(clip.display.from / 1000).toFixed(2)}s` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Timeline Out</span>
              <span className="text-foreground">
                {clip.display ? `${(clip.display.to / 1000).toFixed(2)}s` : "—"}
              </span>
            </div>
          </div>
        </EffectSection>
      </div>
    </div>
  );
};

export default EffectControlsPanel;
