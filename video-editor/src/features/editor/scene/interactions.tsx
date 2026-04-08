import { useEffect, useMemo, useRef, useState } from "react";
import { Selection, Moveable } from "@interactify/toolkit";
import { getIdFromClassName } from "../utils/scene";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import {
  SelectionInfo,
  emptySelection,
  getSelectionByIds,
  getTargetById,
} from "../utils/target";
import useStore from "../store/use-store";
import StateManager from "@designcombo/state";
import { getCurrentTime } from "../utils/time";
import {
  calculateTextHeight,
} from "../utils/text";

// ─── Module-level drag state ──────────────────────────────────────────────────
// These live outside React to avoid closure stale issues during fast drag events.
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
  stateManager: StateManager;
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
  const [selection, setSelection] = useState<Selection>();
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

  // ─── Snap guidelines ────────────────────────────────────────────────────────
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

  // ─── Keep targets in sync with activeIds + playhead position ────────────────
  // FIXED: Targets are derived from editor state, not from DOM queries alone.
  // This means selection stays stable even if the DOM re-renders.
  useEffect(() => {
    const updateTargets = (time?: number) => {
      const currentTime = time ?? getCurrentTime();
      const { trackItemsMap } = useStore.getState();
      const targetIds = activeIds.filter((id) => {
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
  }, [activeIds, playerRef, trackItemsMap]);

  // ─── Selection box setup ─────────────────────────────────────────────────────
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
        // FIXED: Always route selection through stateManager (single source of truth).
        // Never write directly to Zustand store from selection events.
        stateManager.updateState(
          { activeIds: ids },
          { updateHistory: false, kind: "layer:selection" }
        );
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
          stateManager.updateState(
            { activeIds: ids },
            { updateHistory: false, kind: "layer:selection" }
          );
          setTargets(filtered);
        }
      });

    setSelection(sel);
    return () => sel.destroy();
  }, []);

  // ─── Subscribe to stateManager active ID changes ─────────────────────────────
  useEffect(() => {
    const sub = stateManager.subscribeToActiveIds((newState) => {
      setState(newState);
    });
    return () => sub.unsubscribe();
  }, []);

  // ─── Keep moveable rect fresh when clip data changes ────────────────────────
  useEffect(() => {
    moveableRef.current?.moveable.updateRect();
  }, [trackItemsMap]);

  // ─── Register moveable ref ────────────────────────────────────────────────────
  useEffect(() => {
    setSceneMoveableRef(moveableRef as React.RefObject<Moveable>);
  }, []);

  // ─── DRAG ────────────────────────────────────────────────────────────────────
  // FIXED: onDrag still moves the DOM element visually (necessary for smooth 60fps feel),
  // but onDragEnd commits the final value to the editor state via dispatch(EDIT_OBJECT).
  // The state is NEVER ahead of the DOM — they converge at drag end.
  const handleDrag = ({ target, top, left }: { target: HTMLElement; top: number; left: number }) => {
    target.style.top = `${top}px`;
    target.style.left = `${left}px`;
  };

  const handleDragEnd = ({ target, isDrag }: { target: HTMLElement; isDrag: boolean }) => {
    if (!isDrag) return;
    const targetId = getIdFromClassName(target.className) as string;
    const currentLeft = parseFloat(target.style.left);
    const currentTop = parseFloat(target.style.top);
    dispatch(EDIT_OBJECT, {
      payload: {
        [targetId]: {
          details: {
            left: isNaN(currentLeft) ? 0 : currentLeft,
            top: isNaN(currentTop) ? 0 : currentTop,
          },
        },
      },
    });
  };

  // ─── SCALE ───────────────────────────────────────────────────────────────────
  const handleScale = ({
    target,
    transform,
    direction,
  }: {
    target: HTMLElement;
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

  const handleScaleEnd = ({ target }: { target: HTMLElement }) => {
    if (!target.style.transform) return;
    const targetId = getIdFromClassName(target.className) as string;
    const currentLeft = parseFloat(target.style.left);
    const currentTop = parseFloat(target.style.top);
    dispatch(EDIT_OBJECT, {
      payload: {
        [targetId]: {
          details: {
            transform: target.style.transform,
            left: isNaN(currentLeft) ? 0 : currentLeft,
            top: isNaN(currentTop) ? 0 : currentTop,
          },
        },
      },
    });
  };

  // ─── ROTATE ──────────────────────────────────────────────────────────────────
  const handleRotate = ({ target, transform }: { target: HTMLElement; transform: string }) => {
    target.style.transform = transform;
  };

  const handleRotateEnd = ({ target }: { target: HTMLElement }) => {
    if (!target.style.transform) return;
    const targetId = getIdFromClassName(target.className) as string;
    dispatch(EDIT_OBJECT, {
      payload: {
        [targetId]: {
          details: { transform: target.style.transform },
        },
      },
    });
  };

  // ─── RESIZE ──────────────────────────────────────────────────────────────────
  // FIXED: Resize updates DOM for smooth visual feedback, but ALSO syncs Zustand
  // via setState immediately so the right panel stays live during resize (no lag).
  const handleResize = ({
    target,
    width: nextWidth,
    height: nextHeight,
    direction,
  }: {
    target: HTMLElement;
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
        // FIXED: Sync Zustand in real-time so Effect Controls panel shows live values.
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

    // Default free resize (image, video, shape, etc.)
    target.style.width = `${nextWidth}px`;
    target.style.height = `${nextHeight}px`;
    const animDiv = target.firstElementChild?.firstElementChild as HTMLDivElement | null;
    if (animDiv) {
      animDiv.style.width = `${nextWidth}px`;
      animDiv.style.height = `${nextHeight}px`;
    }
    // FIXED: Sync Zustand live so property panel is always up to date.
    setState({
      trackItemsMap: {
        [id]: {
          ...trackItemsMap[id],
          details: { ...trackItemsMap[id].details, width: nextWidth, height: nextHeight },
        },
      },
    });
  };

  // FIXED: onResizeEnd commits the authoritative value to the central editor state.
  const handleResizeEnd = ({ target }: { target: HTMLElement }) => {
    const targetId = getIdFromClassName(target.className) as string;
    if (!targetId || !trackItemsMap[targetId]) return;
    const type = trackItemsMap[targetId].type;

    if (type === "text" || type === "caption") {
      const selector = type === "text" ? `[data-text-id="${targetId}"]` : `#caption-${targetId}`;
      const textDiv = document.querySelector(selector) as HTMLDivElement;
      if (textDiv) {
        dispatch(EDIT_OBJECT, {
          payload: {
            [targetId]: {
              details: {
                ...trackItemsMap[targetId].details,
                width: parseFloat(target.style.width),
                height: parseFloat(target.style.height),
                fontSize: parseFloat(textDiv.style.fontSize),
              },
            },
          },
        });
      }
    } else if (type === "progressSquare") {
      const currentLeft = parseFloat(target.style.left);
      dispatch(EDIT_OBJECT, {
        payload: {
          [targetId]: {
            details: {
              ...trackItemsMap[targetId].details,
              width: parseFloat(target.style.width),
              height: parseFloat(target.style.height),
              left: isNaN(currentLeft) ? 0 : currentLeft,
            },
          },
        },
      });
    } else {
      dispatch(EDIT_OBJECT, {
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
    }
  };

  // ─── GROUP DRAG ───────────────────────────────────────────────────────────────
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
    dispatch(EDIT_OBJECT, { payload });
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
