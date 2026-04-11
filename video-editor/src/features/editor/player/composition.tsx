import { SequenceItem } from "./sequence-item";
import { useEffect, useState } from "react";
import { calculateTextHeight } from "../utils/text";
import { useCurrentFrame } from "remotion";
import useStore from "../store/use-store";

const Composition = () => {
  const [editableTextId, setEditableTextId] = useState<string | null>(null);
  const {
    trackItemIds,
    trackItemsMap,
    fps,
    sceneMoveableRef,
    size,
    tracks
  } = useStore();
  const frame = useCurrentFrame();

  const mutedTrackIds = new Set<string>();

  const trackForItem = (itemId: string) => {
    for (const track of tracks) {
      if ((track as any).items?.includes(itemId)) {
        return track;
      }
    }
    return null;
  };

  const handleTextChange = (id: string, _: string) => {
    const elRef = document.querySelector(`.id-${id}`) as HTMLDivElement;
    const containerDiv = elRef?.firstElementChild?.firstElementChild as HTMLDivElement;
    const textDiv = elRef?.firstElementChild?.firstElementChild?.firstElementChild?.firstElementChild?.firstElementChild as HTMLDivElement;

    if (!elRef || !textDiv) return;

    const {
      fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      textShadow,
      webkitTextStroke,
      textTransform
    } = textDiv.style;
    if (!elRef.innerText) return;

    const words = elRef.innerText.split(/\s+/);
    const longestWord = words.reduce(
      (longest, word) => (word.length > longest.length ? word : longest),
      ""
    );

    const tempDiv = document.createElement("div");
    tempDiv.style.visibility = "hidden";
    tempDiv.style.position = "absolute";
    tempDiv.style.top = "-1000px";
    tempDiv.style.fontSize = fontSize;
    tempDiv.style.fontFamily = fontFamily;
    tempDiv.style.fontWeight = fontWeight;
    tempDiv.style.letterSpacing = letterSpacing;
    tempDiv.textContent = longestWord;
    document.body.appendChild(tempDiv);
    const wordWidth = tempDiv.offsetWidth;
    document.body.removeChild(tempDiv);

    const currentWidth = elRef.clientWidth;
    if (wordWidth > currentWidth) {
      elRef.style.width = `${wordWidth}px`;
      textDiv.style.width = `${wordWidth}px`;
      if (containerDiv) containerDiv.style.width = `${wordWidth}px`;
    }

    const newHeight = calculateTextHeight({
      family: fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      text: elRef.innerText || "",
      textShadow: textShadow,
      webkitTextStroke,
      width: elRef.style.width,
      id: id,
      textTransform
    });
    const currentHeight = elRef.clientHeight;
    if (newHeight > currentHeight) {
      elRef.style.height = `${newHeight}px`;
      textDiv.style.height = `${newHeight}px`;
    }
    sceneMoveableRef?.current?.moveable.updateRect();
    sceneMoveableRef?.current?.moveable.forceUpdate();
  };

  const onTextBlur = (id: string, _: string) => {
    const elRef = document.querySelector(`.id-${id}`) as HTMLDivElement;
    const textDiv = elRef?.firstElementChild?.firstElementChild?.firstElementChild as HTMLDivElement;
    
    if (!elRef || !textDiv) return;

    const {
      fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      textShadow,
      webkitTextStroke,
      textTransform
    } = textDiv.style;
    const { width } = elRef.style;
    if (!elRef.innerText) return;
    const newHeight = calculateTextHeight({
      family: fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      text: elRef.innerText || "",
      textShadow: textShadow,
      webkitTextStroke,
      width,
      id: id,
      textTransform
    });

    const store = useStore.getState();
    const item = store.trackItemsMap[id];
    if (item) {
      store.setState({
        trackItemsMap: {
          ...store.trackItemsMap,
          [id]: {
            ...item,
            details: {
              ...item.details,
              height: newHeight,
              text: elRef.innerText,
            },
          },
        },
      } as any);
    }
  };

  return (
    <>
      {trackItemIds.map((id) => {
        const item = trackItemsMap[id];
        if (!item) return null;
        const owningTrack = trackForItem(item.id);
        const SequenceItemFn = SequenceItem[item.type];
        if (!SequenceItemFn) return null;
        return SequenceItemFn(item, {
          fps,
          handleTextChange,
          onTextBlur,
          editableTextId,
          frame,
          size,
          mutedTrackIds,
          owningTrackId: owningTrack?.id,
        });
      })}
    </>
  );
};

export default Composition;
