/**
 * save-preset-modal.tsx
 * Modal dialog for saving effect presets
 */

"use client";

import React, { useState, useCallback } from "react";
import { Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePresetStore, EffectPreset } from "../../store/use-preset-store";
import { getEffectDef, AppliedEffect } from "../../data/video-effects";
import { cn } from "@/lib/utils";

interface SavePresetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  effect: AppliedEffect | null;
  clipId: string | null;
}

export function SavePresetModal({
  open,
  onOpenChange,
  effect,
  clipId,
}: SavePresetModalProps) {
  const { savePreset, getPresetsForEffect } = usePresetStore();
  const [presetName, setPresetName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const effectDef = effect ? getEffectDef(effect.kind) : null;
  const existingPresets = effect ? getPresetsForEffect(effect.kind) : [];

  const handleSave = useCallback(() => {
    if (!effect || !clipId || !presetName.trim()) {
      setError("Please enter a preset name");
      return;
    }

    const trimmedName = presetName.trim();

    // Check for duplicate names
    const duplicate = existingPresets.find(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      setError("A preset with this name already exists");
      return;
    }

    // Save the preset (exclude internal params like __muted)
    const cleanParams = { ...effect.params };
    delete (cleanParams as any).__muted;

    const newPreset = savePreset(trimmedName, effect.kind, cleanParams);

    // Reset and close
    setPresetName("");
    setError(null);
    onOpenChange(false);

    console.log("Preset saved:", newPreset);
  }, [effect, clipId, presetName, existingPresets, savePreset, onOpenChange]);

  const handleCancel = useCallback(() => {
    setPresetName("");
    setError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  // Show preview of what will be saved
  const getPreviewText = () => {
    if (!effectDef) return "";
    const params = effect.params || {};
    const previewParts: string[] = [];

    // Show first 3 parameters as preview
    effectDef.controls.slice(0, 3).forEach((ctrl) => {
      const value = params[ctrl.key] ?? ctrl.default;
      previewParts.push(`${ctrl.label}: ${value}`);
    });

    if (effectDef.controls.length > 3) {
      previewParts.push(`+${effectDef.controls.length - 3} more`);
    }

    return previewParts.join(", ");
  };

  if (!effect || !effectDef) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">
            Save Effect Preset
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Save current "{effectDef.name}" settings as a preset for quick
            access later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Preset Name Input */}
          <div className="grid gap-2">
            <Label htmlFor="preset-name" className="text-xs">
              Preset Name
            </Label>
            <Input
              id="preset-name"
              value={presetName}
              onChange={(e) => {
                setPresetName(e.target.value);
                setError(null);
              }}
              placeholder="e.g., My Warm Tone"
              className="text-xs"
              autoFocus
            />
            {error && (
              <p className="text-[10px] text-red-400">{error}</p>
            )}
          </div>

          {/* Preview of settings */}
          <div className="bg-muted/30 rounded-md p-3">
            <p className="text-[10px] text-muted-foreground mb-1">
              Current Settings:
            </p>
            <p className="text-xs">{getPreviewText()}</p>
          </div>

          {/* Info about existing presets */}
          {existingPresets.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {existingPresets.length} existing preset(s) for{" "}
              {effectDef.name}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!presetName.trim()}
            className="text-xs"
          >
            <Save className="w-3 h-3 mr-1" />
            Save Preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SavePresetModal;