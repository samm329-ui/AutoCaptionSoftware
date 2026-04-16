/**
 * composition.tsx — ENGINE-FIRST
 *
 * Reads all clips and tracks from the engine store only.
 * No legacy trackItemsMap / trackItemIds / useStore usage.
 *
 * Engine Clip is structurally compatible with ITrackItem:
 *   - display: { from, to }
 *   - trim: { from, to }
 *   - details: Record<string, unknown>
 * so we can cast directly.
 */

import { SequenceItem } from "./sequence-item";
import { useEffect, useState } from "react";
import { calculateTextHeight } from "../utils/text";
import { useCurrentFrame } from "remotion";
import {
  useEngineSelector,
  useEngineDispatch,
} from "../engine/engine-provider";
import {
  selectAllClips,
  selectOrderedTracks,
  selectCanvasSize,
  selectFps,
} from "../engine/selectors";
import { updateDetails } from "../engine/commands";
import useStore from "../store/use-store";
import { engineStore } from "../engine/engine-core";

const Composition = () => {
  const [editableTextId, setEditableTextId] = useState<string | null>(null);
  
  // All engine data
  const clips     = useEngineSelector(selectAllClips);
  const tracks    = useEngineSelector(selectOrderedTracks);
  const canvasSize = useEngineSelector(selectCanvasSize);
  const fps       = useEngineSelector(selectFps);
  const dispatch  = useEngineDispatch();
  const enginePlayheadMs = useEngineSelector(s => s.ui?.playheadTime ?? 0);

  // Player ref is still runtime-only in Zustand (not project data)
  const { sceneMoveableRef } = useStore();
  
  // Use engine playhead (not Remotion's internal frame)
  const displayFrame = Math.round((enginePlayheadMs / 1000) * fps);

  // Build muted-track set from engine tracks
  const mutedTrackIds = new Set<string>(
    tracks.filter((t) => t.muted).map((t) => t.id)
  );

  const handleTextChange = (id: string, _: string) => {
    const elRef = document.querySelector(`.id-${id}`) as HTMLDivElement;
    const containerDiv = elRef?.firstElementChild?.firstElementChild as HTMLDivElement;
    const textDiv = elRef?.firstElementChild?.firstElementChild?.firstElementChild?.firstElementChild?.firstElementChild as HTMLDivElement;

    if (!elRef || !textDiv) return;

    const {
      fontFamily, fontSize, fontWeight, letterSpacing,
      lineHeight, textShadow, webkitTextStroke, textTransform,
    } = textDiv.style;
    if (!elRef.innerText) return;

    const words = elRef.innerText.split(/\s+/);
    const longestWord = words.reduce(
      (longest, word) => (word.length > longest.length ? word : longest), ""
    );

    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = `visibility:hidden;position:absolute;top:-1000px;font-size:${fontSize};font-family:${fontFamily};font-weight:${fontWeight};letter-spacing:${letterSpacing}`;
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
      family: fontFamily, fontSize, fontWeight, letterSpacing, lineHeight,
      text: elRef.innerText || "", textShadow, webkitTextStroke,
      width: elRef.style.width, id, textTransform,
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
      fontFamily, fontSize, fontWeight, letterSpacing,
      lineHeight, textShadow, webkitTextStroke, textTransform,
    } = textDiv.style;
    const { width } = elRef.style;
    if (!elRef.innerText) return;

    const newHeight = calculateTextHeight({
      family: fontFamily, fontSize, fontWeight, letterSpacing, lineHeight,
      text: elRef.innerText || "", textShadow, webkitTextStroke, width, id, textTransform,
    });

    // Dispatch engine command — no Zustand write
    dispatch(updateDetails(id, { height: newHeight, text: elRef.innerText }));

    sceneMoveableRef?.current?.moveable.updateRect();
    sceneMoveableRef?.current?.moveable.forceUpdate();
  };

  // Use engine playhead time (converted to frame) for filtering
  const timeMs = enginePlayheadMs;

  // Filter clips - show if current time is within clip duration
  const activeClips = clips.filter(clip => clip.display.from <= timeMs && clip.display.to > timeMs);

  return (
    <>
      {activeClips.map((clip) => {
        const SequenceItemFn = SequenceItem[clip.type];
        if (!SequenceItemFn) return null;

        // Cast engine Clip → ITrackItem (structurally compatible)
        const item = clip as unknown as Parameters<typeof SequenceItemFn>[0];

        return SequenceItemFn(item, {
          fps,
          handleTextChange,
          onTextBlur,
          editableTextId,
          frame: displayFrame,
          size: canvasSize,
          mutedTrackIds,
          owningTrackId: clip.trackId,
        });
      })}
    </>
  );
};

export default Composition;
