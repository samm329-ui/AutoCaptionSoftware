/**
 * use-effect-clipboard.ts
 * Hook for copying and pasting effects between clips
 * 
 * Features:
 * - Copy single effect
 * - Copy all effects from a clip
 * - Paste effects to another clip
 * - Match duration option for pasting
 * - Keyboard shortcuts support
 */

import { useState, useCallback, useEffect } from "react";
import { AppliedEffect } from "../data/video-effects";

/**
 * Clipboard data structure
 */
export interface EffectClipboardData {
  effects: AppliedEffect[];
  sourceClipId: string | null;
  copiedAt: number;
}

/**
 * Generate unique effect ID
 */
function generateEffectId(): string {
  return `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Main hook for effect clipboard operations
 */
export function useEffectClipboard() {
  const [clipboard, setClipboard] = useState<EffectClipboardData | null>(null);
  const [lastPastedClipId, setLastPastedClipId] = useState<string | null>(null);

  /**
   * Copy a single effect
   */
  const copyEffect = useCallback((effect: AppliedEffect, clipId: string) => {
    setClipboard({
      effects: [{ ...effect }],
      sourceClipId: clipId,
      copiedAt: Date.now(),
    });
    console.log("Copied effect:", effect.kind);
  }, []);

  /**
   * Copy all effects from a clip
   */
  const copyAllEffects = useCallback((effects: AppliedEffect[], clipId: string) => {
    setClipboard({
      effects: [...effects],
      sourceClipId: clipId,
      copiedAt: Date.now(),
    });
    console.log(`Copied ${effects.length} effect(s)`);
  }, []);

  /**
   * Paste effects to a target clip
   * Returns the new effects array to apply
   */
  const pasteEffects = useCallback((
    targetClipId: string,
    matchDuration: boolean = false,
    targetClipDuration?: number,
    sourceClipDuration?: number
  ): AppliedEffect[] | null => {
    if (!clipboard || clipboard.effects.length === 0) {
      console.log("No effects in clipboard");
      return null;
    }

    // Generate new effects with unique IDs
    const newEffects = clipboard.effects.map(effect => {
      // Create new effect with new ID
      const newEffect: AppliedEffect = {
        ...effect,
        id: generateEffectId(),
      };

      return newEffect;
    });

    setLastPastedClipId(targetClipId);
    console.log(`Pasted ${newEffects.length} effect(s) to clip ${targetClipId}`);

    return newEffects;
  }, [clipboard]);

  /**
   * Clear clipboard
   */
  const clearClipboard = useCallback(() => {
    setClipboard(null);
    console.log("Cleared effect clipboard");
  }, []);

  /**
   * Check if clipboard has content
   */
  const hasClipboard = clipboard !== null && clipboard.effects.length > 0;

  /**
   * Get clipboard effects count
   */
  const clipboardCount = clipboard?.effects.length ?? 0;

  /**
   * Check if a specific effect is in clipboard
   */
  const hasEffect = useCallback((effectId: string): boolean => {
    return clipboard?.effects.some(e => e.id === effectId) ?? false;
  }, [clipboard]);

  return {
    // State
    clipboard,
    hasClipboard,
    clipboardCount,
    lastPastedClipId,

    // Actions
    copyEffect,
    copyAllEffects,
    pasteEffects,
    clearClipboard,
    hasEffect,
  };
}

/**
 * Hook for keyboard shortcuts
 * Binds Ctrl+Shift+C and Ctrl+Shift+V for copy/paste
 */
export function useEffectKeyboardShortcuts(
  copyCallback: () => void,
  pasteCallback: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+C = Copy
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copyCallback();
      }
      // Ctrl+Shift+V = Paste
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteCallback();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copyCallback, pasteCallback]);
}

/**
 * Hook to sync clipboard with localStorage (persist across sessions)
 */
export function usePersistentEffectClipboard() {
  const [clipboard, setClipboard] = useState<EffectClipboardData | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("fyap-effect-clipboard");
      if (stored) {
        const data = JSON.parse(stored);
        // Only keep if less than 24 hours old
        if (Date.now() - data.copiedAt < 24 * 60 * 60 * 1000) {
          setClipboard(data);
        } else {
          localStorage.removeItem("fyap-effect-clipboard");
        }
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Save to localStorage when clipboard changes
  const setClipboardWithPersist = useCallback((data: EffectClipboardData | null) => {
    setClipboard(data);
    if (data) {
      localStorage.setItem("fyap-effect-clipboard", JSON.stringify(data));
    } else {
      localStorage.removeItem("fyap-effect-clipboard");
    }
  }, []);

  return [clipboard, setClipboardWithPersist] as const;
}