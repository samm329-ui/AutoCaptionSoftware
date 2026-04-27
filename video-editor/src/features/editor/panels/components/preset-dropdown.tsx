/**
 * preset-dropdown.tsx
 * Dropdown for loading and selecting effect presets
 */

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { ChevronDown, Star, Download, Upload, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePresetStore, EffectPreset } from "../../store/use-preset-store";
import { getEffectDef, AppliedEffect } from "../../data/video-effects";
import { cn } from "@/lib/utils";
import { SavePresetModal } from "./save-preset-modal";

interface PresetDropdownProps {
  effect: AppliedEffect;
  clipId: string;
  onApplyPreset: (params: Record<string, number | string | boolean>) => void;
}

export function PresetDropdown({
  effect,
  clipId,
  onApplyPreset,
}: PresetDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    getPresetsForEffect,
    toggleFavorite,
    isFavorite,
    deletePreset,
    exportPresets,
    importPresets,
  } = usePresetStore();

  const effectDef = getEffectDef(effect.kind);
  const presets = effectDef ? getPresetsForEffect(effect.kind) : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleApplyPreset = useCallback(
    (preset: EffectPreset) => {
      onApplyPreset(preset.params);
      setIsOpen(false);
    },
    [onApplyPreset]
  );

  const handleExport = useCallback(() => {
    const json = exportPresets();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fyap-effect-presets-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  }, [exportPresets]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const result = importPresets(text);

      if (result.success) {
        console.log(`Imported ${result.count} preset(s)`);
      } else {
        console.error("Import errors:", result.errors);
      }
    };
    input.click();
    setIsOpen(false);
  }, [importPresets]);

  if (!effectDef) return null;

  // Group presets by category
  const builtInPresets = presets.filter((p) => p.category === "built-in");
  const customPresets = presets.filter((p) => p.category === "custom");

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-[10px]",
            "hover:bg-white/10 transition-colors",
            "text-muted-foreground hover:text-foreground"
          )}
          title="Load Preset"
        >
          <Download className="w-3 h-3" />
          <ChevronDown className="w-2 h-2" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className={cn(
              "absolute z-50 top-full left-0 w-64",
              "bg-background border border-border rounded-md shadow-lg",
              "animate-in fade-in-0 zoom-in-95 duration-100"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-[10px] font-medium">
                {effectDef.name} Presets
              </span>
              <button
                onClick={() => setShowSaveModal(true)}
                className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus className="w-2.5 h-2.5" />
                Save
              </button>
            </div>

            <ScrollArea className="max-h-[300px]">
              <div className="py-1">
                {/* Built-in Presets */}
                {builtInPresets.length > 0 && (
                  <div className="px-2 py-1">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                      Built-in
                    </span>
                  </div>
                )}
                {builtInPresets.map((preset) => (
                  <PresetItem
                    key={preset.id}
                    preset={preset}
                    isFavorite={isFavorite(preset.id)}
                    onApply={() => handleApplyPreset(preset)}
                    onToggleFavorite={() => toggleFavorite(preset.id)}
                  />
                ))}

                {/* Custom Presets */}
                {customPresets.length > 0 && (
                  <>
                    <div className="px-2 py-1 mt-2">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                        Custom
                      </span>
                    </div>
                    {customPresets.map((preset) => (
                      <PresetItem
                        key={preset.id}
                        preset={preset}
                        isFavorite={isFavorite(preset.id)}
                        onApply={() => handleApplyPreset(preset)}
                        onToggleFavorite={() => toggleFavorite(preset.id)}
                        onDelete={() => deletePreset(preset.id)}
                      />
                    ))}
                  </>
                )}

                {/* Empty State */}
                {presets.length === 0 && (
                  <div className="px-3 py-4 text-center">
                    <p className="text-[10px] text-muted-foreground">
                      No presets available
                    </p>
                    <button
                      onClick={() => setShowSaveModal(true)}
                      className="text-[10px] text-primary hover:text-primary/80 mt-2"
                    >
                      Save current as preset
                    </button>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer - Import/Export */}
            <div className="flex items-center gap-1 px-2 py-2 border-t border-border/50">
              <button
                onClick={handleImport}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10"
              >
                <Upload className="w-2.5 h-2.5" />
                Import
              </button>
              <button
                onClick={handleExport}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10"
              >
                <Upload className="w-2.5 h-2.5 rotate-90" />
                Export
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save Preset Modal */}
      <SavePresetModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        effect={effect}
        clipId={clipId}
      />
    </>
  );
}

/**
 * Individual preset item in the dropdown list
 */
interface PresetItemProps {
  preset: EffectPreset;
  isFavorite: boolean;
  onApply: () => void;
  onToggleFavorite: () => void;
  onDelete?: () => void;
}

function PresetItem({
  preset,
  isFavorite,
  onApply,
  onToggleFavorite,
  onDelete,
}: PresetItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showDeleteConfirm && onDelete) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      // Auto-hide after 2 seconds
      setTimeout(() => setShowDeleteConfirm(false), 2000);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 cursor-pointer",
        "hover:bg-white/5 transition-colors group"
      )}
      onClick={onApply}
    >
      {/* Favorite Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={cn(
          "shrink-0 transition-colors",
          isFavorite ? "text-yellow-400" : "text-muted-foreground opacity-0 group-hover:opacity-100"
        )}
      >
        <Star className="w-3 h-3" fill={isFavorite ? "currentColor" : "none"} />
      </button>

      {/* Preset Name */}
      <span className="flex-1 text-xs truncate">{preset.name}</span>

      {/* Delete Button (custom presets only) */}
      {preset.category === "custom" && onDelete && (
        <button
          onClick={handleDelete}
          className={cn(
            "shrink-0 text-muted-foreground hover:text-red-400 transition-colors",
            showDeleteConfirm ? "text-red-400" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default PresetDropdown;