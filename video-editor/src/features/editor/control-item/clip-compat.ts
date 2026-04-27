/**
 * control-item/clip-compat.ts — NEW FILE
 *
 * Centralized compatibility shim for converting engine Clip to legacy shapes
 * that un-migrated child components still expect.
 */

import type { Clip } from "../engine/engine-core";

export interface TrackItemCompat {
  id: string;
  type: string;
  name: string;
  display: { from: number; to: number };
  trim:    { from: number; to: number };
  details: Record<string, unknown>;
}

export interface TextPropertiesCompat {
  color:              string;
  colorDisplay:       string;
  backgroundColor:    string;
  fontSize:           number;
  fontSizeDisplay:    string;
  fontFamily:         string;
  fontFamilyDisplay:  string;
  opacity:            number;
  opacityDisplay:     string;
  textAlign:          string;
  textDecoration:     string;
  borderWidth:        number;
  borderColor:        string;
  boxShadow:          unknown;
}

export interface CaptionPropertiesCompat extends TextPropertiesCompat {
  appearedColor:         string;
  activeColor:           string;
  activeFillColor:       string;
  isKeywordColor:        string;
  preservedColorKeyWord: boolean;
}

export function clipToTrackItemCompat(clip: Clip): TrackItemCompat {
  const d = clip.details as Record<string, unknown>;
  return {
    id:      clip.id,
    type:    clip.type,
    name:    clip.name,
    display: clip.display,
    trim:    clip.trim,
    details: {
      ...d,
      opacity: clip.transform.opacity,
      rotate:  clip.transform.rotate,
      left:    clip.transform.x,
      top:     clip.transform.y,
      scaleX:  clip.transform.scaleX,
      scaleY:  clip.transform.scaleY,
      flipX:   clip.transform.flipX,
      flipY:   clip.transform.flipY,
      // Include applied effects so player can render them
      appliedEffects: clip.appliedEffects || [],
    },
  };
}

export function clipToTextProperties(clip: Clip, fontFamily: string): TextPropertiesCompat {
  const d = clip.details as Record<string, unknown>;
  const opacity = clip.transform.opacity;
  return {
    color:             (d.color            as string)  || "#ffffff",
    colorDisplay:      (d.color            as string)  || "#ffffff",
    backgroundColor:   (d.backgroundColor as string)  || "transparent",
    fontSize:          (d.fontSize         as number)  || 62,
    fontSizeDisplay:   `${(d.fontSize      as number)  || 62}px`,
    fontFamily,
    fontFamilyDisplay: fontFamily,
    opacity,
    opacityDisplay:    `${Math.round(opacity * 100)}%`,
    textAlign:         (d.textAlign        as string)  || "left",
    textDecoration:    (d.textDecoration   as string)  || "none",
    borderWidth:       (d.borderWidth      as number)  || 0,
    borderColor:       (d.borderColor      as string)  || "#000000",
    boxShadow:         d.boxShadow || { color: "#000000", x: 0, y: 0, blur: 0 },
  };
}

export function clipToCaptionProperties(
  clip: Clip,
  fontFamily: string
): CaptionPropertiesCompat {
  const d = clip.details as Record<string, unknown>;
  return {
    ...clipToTextProperties(clip, fontFamily),
    appearedColor:         (d.appearedColor         as string)  || "#ffffff",
    activeColor:           (d.activeColor           as string)  || "#ffffff",
    activeFillColor:       (d.activeFillColor       as string)  || "#ffffff",
    isKeywordColor:        (d.isKeywordColor        as string)  || "transparent",
    preservedColorKeyWord: (d.preservedColorKeyWord as boolean) || false,
  };
}
