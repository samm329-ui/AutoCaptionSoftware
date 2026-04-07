/**
 * video-effects-utils.ts
 * ─────────────────────────────────────────────────────────────
 * Runtime helper used by the Remotion player items (video.tsx, image.tsx)
 * to convert a clip's `appliedEffects` array into a merged CSS filter
 * string (and optional style overrides) that can be applied directly to
 * the container div.
 *
 * USAGE inside video.tsx / image.tsx:
 *
 *   import { buildEffectStyle } from "../utils/video-effects-utils";
 *
 *   const effectStyle = buildEffectStyle(details.appliedEffects ?? []);
 *
 *   // Then spread into your container:
 *   <BoxAnim style={{ ...calculateContainerStyles(details, crop), ...effectStyle }}>
 *
 * The function is intentionally pure — no side effects, no hooks.
 * It runs once per frame render (Remotion calls the component every frame).
 */

import { getEffectDef, AppliedEffect } from "../data/video-effects";

export interface EffectStyleResult {
  filter: string;
  style: Record<string, string | number>;
}

export function buildEffectStyle(applied: AppliedEffect[]): EffectStyleResult {
  const filters: string[] = [];
  const style: Record<string, string | number> = {};

  for (const eff of applied) {
    if (eff.params?.__muted) continue;

    const def = getEffectDef(eff.kind);
    if (!def) continue;

    try {
      const result = def.buildFilter(eff.params ?? {});

      if (result.filter && result.filter.trim()) {
        filters.push(result.filter.trim());
      }

      if (result.style) {
        Object.assign(style, result.style);
      }
    } catch {
      // Never let a broken effect crash the player
    }
  }

  return {
    filter: filters.join(" ") || "",
    style,
  };
}

export function mergeEffectFilter(
  baseFilter: string,
  applied: AppliedEffect[] = []
): string {
  const { filter } = buildEffectStyle(applied);
  const parts = [baseFilter, filter].filter(Boolean);
  return parts.join(" ");
}

export function isEffectApplied(
  appliedEffects: AppliedEffect[] = [],
  kind: string
): boolean {
  return appliedEffects.some((e) => e.kind === kind);
}

export function getEffectParams(
  appliedEffects: AppliedEffect[] = [],
  kind: string
): Record<string, number | string | boolean> | undefined {
  return appliedEffects.find((e) => e.kind === kind)?.params;
}