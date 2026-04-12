import { PlayerRef } from "@remotion/player";
import { RefObject, useEffect, useRef } from "react";
import { useEngineSelector } from "../engine/engine-provider";
import { getTargetById, getTypeFromClassName } from "../utils/target";

export default function useUpdateAnsestors({
  playing,
  playerRef
}: {
  playing: boolean;
  playerRef: RefObject<PlayerRef> | null;
}) {
  // Use stable selection array
  const selectionRef = useRef<string[]>([]);
  const engineSelection = useEngineSelector((state) => {
    const sel = state.ui.selection;
    selectionRef.current = sel ?? [];
    return sel ?? [];
  });
  
  // Ensure we have an array
  const safeSelection = engineSelection ?? [];
  const selectionLength = safeSelection.length;

  useEffect(() => {
    if (!playing) {
      updateAnsestorsPointerEvents();
    }
  }, [playing, selectionLength]);

  useEffect(() => {
    if (playerRef && playerRef.current) {
      playerRef.current.addEventListener(
        "seeked",
        updateAnsestorsPointerEvents
      );
    }
    return () => {
      if (playerRef && playerRef.current) {
        playerRef.current.removeEventListener(
          "seeked",
          updateAnsestorsPointerEvents
        );
      }
    };
  }, [playerRef]);

  useEffect(() => {
    if (selectionLength !== 1) {
      return;
    }
    const clipId = safeSelection[0];
    if (!clipId) return;
    
    const element = getTargetById(clipId);
    if (!element) return;
    const handleDoubleClick = (e: MouseEvent) => {
      const type = getTypeFromClassName(element.className);
      if (type === "text") {
        e.stopPropagation();
      }
    };
    element.addEventListener("dblclick", handleDoubleClick);
    return () => {
      element.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [safeSelection, selectionLength]);

  const updateAnsestorsPointerEvents = () => {
    const elements = document.querySelectorAll(
      '[data-track-item="transition-element"]'
    );

    elements.forEach((element) => {
      let currentElement = element;
      while (currentElement.parentElement?.className !== "__remotion-player") {
        const parentElement = currentElement.parentElement;
        if (parentElement) {
          currentElement = parentElement;
          parentElement.style.pointerEvents = "none";
        }
      }
    });
  };
}