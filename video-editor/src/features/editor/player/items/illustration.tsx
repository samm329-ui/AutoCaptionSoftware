import type { IIllustration } from "@/features/editor/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { calculateContainerStyles } from "../styles";

export const Illustration = ({
  item,
  options
}: {
  item: IIllustration;
  options: SequenceItemOptions;
}) => {
  const { details } = item;

  const children = (
    <div
      style={calculateContainerStyles(details)}
      dangerouslySetInnerHTML={{ __html: (details.svgString as string) || "" }}
    />
  );
  return BaseSequence({ item, options, children });
};

export default Illustration;
