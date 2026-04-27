/**
 * use-preset-store.ts
 * Effect Preset Management System
 * 
 * Features:
 * - Save custom presets to localStorage
 * - Load/apply presets
 * - Built-in default presets
 * - JSON export/import
 * - Preset categorization (favorites, recent)
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { getEffectDef, VideoEffectDef } from "../data/video-effects";

/**
 * Effect Preset Interface
 * Represents a saved effect configuration
 */
export interface EffectPreset {
  id: string;
  name: string;
  effectKind: string;
  category: "custom" | "built-in" | "favorites";
  params: Record<string, number | string | boolean>;
  createdAt: number;
  isFavorite?: boolean;
}

/**
 * JSON Export Format
 */
export interface PresetExportData {
  version: string;
  exportedAt: string;
  presets: EffectPreset[];
}

/**
 * Storage Keys
 */
const STORAGE_KEY = "fyap-effect-presets";
const FAVORITES_KEY = "fyap-favorite-presets";
const RECENT_KEY = "fyap-recent-presets";

/**
 * Built-in Default Presets
 * Professional effect combinations for quick access
 */
export const DEFAULT_PRESETS: EffectPreset[] = [
  // Lumetri Color Presets
  {
    id: "builtin-warm-sunset",
    name: "Warm Sunset",
    effectKind: "lumetri-color",
    category: "built-in",
    params: {
      temperature: 20,
      tint: 10,
      saturation: 110,
      contrast: 0,
      highlights: 5,
      shadows: 0,
    },
    createdAt: 0,
  },
  {
    id: "builtin-cool-night",
    name: "Cool Night",
    effectKind: "lumetri-color",
    category: "built-in",
    params: {
      temperature: -20,
      tint: -15,
      saturation: 90,
      contrast: 10,
      highlights: -5,
      shadows: 10,
    },
    createdAt: 0,
  },
  {
    id: "builtin-cinematic",
    name: "Cinematic",
    effectKind: "lumetri-color",
    category: "built-in",
    params: {
      temperature: -5,
      tint: 0,
      saturation: 85,
      contrast: 25,
      highlights: 10,
      shadows: -15,
    },
    createdAt: 0,
  },
  {
    id: "builtin-faded-look",
    name: "Faded Look",
    effectKind: "lumetri-color",
    category: "built-in",
    params: {
      temperature: 5,
      tint: 0,
      saturation: 80,
      contrast: -10,
      highlights: 0,
      shadows: 5,
    },
    createdAt: 0,
  },
  {
    id: "builtin-orange-teal",
    name: "Orange & Teal",
    effectKind: "lumetri-color",
    category: "built-in",
    params: {
      temperature: 10,
      tint: -5,
      saturation: 120,
      contrast: 15,
      highlights: 15,
      shadows: -10,
    },
    createdAt: 0,
  },

  // Brightness/Contrast Presets
  {
    id: "builtin-high-contrast",
    name: "High Contrast",
    effectKind: "brightness-contrast",
    category: "built-in",
    params: {
      brightness: 15,
      contrast: 25,
      useLegacy: false,
    },
    createdAt: 0,
  },
  {
    id: "builtin-subtle-brighten",
    name: "Subtle Brighten",
    effectKind: "brightness-contrast",
    category: "built-in",
    params: {
      brightness: 10,
      contrast: 5,
      useLegacy: false,
    },
    createdAt: 0,
  },
  {
    id: "builtin-dramatic-dark",
    name: "Dramatic Dark",
    effectKind: "brightness-contrast",
    category: "built-in",
    params: {
      brightness: -15,
      contrast: 20,
      useLegacy: false,
    },
    createdAt: 0,
  },

  // Gaussian Blur Presets
  {
    id: "builtin-soft-focus",
    name: "Soft Focus",
    effectKind: "gaussian-blur",
    category: "built-in",
    params: {
      bluriness: 3,
      dimensions: "both",
    },
    createdAt: 0,
  },
  {
    id: "builtin-dreamy",
    name: "Dreamy",
    effectKind: "gaussian-blur",
    category: "built-in",
    params: {
      bluriness: 5,
      dimensions: "both",
    },
    createdAt: 0,
  },
  {
    id: "builtin-blur-background",
    name: "Blur Background",
    effectKind: "gaussian-blur",
    category: "built-in",
    params: {
      bluriness: 8,
      dimensions: "both",
    },
    createdAt: 0,
  },

  // Sepia Presets
  {
    id: "builtin-vintage",
    name: "Vintage",
    effectKind: "sepia",
    category: "built-in",
    params: {
      amount: 30,
    },
    createdAt: 0,
  },
  {
    id: "builtin-sepia-light",
    name: "Light Sepia",
    effectKind: "sepia",
    category: "built-in",
    params: {
      amount: 15,
    },
    createdAt: 0,
  },

  // ProcAmp Presets
  {
    id: "builtin-vibrant",
    name: "Vibrant",
    effectKind: "procamp",
    category: "built-in",
    params: {
      brightness: 5,
      contrast: 15,
      saturation: 25,
      hue: 0,
    },
    createdAt: 0,
  },
  {
    id: "builtin-muted",
    name: "Muted",
    effectKind: "procamp",
    category: "built-in",
    params: {
      brightness: -5,
      contrast: -10,
      saturation: -20,
      hue: 0,
    },
    createdAt: 0,
  },

  // Vignette Presets
  {
    id: "builtin-vignette-subtle",
    name: "Subtle Vignette",
    effectKind: "fi-vignette-fx",
    category: "built-in",
    params: {
      amount: 30,
      midpoint: 50,
      roundness: 0,
      feather: 50,
      highlight: 0,
    },
    createdAt: 0,
  },
  {
    id: "builtin-vignette-strong",
    name: "Strong Vignette",
    effectKind: "fi-vignette-fx",
    category: "built-in",
    params: {
      amount: 70,
      midpoint: 40,
      roundness: 0,
      feather: 40,
      highlight: 0,
    },
    createdAt: 0,
  },

  // Color Balance Presets
  {
    id: "builtin-warm-highlight",
    name: "Warm Highlights",
    effectKind: "color-balance",
    category: "built-in",
    params: {
      redBalance: 10,
      greenBalance: 5,
      blueBalance: -5,
    },
    createdAt: 0,
  },
  {
    id: "builtin-cool-shadows",
    name: "Cool Shadows",
    effectKind: "color-balance",
    category: "built-in",
    params: {
      redBalance: -10,
      greenBalance: 0,
      blueBalance: 15,
    },
    createdAt: 0,
  },
];

