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

  const children = (
    <div
      style={calculateContainerStyles(details, crop, {
        transform: "scale(1)"
      })}
    >
      <div
        id={`${item.id}-reveal-mask`}
        style={calculateMediaStyles(details, crop)}
      >
        <Img data-id={item.id} src={details.src as string} />
      </div>
    </div>
  );

  return BaseSequence({ item, options, children });
}
