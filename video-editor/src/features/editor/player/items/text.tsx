import type { IText } from "@/features/editor/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { calculateContainerStyles, calculateTextStyles } from "../styles";
import MotionText from "../motion-text";

export default function Text({
  item,
  options
}: {
  item: IText;
  options: SequenceItemOptions;
}) {
  const { handleTextChange, onTextBlur, editableTextId } = options;
  const { id, details } = item;

  const children = (
    <div style={calculateContainerStyles(details)}>
      <div style={{ height: "100%" }}>
        <MotionText
          key={id}
          id={id}
          content={details.text as string}
          editable={editableTextId === id}
          onChange={handleTextChange}
          onBlur={onTextBlur}
          style={calculateTextStyles(details)}
          details={details}
        />
      </div>
    </div>
  );
  return BaseSequence({ item, options, children });
}
