import type { IImage } from "@/features/editor/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { calculateContainerStyles, calculateMediaStyles } from "../styles";
import { Img } from "remotion";

export default function Image({
  item,
  options
}: {
  item: IImage;
  options: SequenceItemOptions;
}) {
  const { details } = item;
  const { size: canvasSize } = options;

  const crop = details?.crop || {
    x: 0,
    y: 0,
    width: details.width || canvasSize?.width || 1920,
    height: details.height || canvasSize?.height || 1080
  };

  const clipOpacity = details.opacity !== undefined ? Number(details.opacity) : 1;
  const clipBlur = details.blur !== undefined ? Number(details.blur) : 0;
  const clipBrightness = details.brightness !== undefined ? Number(details.brightness) : 100;
  const clipContrast = details.contrast !== undefined ? Number(details.contrast) : 100;
  const clipSaturation = details.saturation !== undefined ? Number(details.saturation) : 100;

  const filterStyle: React.CSSProperties = {
    opacity: clipOpacity,
    filter: `blur(${clipBlur}px) brightness(${clipBrightness}%) contrast(${clipContrast}%) saturate(${clipSaturation}%)`,
  };

  const containerStyle = calculateContainerStyles(details, crop, {
    ...filterStyle,
    overflow: "hidden",
  }, item.type, canvasSize);

  const mediaStyle = calculateMediaStyles(details, crop, canvasSize);

  // Apply scale directly to the container
  const scaleValue = details.scale !== undefined ? Number(details.scale) / 100 : 1;
  const rotateValue = details.rotate || 0;
  
  console.log("Image scale:", details.scale, scaleValue);
  
  const transformStr = `${scaleValue !== 1 ? `scale(${scaleValue})` : ''} ${rotateValue !== 0 ? `rotate(${rotateValue}deg)` : ''}`.trim();
  
  const wrapperStyle: React.CSSProperties = {
    ...(transformStr && { transform: transformStr }),
    transformOrigin: "center center",
    width: "100%",
    height: "100%",
  };

  const children = (
    <div style={wrapperStyle}>
      <div style={containerStyle}>
        <div style={mediaStyle}>
          <Img data-id={item.id} src={details.src as string} />
        </div>
      </div>
    </div>
  );

  return BaseSequence({ item, options, children });
}
