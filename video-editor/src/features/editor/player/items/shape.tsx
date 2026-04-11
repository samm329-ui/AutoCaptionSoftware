import type { IShape } from "@/features/editor/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { calculateContainerStyles } from "../styles";

export const Shape = ({
  item,
  options
}: {
  item: IShape;
  options: SequenceItemOptions;
}) => {
  const { details } = item;

  const children = (
    <div
      style={{
        ...calculateContainerStyles(details),
        width: "100%",
        height: "100%",
        backgroundColor: (details.backgroundColor as string) || "#808080"
      }}
    />
  );
  return BaseSequence({ item, options, children });
};

export default Shape;