/**
 * Get default presets for a specific effect kind
 */
export function getDefaultPresetsForEffect(effectKind: string): EffectPreset[] {
  return DEFAULT_PRESETS.filter((p) => p.effectKind === effectKind);
}

/**
 * Generate unique preset ID
 */
function generatePresetId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Main Preset Store Hook
 */
export function usePresetStore() {
  // Load presets from localStorage on mount
  const [customPresets, setCustomPresets] = useState<EffectPreset[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Favorites (subset of presets marked as favorite)
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Recent presets (last 10 used)
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage when state changes
  useEffect(() => {
    if (typeof window !== "undefined" && customPresets.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
    }
  }, [customPresets]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
    }
  }, [favoriteIds]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recentIds));
    }
  }, [recentIds]);

  /**
   * Save a new preset
   */
  const savePreset = useCallback(
    (name: string, effectKind: string, params: Record<string, number | string | boolean>): EffectPreset => {
      const newPreset: EffectPreset = {
        id: generatePresetId(),
        name,
        effectKind,
        category: "custom",
        params,
        createdAt: Date.now(),
      };

      setCustomPresets((prev) => [...prev, newPreset]);
      return newPreset;
    },
    []
  );

  /**
   * Update an existing preset
   */
  const updatePreset = useCallback((id: string, updates: Partial<EffectPreset>) => {
    setCustomPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  /**
   * Delete a preset
   */
  const deletePreset = useCallback((id: string) => {
    setCustomPresets((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      // Also remove from favorites and recent
      setFavoriteIds((favs) => favs.filter((fid) => fid !== id));
      setRecentIds((recent) => recent.filter((rid) => rid !== id));
      return filtered;
    });
  }, []);

  /**
   * Toggle favorite status
   */
  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((fid) => fid !== id);
      }
      return [...prev, id];
    });
  }, []);

  /**
   * Add to recent list
   */
  const addToRecent = useCallback(
    (id: string) => {
      setRecentIds((prev) => {
        // Remove if already exists (to move to front)
        const filtered = prev.filter((rid) => rid !== id);
        // Add to front
        filtered.unshift(id);
        // Keep only last 10
        return filtered.slice(0, 10);
      });
    },
    []
  );

  /**
   * Get preset by ID
   */
  const getPresetById = useCallback(
    (id: string): EffectPreset | undefined => {
      // Check custom presets first
      const custom = customPresets.find((p) => p.id === id);
      if (custom) return custom;

      // Check default presets
      const builtIn = DEFAULT_PRESETS.find((p) => p.id === id);
      return builtIn;
    },
    [customPresets]
  );

  /**
   * Get presets by effect kind
   */
  const getPresetsForEffect = useCallback(
    (effectKind: string): EffectPreset[] => {
      const custom = customPresets.filter((p) => p.effectKind === effectKind);
      const builtIn = DEFAULT_PRESETS.filter((p) => p.effectKind === effectKind);
      return [...builtIn, ...custom];
    },
    [customPresets]
  );

  /**
   * Get favorite presets
   */
  const getFavoritePresets = useMemo((): EffectPreset[] => {
    const allPresets = [...DEFAULT_PRESETS, ...customPresets];
    return favoriteIds
      .map((id) => allPresets.find((p) => p.id === id))
      .filter((p): p is EffectPreset => p !== undefined);
  }, [favoriteIds, customPresets]);

  /**
   * Get recent presets
   */
  const getRecentPresets = useMemo((): EffectPreset[] => {
    const allPresets = [...DEFAULT_PRESETS, ...customPresets];
    return recentIds
      .map((id) => allPresets.find((p) => p.id === id))
      .filter((p): p is EffectPreset => p !== undefined);
  }, [recentIds, customPresets]);

  /**
   * Check if preset is favorite
   */
  const isFavorite = useCallback(
    (id: string): boolean => {
      return favoriteIds.includes(id);
    },
    [favoriteIds]
  );

  /**
   * Export presets to JSON
   */
  const exportPresets = useCallback(
    (presetIds?: string[]): string => {
      const presetsToExport = presetIds
        ? customPresets.filter((p) => presetIds.includes(p.id))
        : customPresets;

      const exportData: PresetExportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        presets: presetsToExport,
      };

      return JSON.stringify(exportData, null, 2);
    },
    [customPresets]
  );

  /**
   * Import presets from JSON
   */
  const importPresets = useCallback((jsonString: string): { success: boolean; count: number; errors: string[] } => {
    const errors: string[] = [];

    try {
      const data = JSON.parse(jsonString) as PresetExportData;

      // Validate structure
      if (!data.presets || !Array.isArray(data.presets)) {
        return { success: false, count: 0, errors: ["Invalid format: missing presets array"] };
      }

      // Validate and import each preset
      const importedPresets: EffectPreset[] = [];

      data.presets.forEach((preset, index) => {
        try {
          // Validate required fields
          if (!preset.name || !preset.effectKind || !preset.params) {
            errors.push(`Preset ${index + 1}: Missing required fields`);
            return;
          }

          // Check if effect kind exists
          const effectDef = getEffectDef(preset.effectKind);
          if (!effectDef) {
            errors.push(`Preset "${preset.name}": Unknown effect kind "${preset.effectKind}"`);
            return;
          }

          // Create new preset with new ID
          importedPresets.push({
            ...preset,
            id: generatePresetId(),
            category: "custom",
            createdAt: Date.now(),
          });
        } catch (e) {
          errors.push(`Preset ${index + 1}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      });

      // Add imported presets
      if (importedPresets.length > 0) {
        setCustomPresets((prev) => [...prev, ...importedPresets]);
      }

      return {
        success: importedPresets.length > 0,
        count: importedPresets.length,
        errors,
      };
    } catch (e) {
      return {
        success: false,
        count: 0,
        errors: [`Invalid JSON: ${e instanceof Error ? e.message : "Unknown error"}`],
      };
    }
  }, []);

  /**
   * Clear all custom presets
   */
  const clearAllPresets = useCallback(() => {
    setCustomPresets([]);
    setFavoriteIds([]);
    setRecentIds([]);
  }, []);

  /**
   * Get all presets (built-in + custom)
   */
  const allPresets = useMemo((): EffectPreset[] => {
    return [...DEFAULT_PRESETS, ...customPresets];
  }, [customPresets]);

  return {
    // Preset CRUD
    savePreset,
    updatePreset,
    deletePreset,
    getPresetById,
    getPresetsForEffect,
    allPresets,
    customPresets,
    defaultPresets: DEFAULT_PRESETS,

    // Favorites
    getFavoritePresets,
    toggleFavorite,
    isFavorite,

    // Recent
    getRecentPresets,
    addToRecent,

    // Import/Export
    exportPresets,
    importPresets,
    clearAllPresets,
  };
}

/**
 * Get effect definition with presets
 */
export function useEffectWithPresets(effectKind: string) {
  const effectDef = getEffectDef(effectKind);
  const { getPresetsForEffect, getDefaultPresetsForEffect } = usePresetStore();

  const presets = useMemo(() => {
    if (!effectDef) return [];
    return getPresetsForEffect(effectKind);
  }, [effectDef, getPresetsForEffect]);

  const builtInPresets = useMemo(() => {
    if (!effectDef) return [];
    return getDefaultPresetsForEffect(effectKind);
  }, [effectDef, getDefaultPresetsForEffect]);

  return {
    effectDef,
    presets,
    builtInPresets,
    customPresets: presets.filter((p) => p.category === "custom"),
  };
}