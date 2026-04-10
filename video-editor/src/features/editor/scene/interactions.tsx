import { useEffect, useMemo, useRef, useState } from "react";
import { Selection, Moveable } from "@interactify/toolkit";
import { getIdFromClassName } from "../utils/scene";
import {
  SelectionInfo,
  emptySelection,
  getSelectionByIds,
  getTargetById,
} from "../utils/target";
import useStore from "../store/use-store";
import { getCurrentTime } from "../utils/time";
import {
  calculateTextHeight,
} from "../utils/text";
import { useEngineDispatch, useEngineSelector } from "../engine/engine-provider";
import { setSelection, updateTransform } from "../engine/commands";

let holdGroupPosition: Record<string, { left: number; top: number }> | null = null;
let dragStartEnd = false;

const snapDirections = {
  top: true,
  left: true,
  bottom: true,
  right: true,
  center: true,
  middle: true,
};

interface SceneInteractionsProps {
  stateManager: any;
  containerRef: React.RefObject<HTMLDivElement>;
  zoom: number;
  size: { width: number; height: number };
}

export function SceneInteractions({
  stateManager,
  containerRef,
  zoom,
}: SceneInteractionsProps) {
  const [targets, setTargets] = useState<HTMLDivElement[]>([]);
  const [selection, setSelectionState] = useState<Selection>();
  const {
    activeIds,
    setState,
    trackItemsMap,
    playerRef,
    setSceneMoveableRef,
    trackItemIds,
  } = useStore();
  const moveableRef = useRef<Moveable>(null);
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo>(emptySelection);
  
  const engineDispatch = useEngineDispatch();
  const engineSelection = useEngineSelector((p) => p.ui.selection);

  const elementGuidelines = useMemo(
    () =>
      ["artboard", ...trackItemIds.filter((id) => !activeIds.includes(id))].map(
        (id) =>
          `#${
            typeof window !== "undefined" && window.CSS
              ? window.CSS.escape(id)
              : id
          }`
      ),
    [trackItemIds, activeIds]
  );

  useEffect(() => {
    const updateTargets = (time?: number) => {
      const currentTime = time ?? getCurrentTime();
      const currentIds = engineSelection.length > 0 ? engineSelection : activeIds;
      const targetIds = currentIds.filter((id: string) => {
        const item = trackItemsMap[id];
        return item?.display.from <= currentTime && item?.display.to >= currentTime;
      });
      const domTargets = targetIds
        .map((id) => getTargetById(id) as HTMLDivElement)
        .filter(Boolean);
      selection?.setSelectedTargets(domTargets);
      const selInfo = getSelectionByIds(targetIds);
      setSelectionInfo(selInfo);
      setTargets(selInfo.targets as HTMLDivElement[]);
    };

    const timer = setTimeout(updateTargets);

    const onSeeked = (v: any) => {
      setTimeout(() => {
        const { fps } = useStore.getState();
        const seekedTime = (v.detail.frame / fps) * 1000;
        updateTargets(seekedTime);
      });
    };
    playerRef?.current?.addEventListener("seeked", onSeeked);

    return () => {
      playerRef?.current?.removeEventListener("seeked", onSeeked);
      clearTimeout(timer);
    };
  }, [engineSelection, activeIds, playerRef, trackItemsMap]);

  useEffect(() => {
    const sel = new Selection({
      container: containerRef.current,
      boundContainer: true,
      hitRate: 0,
      selectableTargets: [".designcombo-scene-item"],
      selectFromInside: false,
      selectByClick: true,
      toggleContinueSelect: "shift",
    })
      .on("select", (e) => {
        const filtered = e.selected.filter(
          (el) => !el.className.includes("designcombo-scene-item-type-audio")
        );
        const ids = filtered.map((el) => getIdFromClassName(el.className));
        setTargets(filtered as HTMLDivElement[]);
        engineDispatch(setSelection(ids));
        stateManager?.updateState({ activeIds: ids }, { updateHistory: false, kind: "layer:selection" });
      })
      .on("dragStart", (e) => {
        const target = e.inputEvent.target as HTMLDivElement;
        dragStartEnd = false;
        if (targets.includes(target)) e.stop();
        if (target && moveableRef?.current?.moveable.isMoveableElement(target)) e.stop();
      })
      .on("dragEnd", () => {
        dragStartEnd = true;
      })
      .on("selectEnd", (e) => {
        const moveable = moveableRef.current;
        if (e.isDragStart) {
          e.inputEvent.preventDefault();
          setTimeout(() => {
            if (!dragStartEnd) moveable?.moveable.dragStart(e.inputEvent);
          });
        } else {
          const filtered = e.selected.filter(
            (el) => !el.className.includes("designcombo-scene-item-type-audio")
          ) as HTMLDivElement[];
          const ids = filtered.map((el) => getIdFromClassName(el.className));
          engineDispatch(setSelection(ids));
          stateManager?.updateState({ activeIds: ids }, { updateHistory: false, kind: "layer:selection" });
          setTargets(filtered);
        }
      });

    setSelectionState(sel);
    return () => sel.destroy();
  }, []);

  useEffect(() => {
    if (stateManager && stateManager.subscribeToState) {
      const unsubscribe = stateManager.subscribeToState((newState: any) => {
        setState(newState);
      });
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [stateManager]);

  useEffect(() => {
    moveableRef.current?.moveable.updateRect();
  }, [trackItemsMap]);

  useEffect(() => {
    setSceneMoveableRef(moveableRef as React.RefObject<Moveable>);
  }, []);

  const handleDrag = ({ target, top, left }: { target: HTMLElement | SVGElement; top: number; left: number }) => {
    target.style.top = `${top}px`;
    target.style.left = `${left}px`;
  };

  const handleDragEnd = ({ target, isDrag }: { target: HTMLElement | SVGElement; isDrag: boolean }) => {
    if (!isDrag) return;
    const targetId = getIdFromClassName(target.className) as string;
    const currentLeft = parseFloat(target.style.left);
    const currentTop = parseFloat(target.style.top);
    
    stateManager?.updateState({
      [targetId]: {
        details: {
          left: isNaN(currentLeft) ? 0 : currentLeft,
          top: isNaN(currentTop) ? 0 : currentTop,
        },
      },
    });
    
    engineDispatch(updateTransform(targetId, {
      x: isNaN(currentLeft) ? 0 : currentLeft,
      y: isNaN(currentTop) ? 0 : currentTop,
    }));
  };

  const handleScale = ({
    target,
    transform,
    direction,
  }: {
    target: HTMLElement | SVGElement;
    transform: string;
    direction: number[];
  }) => {
    const [xControl, yControl] = direction;
    const scaleRegex = /scale\(([^)]+)\)/;
    const match = target.style.transform.match(scaleRegex);
    if (!match) return;
    const [scaleX, scaleY] = match[1].split(",").map((v) => parseFloat(v.trim()));
    const match2 = transform.match(scaleRegex);
    if (!match2) return;
    const [newScaleX, newScaleY] = match2[1].split(",").map((v) => parseFloat(v.trim()));

    const currentW = target.clientWidth * scaleX;
    const currentH = target.clientHeight * scaleY;
    const newW = target.clientWidth * newScaleX;
    const newH = target.clientHeight * newScaleY;

    target.style.transform = transform;

    const diffX = currentW - newW;
    const diffY = currentH - newH;
    let newLeft = parseFloat(target.style.left) - diffX / 2;
    let newTop = parseFloat(target.style.top) - diffY / 2;
    if (xControl === -1) newLeft += diffX;
    if (yControl === -1) newTop += diffY;
    target.style.left = `${newLeft}px`;
    target.style.top = `${newTop}px`;
  };

  const handleScaleEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    if (!target.style.transform) return;
    const targetId = getIdFromClassName(target.className) as string;
    const currentLeft = parseFloat(target.style.left);
    const currentTop = parseFloat(target.style.top);
    
    stateManager?.updateState({
      [targetId]: {
        details: {
          transform: target.style.transform,
          left: isNaN(currentLeft) ? 0 : currentLeft,
          top: isNaN(currentTop) ? 0 : currentTop,
        },
      },
    });
    
    engineDispatch(updateTransform(targetId, {
      x: isNaN(currentLeft) ? 0 : currentLeft,
      y: isNaN(currentTop) ? 0 : currentTop,
    }));
  };

  const handleRotate = ({ target, transform }: { target: HTMLElement | SVGElement; transform: string }) => {
    target.style.transform = transform;
  };

  const handleRotateEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    if (!target.style.transform) return;
    const targetId = getIdFromClassName(target.className) as string;
    
    stateManager?.updateState({
      [targetId]: {
        details: { transform: target.style.transform },
      },
    });
    
    const rotateMatch = target.style.transform.match(/rotate\(([^)]+)/);
    if (rotateMatch) {
      const degrees = parseFloat(rotateMatch[1]);
      if (!isNaN(degrees)) {
        engineDispatch(updateTransform(targetId, { rotate: degrees }));
      }
    }
  };

  const handleResize = ({
    target,
    width: nextWidth,
    height: nextHeight,
    direction,
  }: {
    target: HTMLElement | SVGElement;
    width: number;
    height: number;
    direction: number[];
  }) => {
    const id = getIdFromClassName(target.className);
    if (!id || !trackItemsMap[id]) return;
    const type = trackItemsMap[id].type;

    if (type === "progressSquare") {
      const diffH = nextHeight - parseFloat(target.style.height);
      const currentLeft = parseFloat(target.style.left);
      const updateData: any = { 
        width: nextWidth, 
        height: nextHeight, 
        left: isNaN(currentLeft) ? 0 : currentLeft 
      };
      if (direction[1] === -1) {
        const newTop = `${parseFloat(target.style.top) - diffH}px`;
        target.style.top = newTop;
        updateData.top = newTop;
      }
      target.style.width = `${nextWidth}px`;
      target.style.height = `${nextHeight}px`;
      setState({
        trackItemsMap: {
          [id]: { ...trackItemsMap[id], details: { ...trackItemsMap[id].details, ...updateData } as any },
        },
      });
      return;
    }

    if (type === "text" || type === "caption") {
      const selector = type === "text" ? `[data-text-id="${id}"]` : `#caption-${id}`;
      const textEl = document.querySelector(selector) as HTMLDivElement;
      if (textEl) {
        const minH = calculateTextHeight({
          family: textEl.style.fontFamily,
          fontSize: textEl.style.fontSize,
          fontWeight: textEl.style.fontWeight,
          letterSpacing: textEl.style.letterSpacing,
          lineHeight: textEl.style.lineHeight,
          text: textEl.innerHTML,
          textShadow: textEl.style.textShadow,
          webkitTextStroke: (textEl.style as any).webkitTextStroke,
          width: nextWidth + "px",
          textTransform: textEl.style.textTransform,
        });
        const finalH = Math.max(nextHeight, minH);
        target.style.width = `${nextWidth}px`;
        target.style.height = `${finalH}px`;

        const animDiv = target.firstElementChild?.firstElementChild as HTMLDivElement | null;
        if (animDiv) {
          animDiv.style.width = `${nextWidth}px`;
          animDiv.style.height = `${finalH}px`;
          const textDiv = document.querySelector(`[data-text-id="${id}"]`) as HTMLDivElement;
          if (textDiv) {
            textDiv.style.width = `${nextWidth}px`;
            textDiv.style.height = `${finalH}px`;
          }
        }
        setState({
          trackItemsMap: {
            [id]: {
              ...trackItemsMap[id],
              details: { ...trackItemsMap[id].details, width: nextWidth, height: finalH } as any,
            },
          },
        });
        return;
      }
    }

    target.style.width = `${nextWidth}px`;
    target.style.height = `${nextHeight}px`;
    const animDiv = target.firstElementChild?.firstElementChild as HTMLDivElement | null;
    if (animDiv) {
      animDiv.style.width = `${nextWidth}px`;
      animDiv.style.height = `${nextHeight}px`;
    }
    setState({
      trackItemsMap: {
        [id]: {
          ...trackItemsMap[id],
          details: { ...trackItemsMap[id].details, width: nextWidth, height: nextHeight },
        },
      },
    });
  };

  const handleResizeEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const targetId = getIdFromClassName(target.className) as string;
    if (!targetId || !trackItemsMap[targetId]) return;
    const type = trackItemsMap[targetId].type;

    const buildPayload = () => ({
      clipId: targetId,
      details: {
        ...trackItemsMap[targetId].details,
        width: parseFloat(target.style.width),
        height: parseFloat(target.style.height),
      },
    });

    if (type === "text" || type === "caption") {
      const selector = type === "text" ? `[data-text-id="${targetId}"]` : `#caption-${targetId}`;
      const textDiv = document.querySelector(selector) as HTMLDivElement;
      if (textDiv) {
        const payload = {
          [targetId]: {
            details: {
              ...trackItemsMap[targetId].details,
              width: parseFloat(target.style.width),
              height: parseFloat(target.style.height),
              fontSize: parseFloat(textDiv.style.fontSize),
            },
          },
        };
        
        stateManager?.updateState({ payload });
        engineDispatch({
          type: "UPDATE_CLIP",
          payload: buildPayload(),
        });
      }
    } else if (type === "progressSquare") {
      const currentLeft = parseFloat(target.style.left);
      const payload = {
        [targetId]: {
          details: {
            ...trackItemsMap[targetId].details,
            width: parseFloat(target.style.width),
            height: parseFloat(target.style.height),
            left: isNaN(currentLeft) ? 0 : currentLeft,
          },
        },
      };
      
      stateManager?.updateState({ payload });
      engineDispatch({
        type: "UPDATE_CLIP",
        payload: {
          ...buildPayload(),
          details: {
            ...buildPayload().details,
            left: isNaN(currentLeft) ? 0 : currentLeft,
          },
        },
      });
    } else {
      stateManager?.updateState({
        payload: {
          [targetId]: {
            details: {
              ...trackItemsMap[targetId].details,
              width: parseFloat(target.style.width),
              height: parseFloat(target.style.height),
            },
          },
        },
      });
      engineDispatch({ type: "UPDATE_CLIP", payload: buildPayload() });
    }
  };

  const handleDragGroup = ({ events }: { events: any[] }) => {
    holdGroupPosition = {};
    for (const event of events) {
      const id = getIdFromClassName(event.target.className);
      const item = trackItemsMap[id];
      if (!item?.details) continue;
      const currentLeft = parseFloat(item.details.left as string) || 0;
      const currentTop = parseFloat(item.details.top as string) || 0;
      const left = currentLeft + event.beforeTranslate[0];
      const top = currentTop + event.beforeTranslate[1];
      event.target.style.left = `${left}px`;
      event.target.style.top = `${top}px`;
      holdGroupPosition[id] = { left, top };
    }
  };

  const handleDragGroupEnd = () => {
    if (!holdGroupPosition) return;
    const payload: Record<string, any> = {};
    for (const id of Object.keys(holdGroupPosition)) {
      const pos = holdGroupPosition[id];
      payload[id] = {
        details: { top: `${pos.top}px`, left: `${pos.left}px` },
      };
    }
    stateManager?.updateState({ payload });
    holdGroupPosition = null;
  };

  return (
    <Moveable
      ref={moveableRef}
      rotationPosition={"bottom"}
      renderDirections={selectionInfo.controls}
      {...selectionInfo.ables}
      origin={false}
      target={targets}
      zoom={1 / zoom}
      className="designcombo-scene-moveable"
      snappable
      elementGuidelines={elementGuidelines}
      elementSnapDirections={snapDirections}
      snapDirections={snapDirections}
      snapThreshold={30}
      snapGap={true}
      isDisplaySnapDigit={false}
      isDisplayInnerSnapDigit={false}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onScale={handleScale}
      onScaleEnd={handleScaleEnd}
      onRotate={handleRotate}
      onRotateEnd={handleRotateEnd}
      onDragGroup={handleDragGroup}
      onDragGroupEnd={handleDragGroupEnd}
      onResize={handleResize}
      onResizeEnd={handleResizeEnd}
    />
  );
}
