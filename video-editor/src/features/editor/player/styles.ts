import { buildEffectStyle } from "../utils/video-effects-utils";

interface IImage {
  type: "image";
  details: {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    boxShadow?: { x: number; y: number; blur: number; color: string };
    crop: { x: number; y: number; width: number; height: number };
    [key: string]: unknown;
  };
}

interface IText {
  type: "text";
  details: Record<string, unknown>;
}

interface ITrackItem {
  type: string;
  details: Record<string, unknown>;
}

export const calculateCropStyles = (
  details: IImage["details"],
  crop: IImage["details"]["crop"],
  canvasSize?: { width: number; height: number }
) => {
  // Use canvas dimensions if available for proper scaling, otherwise use details
  const targetWidth = canvasSize?.width || details.width;
  const targetHeight = canvasSize?.height || details.height;
  
  return {
    width: targetWidth || "100%",
    height: targetHeight || "100%",
    top: -crop.y || 0,
    left: -crop.x || 0,
    position: "absolute",
    borderRadius: `${Math.min(Number(crop.width) || Number(details.width) || 1920, Number(crop.height) || Number(details.height) || 1080) * ((details.borderRadius || 0) / 100)}px`
  };
};

export const calculateMediaStyles = (
  details: ITrackItem["details"],
  crop: ITrackItem["details"]["crop"],
  canvasSize?: { width: number; height: number }
) => {
  return {
    pointerEvents: "none",
    boxShadow: [
      `0 0 0 ${details.borderWidth}px ${details.borderColor}`,
      details.boxShadow
        ? `${details.boxShadow.x}px ${details.boxShadow.y}px ${details.boxShadow.blur}px ${details.boxShadow.color}`
        : ""
    ]
      .filter(Boolean)
      .join(", "),
    ...calculateCropStyles(details, crop, canvasSize),
    overflow: "hidden"
  } as React.CSSProperties;
};

export const calculateTextStyles = (
  details: IText["details"]
): React.CSSProperties => ({
  position: "relative",
  textDecoration: details.textDecoration || "none",
  WebkitTextStroke: `${details.borderWidth}px ${details.borderColor}`, // Outline/stroke color and thickness
  paintOrder: "stroke fill", // Order of painting
  textShadow: details.boxShadow
    ? `${details.boxShadow.x}px ${details.boxShadow.y}px ${details.boxShadow.blur}px ${details.boxShadow.color}`
    : "",
  fontFamily: details.fontFamily || "Arial",
  fontWeight: details.fontWeight || "normal",
  lineHeight: details.lineHeight || "normal",
  letterSpacing: details.letterSpacing || "normal",
  wordSpacing: details.wordSpacing || "normal",
  wordWrap: details.wordWrap || "",
  wordBreak: details.wordBreak || "normal",
  textTransform: details.textTransform || "none",
  fontSize: details.fontSize || "16px",
  textAlign: details.textAlign || "left",
  color: details.color || "#000000",
  backgroundColor: details.backgroundColor || "transparent",
  borderRadius: `${Math.min(details.width, details.height) * ((details.borderRadius || 0) / 100)}px`
});

export const calculateContainerStyles = (
  details: ITrackItem["details"],
  crop: ITrackItem["details"]["crop"] = {},
  overrides: React.CSSProperties = {},
  type?: string,
  canvasSize?: { width: number; height: number }
): React.CSSProperties => {
  const appliedEffects = (details as any).appliedEffects ?? [];
  const effectStyle = buildEffectStyle(appliedEffects);

  const baseFilter = `blur(${details.blur ?? 0}px) brightness(${details.brightness ?? 100}%) contrast(${details.contrast ?? 100}%) saturate(${details.saturation ?? 100}%)`;
  const combinedFilters = [baseFilter, effectStyle.filter].filter(Boolean).join(" ");

  // Use canvas dimensions for proper fill
  const targetWidth = canvasSize?.width || crop.width || details.width || "100%";
  const targetHeight = canvasSize?.height || crop.height || details.height || "100%";

  // Opacity is now stored as 0-1 (not 0-100) from effect controls panel
  const opacityValue = details.opacity !== undefined ? Number(details.opacity) : 1;

  return {
    pointerEvents: "auto",
    top: details.top || 0,
    left: details.left || 0,
    width: targetWidth,
    height:
      type === "text" || type === "caption"
        ? "max-content"
        : targetHeight,
    transform: details.transform || "none",
    opacity: opacityValue,
    transformOrigin: details.transformOrigin || "center center",
    filter: combinedFilters,
    rotate: details.rotate || "0deg",
    ...effectStyle.style,
    ...overrides
  };
};
