import type { ICaption } from "@/features/editor/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { calculateContainerStyles, calculateTextStyles } from "../styles";

export default function Caption({
  item,
  options
}: {
  item: ICaption;
  options: SequenceItemOptions;
}) {
  const { details } = item;

  const children = (
    <div
      id={`caption-${item.id}`}
      style={{
        ...calculateTextStyles(details),
        borderRadius: "16px",
        padding: "8px"
      }}
    >
      {renderCaptionText(details)}
    </div>
  );

  return BaseSequence({ item, options, children });
}

function renderCaptionText(details: Record<string, unknown>) {
  const text = details.text as string;
  if (!text) return null;
  return text;
}
