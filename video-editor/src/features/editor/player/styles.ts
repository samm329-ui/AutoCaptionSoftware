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
  transform?: {
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotate?: number;
    opacity?: number;
    flipX?: boolean;
    flipY?: boolean;
  };
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
): React.CSSProperties => {
  const targetWidth = canvasSize?.width || details.width;
  const targetHeight = canvasSize?.height || details.height;
  
  // Support both old crop object and new individual crop properties
  let cropLeft = 0, cropTop = 0, cropRight = 0, cropBottom = 0;
  
  if (details.cropLeft !== undefined || details.cropRight !== undefined || details.cropTop !== undefined || details.cropBottom !== undefined) {
    // New individual crop properties (percentages)
    cropLeft = Number(details.cropLeft ?? 0);
    cropRight = Number(details.cropRight ?? 0);
    cropTop = Number(details.cropTop ?? 0);
    cropBottom = Number(details.cropBottom ?? 0);
  } else if (crop) {
    // Old crop object format
    const cw = Number(crop.width || targetWidth || 1920);
    const ch = Number(crop.height || targetHeight || 1080);
    cropLeft = crop.x ? (Number(crop.x) / cw) * 100 : 0;
    cropTop = crop.y ? (Number(crop.y) / ch) * 100 : 0;
    cropRight = crop.width ? ((cw - Number(crop.width)) / cw) * 100 : 0;
    cropBottom = crop.height ? ((ch - Number(crop.height)) / ch) * 100 : 0;
  }
  
  const clipPath = `inset(${cropTop}% ${cropRight}% ${cropBottom}% ${cropLeft}%)`;
  
  return {
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    left: 0,
    width: targetWidth || "100%",
    height: targetHeight || "100%",
    boxShadow: [
      `0 0 0 ${details.borderWidth}px ${details.borderColor}`,
      details.boxShadow
        ? `${details.boxShadow.x}px ${details.boxShadow.y}px ${details.boxShadow.blur}px ${details.boxShadow.color}`
        : ""
    ]
      .filter(Boolean)
      .join(", "),
    clipPath,
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
  canvasSize?: { width: number; height: number },
  transform?: ITrackItem["transform"]
): React.CSSProperties => {
  const appliedEffects = (details as any).appliedEffects ?? [];
  const effectStyle = buildEffectStyle(appliedEffects);

  const baseFilter = `blur(${details.blur ?? 0}px) brightness(${details.brightness ?? 100}%) contrast(${details.contrast ?? 100}%) saturate(${details.saturation ?? 100}%)`;
  const combinedFilters = [baseFilter, effectStyle.filter].filter(Boolean).join(" ");

  // Use canvas dimensions for proper fill
  const targetWidth = canvasSize?.width || crop.width || details.width || "100%";
  const targetHeight = canvasSize?.height || crop.height || details.height || "100%";

  // Opacity - transform first, then legacy details
  const opacityValue = transform?.opacity ?? (details.opacity !== undefined ? Number(details.opacity) : 1);

  // Transform values - transform first, then legacy details fallback
  const posX = transform?.x ?? (details.left ?? 0);
  const posY = transform?.y ?? (details.top ?? 0);
  const rotate = transform?.rotate ?? (details.rotate ?? 0);
  
  // Scale - transform first, then legacy details
  const scaleValue = transform?.scaleX ?? (details.scale !== undefined ? Number(details.scale) / 100 : 1);
  
  // Build transform string
  const transformParts: string[] = [];
  
  // Scale first, then position, then rotate
  if (scaleValue !== 1) {
    transformParts.push(`scale(${scaleValue})`);
  }
  if (posX !== 0 || posY !== 0) {
    transformParts.push(`translate(${posX}px, ${posY}px)`);
  }
  if (rotate !== 0) {
    transformParts.push(`rotate(${rotate}deg)`);
  }
  
  const finalTransform = transformParts.length > 0 ? transformParts.join(" ") : "none";

  return {
    pointerEvents: "auto",
    top: 0,
    left: 0,
    width: targetWidth,
    height:
      type === "text" || type === "caption"
        ? "max-content"
        : targetHeight,
    transform: finalTransform,
    opacity: opacityValue,
    transformOrigin: details.transformOrigin || "center center",
    filter: combinedFilters,
    ...effectStyle.style,
    ...overrides
  };
};
