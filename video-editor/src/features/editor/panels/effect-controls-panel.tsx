"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  Diamond,
  Clock,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  Pause,
  Play,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import useStore from "../store/use-store";
import {
  useKeyframeStore,
  AnimatableProperty,
  PROPERTY_DEFAULTS,
} from "../store/use-keyframe-store";
import { getCurrentTime } from "../utils/time";
import {
  getEffectDef,
  AppliedEffect,
} from "../data/video-effects";
import {
  useEngineSelection,
  useEngineSelector,
  useEngineDispatch,
  type Clip,
} from "../engine/engine-provider";
import { selectFps } from "../engine/selectors";
import { updateTransform } from "../engine/commands";
import { PresetDropdown } from "./components/preset-dropdown";
import { SimpleEffectList } from "./components/effect-reorder-list";
import { AppliedEffectsContextMenu } from "./components/effect-context-menu";
import { useEffectClipboard, useEffectKeyboardShortcuts } from "../hooks/use-effect-clipboard";

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
  const safeKfValue = Number.isFinite(rawKfValue) ? rawKfValue : (PROPERTY_DEFAULTS[property] ?? value);

  const [localValue, setLocalValue] = useState(safeKfValue);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalValue(safeKfValue);
  }, [safeKfValue]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleAddKeyframe = useCallback(() => {
    addKeyframe(clipId, property, currentTimeMs, localValue);
  }, [clipId, property, currentTimeMs, localValue, addKeyframe]);

  const handleReset = useCallback(() => {
    const def = PROPERTY_DEFAULTS[property];
    setLocalValue(def);
    onChange(def);
  }, [property, onChange]);

  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-white/5 rounded group">
      <button
        onClick={handleAddKeyframe}
        className={cn(
          "w-2.5 h-2.5 flex-none flex items-center justify-center rounded-sm transition-colors shrink-0",
          isAnimated
            ? "text-yellow-400 hover:text-yellow-300"
            : "text-muted-foreground hover:text-white"
        )}
        title={isAnimated ? "Add keyframe at playhead" : "Enable keyframing"}
      >
        <Diamond className="w-1.5 h-1.5" fill={isAnimated ? "currentColor" : "none"} />
      </button>

      <span className="text-[10px] text-muted-foreground w-12 flex-none truncate">{label}</span>

      <div className="flex-1 min-w-0">
        <Slider
          value={[localValue]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => {
            setLocalValue(v);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
              onChange(v);
            });
          }}
          className="h-1"
        />
      </div>

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
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
              onChange(v);
            });
          }
        }}
        className="w-10 h-4 px-0.5 text-[10px] text-center bg-transparent border-border/40 shrink-0"
      />

      {unit && <span className="text-[9px] text-muted-foreground w-2 shrink-0">{unit}</span>}

      <button
        onClick={handleReset}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-white shrink-0"
        title="Reset to default"
      >
        <RotateCcw className="w-2 h-2" />
      </button>
    </div>
  );
};

interface AppliedEffectRowProps {
  effect: AppliedEffect;
  clipId: string;
  onRemove: () => void;
  onCopy?: () => void;
  bypassAll?: boolean;
}

