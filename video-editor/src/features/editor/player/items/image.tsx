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

  const crop = details?.crop || {
    x: 0,
    y: 0,
    width: details.width,
    height: details.height
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

  const children = (
    <div
      style={calculateContainerStyles(details, crop, {
        transform: "scale(1)"
      })}
    >
      <div
        id={`${item.id}-reveal-mask`}
        style={{
          ...calculateMediaStyles(details, crop),
          ...filterStyle,
        }}
      >
        <Img data-id={item.id} src={details.src as string} />
      </div>
    </div>
  );

  return BaseSequence({ item, options, children });
}