const AppliedEffectRow: React.FC<AppliedEffectRowProps> = ({ effect, clipId, onRemove, onCopy, bypassAll }) => {
  const engineDispatch = useEngineDispatch();
  const effectDef = getEffectDef(effect.kind);
  // Use bypassAll prop OR individual effect's __muted state
  const isMuted = bypassAll || (effect.params?.__muted || false);

  const handleParamChange = useCallback(
    (key: string, value: number | string | boolean) => {
      engineDispatch({ 
        type: "UPDATE_EFFECT", 
        payload: { clipId, effectId: effect.id, params: { ...effect.params, [key]: value } } 
      });
    },
    [clipId, effect, engineDispatch]
  );

  const handleToggleMute = useCallback(() => {
    // Don't allow individual toggle when bypassAll is active
    if (bypassAll) return;
    
    const newMuted = !isMuted;
    engineDispatch({ 
      type: "UPDATE_EFFECT", 
      payload: { clipId, effectId: effect.id, params: { ...effect.params, __muted: newMuted } } 
    });
  }, [clipId, effect, isMuted, bypassAll, engineDispatch]);

  const handleApplyPreset = useCallback(
    (params: Record<string, number | string | boolean>) => {
      engineDispatch({
        type: "UPDATE_EFFECT",
        payload: { clipId, effectId: effect.id, params: { ...params } }
      });
    },
    [clipId, effect, engineDispatch]
  );

  if (!effectDef) return null;

  return (
    <div className={cn("px-3 py-2 border-b border-border/20 last:border-b-0", isMuted && "opacity-50")}>
      <div className="flex items-center gap-2 mb-2">
        {/* Bypass Toggle */}
        <button 
          onClick={handleToggleMute} 
          title={isMuted ? "Enable effect" : "Bypass effect (keep but disable)"}
          className={cn(
            "w-6 h-6 flex items-center justify-center rounded transition-colors",
            isMuted 
              ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" 
              : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
          )}
        >
          {isMuted ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
        </button>
        
        {/* Effect Name */}
        <span className="text-xs font-medium flex-1">{effectDef.name}</span>
        
        {/* Copy Button */}
        {onCopy && (
          <button 
            onClick={onCopy} 
            title="Copy effect (Ctrl+Shift+C)" 
            className="text-muted-foreground hover:text-foreground"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
        
        {/* Preset Dropdown */}
        <PresetDropdown 
          effect={effect}
          clipId={clipId}
          onApplyPreset={handleApplyPreset}
        />
        
        {/* Remove Button */}
        <button onClick={onRemove} title="Remove effect" className="text-muted-foreground hover:text-red-400">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {/* Parameter Controls */}
      <div className="space-y-1.5 ml-5">
        {effectDef.controls.map((ctrl) => {
          const value = effect.params?.[ctrl.key] ?? ctrl.default;
          const isDisabled = isMuted;
          
          return (
            <div key={ctrl.key} className={cn("flex items-center gap-2", isDisabled && "opacity-50")}>
              <span className="text-[10px] text-muted-foreground w-16">{ctrl.label}</span>
              {ctrl.type === "range" && (
                <>
                  <Slider
                    value={[typeof value === "number" ? value : Number(value)]}
                    min={ctrl.min ?? 0}
                    max={ctrl.max ?? 100}
                    step={ctrl.step ?? 1}
                    onValueChange={([v]) => !isDisabled && handleParamChange(ctrl.key, v)}
                    disabled={isDisabled}
                    className="flex-1 h-1"
                  />
                  <Input
                    type="number"
                    value={typeof value === "boolean" ? 0 : value}
                    onChange={(e) => !isDisabled && handleParamChange(ctrl.key, parseFloat(e.target.value) || 0)}
                    disabled={isDisabled}
                    className="w-12 h-5 text-[10px]"
                  />
                </>
              )}
              {ctrl.type === "color" && (
                <input
                  type="color"
                  value={String(value)}
                  onChange={(e) => !isDisabled && handleParamChange(ctrl.key, e.target.value)}
                  disabled={isDisabled}
                  className="w-5 h-5 rounded cursor-pointer disabled:opacity-50"
                />
              )}
              {ctrl.type === "select" && ctrl.options && (
                <select
                  value={String(value)}
                  onChange={(e) => !isDisabled && handleParamChange(ctrl.key, e.target.value)}
                  disabled={isDisabled}
                  className="text-[10px] bg-transparent border border-border/40 rounded px-1 disabled:opacity-50"
                >
                  {ctrl.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              {ctrl.type === "toggle" && (
                <button
                  onClick={() => !isDisabled && handleParamChange(ctrl.key, !value)}
                  disabled={isDisabled}
                  className={cn("w-8 h-4 rounded-full transition-colors", value ? "bg-primary" : "bg-muted", isDisabled && "opacity-50")}
                >
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full bg-white transition-transform",
                      value && "translate-x-4"
                    )}
                  />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EffectSection: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/30">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(!open)}
        className="flex items-center gap-1 w-full px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-white transition-colors cursor-pointer"
      >
        {open ? <ChevronDown className="w-2 h-2 shrink-0" /> : <ChevronRight className="w-2 h-2 shrink-0" />}
        <span className="truncate">{title}</span>
      </div>
      {open && <div className="pb-0.5">{children}</div>}
    </div>
  );
};

const EffectControlsPanel: React.FC = () => {
  const { playerRef } = useStore();
  const engineSelection = useEngineSelection();
  const clipId = engineSelection[0] ?? null;
  const engineDispatch = useEngineDispatch();
  const fps = useEngineSelector(selectFps);
  const clip = useEngineSelector<Clip | null>(
    (p) => (clipId ? (p.clips[clipId] ?? null) : null)
  );
  
  // Copy/Paste functionality
  const {
    clipboard,
    hasClipboard,
    clipboardCount,
    copyEffect,
    copyAllEffects,
    pasteEffects,
    clearClipboard,
  } = useEffectClipboard();

  const currentTimeMs = useCallback(() => {
    try {
      const frame = playerRef?.current?.getCurrentFrame() ?? 0;
      return (frame / (fps || 30)) * 1000;
    } catch {
      return getCurrentTime();
    }
  }, [playerRef, fps]);

  const dispatchEdit = useCallback(
    (property: string, value: any) => {
      if (!clipId) return;
      const safeValue = Number.isFinite(value) ? value : 0;
      engineDispatch({
        type: "UPDATE_CLIP",
        payload: {
          clipId,
          details: { [property]: safeValue }
        },
      });
    },
    [clipId, engineDispatch]
  );

  const removeEffect = useCallback(
    (index: number, appliedEffects: AppliedEffect[]) => {
      if (!clipId) return;
      const newEffects = [...appliedEffects];
      newEffects.splice(index, 1);
      engineDispatch({
        type: "UPDATE_CLIP",
        payload: {
          clipId,
          details: { appliedEffects: newEffects }
        },
      });
    },
    [clipId, engineDispatch]
  );

  const currentTimeMsValue = currentTimeMs();
  const details = (clip?.details ?? {}) as Record<string, any>;
  const from = clip?.display?.from ?? 0;
  const clipLocalTime = Math.max(0, currentTimeMsValue - from);
  const appliedEffects: AppliedEffect[] = clip?.appliedEffects || [];

  // Bypass All Effects toggle
  const [bypassAll, setBypassAll] = useState(false);

  // Handle paste effects (defined after appliedEffects)
  const handlePasteEffects = useCallback(() => {
    if (!clipId || !hasClipboard) return;
    const newEffects = pasteEffects(clipId);
    if (newEffects) {
      engineDispatch({
        type: "UPDATE_CLIP",
        payload: {
          clipId,
          details: { appliedEffects: [...appliedEffects, ...newEffects] }
        },
      });
    }
  }, [clipId, hasClipboard, pasteEffects, appliedEffects, engineDispatch]);

  // Handle copy all effects (defined after appliedEffects)
  const handleCopyAllEffects = useCallback(() => {
    if (!clipId || appliedEffects.length === 0) return;
    copyAllEffects(appliedEffects, clipId);
  }, [clipId, appliedEffects, copyAllEffects]);

  // Handle remove all effects
  const handleRemoveAllEffects = useCallback(() => {
    if (!clipId) return;
    engineDispatch({
      type: "UPDATE_CLIP",
      payload: {
        clipId,
        details: { appliedEffects: [] }
      },
    });
  }, [clipId, engineDispatch]);

  // Toggle bypass all effects
  const handleToggleBypassAll = useCallback(() => {
    if (!clipId) return;
    const newBypassState = !bypassAll;
    setBypassAll(newBypassState);
    
    // Update all effects with __muted flag
    const updatedEffects = appliedEffects.map(eff => ({
      ...eff,
      params: { ...eff.params, __muted: newBypassState }
    }));
    
    engineDispatch({
      type: "UPDATE_CLIP",
      payload: {
        clipId,
        details: { appliedEffects: updatedEffects }
      },
    });
  }, [clipId, bypassAll, appliedEffects, engineDispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!clipId) return;
      // Ctrl+Shift+C = Copy all effects
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopyAllEffects();
      }
      // Ctrl+Shift+V = Paste effects
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        handlePasteEffects();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clipId, handleCopyAllEffects, handlePasteEffects]);

  if (!clip) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-[9px] gap-1 px-2 text-center">
        <Clock className="w-4 h-4 opacity-40" />
        <p>Select a clip to see properties</p>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-full overflow-hidden"
      style={{
        color: "lab(69.9939 3.01382 12.8442)",
        fontSize: "10px",
        gap: "2px",
        letterSpacing: "0.2px",
        lineHeight: "12px",
        padding: "0px 4px",
      }}
    >
      <div className="flex items-center justify-between px-1.5 py-1 border-b border-border/40 shrink-0">
        <span
          className="text-[10px] font-medium truncate max-w-[80px]"
          title={clip.name ?? "Clip"}
        >
          {clip.name ?? "Clip"}
        </span>
        <span className="text-[8px] text-muted-foreground shrink-0">{clip.type?.toUpperCase()}</span>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <EffectSection title="Motion" defaultOpen>
          <PropertyRow
            clipId={clipId}
            property="positionX"
            label="Position X"
            value={details.left ?? 0}
            min={-4000}
            max={4000}
            step={1}
            unit="px"
            currentTimeMs={clipLocalTime}
            onChange={(v) => {
              dispatchEdit("left", v);
              engineDispatch(updateTransform(clipId, { x: v }));
            }}
          />
          <PropertyRow
            clipId={clipId}
            property="positionY"
            label="Position Y"
            value={details.top ?? 0}
            min={-4000}
            max={4000}
            step={1}
            unit="px"
            currentTimeMs={clipLocalTime}
            onChange={(v) => {
              dispatchEdit("top", v);
              engineDispatch(updateTransform(clipId, { y: v }));
            }}
          />
          <PropertyRow
            clipId={clipId}
            property="scale"
            label="Scale"
            value={details.scale !== undefined ? Number(details.scale) : 100}
            min={1}
            max={500}
            step={1}
            unit="%"
            currentTimeMs={clipLocalTime}
            onChange={(v) => {
              console.log("SCALE CHANGE:", v);
              const scaleFactor = v / 100;
              engineDispatch(updateTransform(clipId, { scaleX: scaleFactor, scaleY: scaleFactor }));
              dispatchEdit("scale", v);
            }}
          />
          <PropertyRow
            clipId={clipId}
            property="rotation"
            label="Rotation"
            value={details.rotate ?? 0}
            min={-360}
            max={360}
            step={1}
            unit="°"
            currentTimeMs={clipLocalTime}
            onChange={(v) => {
              dispatchEdit("rotate", v);
              engineDispatch(updateTransform(clipId, { rotate: v }));
            }}
          />
        </EffectSection>

        <EffectSection title="Opacity" defaultOpen>
          <PropertyRow
            clipId={clipId}
            property="opacity"
            label="Opacity"
            value={details.opacity !== undefined ? Math.min(100, Math.max(0, Number(details.opacity) * 100)) : 100}
            min={0}
            max={100}
            step={1}
            unit="%"
            currentTimeMs={clipLocalTime}
            onChange={(v) => {
              const normalized = Math.min(1, Math.max(0, v / 100));
              engineDispatch(updateTransform(clipId, { opacity: normalized }));
              dispatchEdit("opacity", normalized);
            }}
          />
        </EffectSection>

        {(clip.type === "video" || clip.type === "image") && (
          <EffectSection title="Adjustments" defaultOpen={false}>
            <PropertyRow
              clipId={clipId}
              property="blur"
              label="Blur"
              value={details.blur ?? 0}
              min={0}
              max={100}
              step={1}
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("blur", v)}
            />
            <PropertyRow
              clipId={clipId}
              property="brightness"
              label="Brightness"
              value={details.brightness ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("brightness", v)}
            />
            <PropertyRow
              clipId={clipId}
              property="contrast"
              label="Contrast"
              value={details.contrast ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("contrast", v)}
            />
            <PropertyRow
              clipId={clipId}
              property="saturation"
              label="Saturation"
              value={details.saturation ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("saturation", v)}
            />
          </EffectSection>
        )}

        {(clip.type === "video" || clip.type === "audio") && (
          <EffectSection title="Audio" defaultOpen>
            <PropertyRow
              clipId={clipId}
              property="volume"
              label="Volume"
              value={Math.min(200, Math.max(0, (details.volume ?? 1) * 100))}
              min={0}
              max={200}
              step={1}
              unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("volume", Math.min(2, Math.max(0, v / 100)))}
            />
          </EffectSection>
        )}

        {(clip.type === "video" || clip.type === "image") && (
          <EffectSection title="Crop" defaultOpen={false}>
            <PropertyRow
              clipId={clipId}
              property="cropLeft"
              label="Left"
              value={details.cropLeft ?? 0}
              min={0}
              max={100}
              step={1}
              unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("cropLeft", v)}
            />
            <PropertyRow
              clipId={clipId}
              property="cropRight"
              label="Right"
              value={details.cropRight ?? 0}
              min={0}
              max={100}
              step={1}
              unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("cropRight", v)}
            />
            <PropertyRow
              clipId={clipId}
              property="cropTop"
              label="Top"
              value={details.cropTop ?? 0}
              min={0}
              max={100}
              step={1}
              unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("cropTop", v)}
            />
            <PropertyRow
              clipId={clipId}
              property="cropBottom"
              label="Bottom"
              value={details.cropBottom ?? 0}
              min={0}
              max={100}
              step={1}
              unit="%"
              currentTimeMs={clipLocalTime}
              onChange={(v) => dispatchEdit("cropBottom", v)}
            />
          </EffectSection>
        )}

        {(clip.type === "video" || clip.type === "image") && (
          <EffectSection 
            title={
              <div className="flex items-center gap-2">
                <span>Applied Effects ({appliedEffects.length})</span>
                {appliedEffects.length > 0 && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleToggleBypassAll}
                    onKeyDown={(e) => e.key === 'Enter' && handleToggleBypassAll()}
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded transition-colors cursor-pointer",
                      bypassAll 
                        ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" 
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    )}
                    title={bypassAll ? "Enable all effects" : "Bypass all effects"}
                  >
                    {bypassAll ? "◉ BYPASSED" : "○ BYPASS"}
                  </div>
                )}
              </div>
            } 
            defaultOpen
          >
            {appliedEffects.length === 0 ? (
              <div className="px-1.5 py-1 text-[8px] text-muted-foreground">
                No effects applied. Drag effects from the Effects tab or use keyboard shortcuts.
                <div className="mt-1 text-[7px] opacity-60">
                  Ctrl+Shift+C = Copy | Ctrl+Shift+V = Paste
                </div>
              </div>
            ) : (
              <AppliedEffectsContextMenu
                effects={appliedEffects}
                hasClipboard={hasClipboard}
                clipboardCount={clipboardCount}
                onCopyAllEffects={handleCopyAllEffects}
                onPasteEffects={handlePasteEffects}
                onRemoveAllEffects={handleRemoveAllEffects}
              >
                <SimpleEffectList
                  effects={appliedEffects}
                  onReorder={(fromIndex, toIndex) => {
                    if (!clipId) return;
                    const newEffects = [...appliedEffects];
                    const [moved] = newEffects.splice(fromIndex, 1);
                    newEffects.splice(toIndex, 0, moved);
                    engineDispatch({
                      type: "UPDATE_CLIP",
                      payload: {
                        clipId,
                        details: { appliedEffects: newEffects }
                      },
                    });
                  }}
                >
                  {(effect, index) => (
                    <AppliedEffectRow
                      key={`${effect.id}-${index}`}
                      effect={effect}
                      clipId={clipId}
                      onRemove={() => removeEffect(index, appliedEffects)}
                      onCopy={() => copyEffect(effect, clipId)}
                      bypassAll={bypassAll}
                    />
                  )}
                </SimpleEffectList>
              </AppliedEffectsContextMenu>
            )}
          </EffectSection>
        )}

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