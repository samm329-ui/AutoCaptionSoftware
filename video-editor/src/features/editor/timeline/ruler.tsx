import { useCallback, useEffect, useRef, useState } from "react";

import {
  PREVIEW_FRAME_WIDTH,
  SECONDARY_FONT,
  SMALL_FONT_SIZE,
  TIMELINE_OFFSET_CANVAS_LEFT
} from "../constants/constants";
import { formatTimelineUnit } from "../utils/format";
import { debounce } from "lodash";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";

// ENGINE MIGRATION: Import engine hooks
import { useEngineZoom, useTimelineDuration } from "../engine/engine-provider";
import { zoomToPixelsPerMs, pxToMs } from "../engine/time-scale";

interface RulerProps {
  height?: number;
  longLineSize?: number;
  shortLineSize?: number;
  offsetX?: number;
  textOffsetY?: number;
  scrollLeft?: number;
  textFormat?: (scale: number) => string;
  onClick?: (pixels: number) => void;
  onScroll?: (scrollLeft: number) => void;
}

const Ruler = (props: RulerProps) => {
  const timelineOffsetX = useTimelineOffsetX();
  const {
    height = 40, // Increased height to give space for the text
    longLineSize = 8,
    shortLineSize = 10,
    offsetX = timelineOffsetX + TIMELINE_OFFSET_CANVAS_LEFT,
    textOffsetY = 17, // Place the text above the lines but inside the canvas
    textFormat = formatTimelineUnit,
    scrollLeft = 0,
    onClick,
    onScroll
  } = props;
  
  // ENGINE: Get zoom and duration
  const engineZoom = useEngineZoom();
  const timelineDuration = useTimelineDuration();
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasContext, setCanvasContext] =
    useState<CanvasRenderingContext2D | null>(null);
  const [canvasSize, setCanvasSize] = useState({
    width: 0,
    height: height // Increased height for text space
  });

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const dragRef = useRef({
    startX: 0,
    startScrollPos: 0,
    isDragging: false,
    hasDragged: false
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d");
      setCanvasContext(context);
      resize(canvas, context, scrollLeft);
    }
  }, [timelineOffsetX]);

  const handleResize = useCallback(() => {
    resize(canvasRef.current, canvasContext, scrollLeft);
  }, [canvasContext, scrollLeft, timelineOffsetX]);

  useEffect(() => {
    const resizeHandler = debounce(handleResize, 200);
    window.addEventListener("resize", resizeHandler);

    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, [handleResize]);

  useEffect(() => {
    if (canvasContext) {
      resize(canvasRef.current, canvasContext, scrollLeft);
    }
  }, [canvasContext, scrollLeft, engineZoom, timelineDuration]);

  const resize = (
    canvas: HTMLCanvasElement | null,
    context: CanvasRenderingContext2D | null,
    scrollLeft: number
  ) => {
    if (!canvas || !context) return;

    const offsetParent = canvas.offsetParent as HTMLDivElement;
    const width = offsetParent?.offsetWidth ?? canvas.offsetWidth;
    const height = canvasSize.height;

    canvas.width = width;
    canvas.height = height;

    draw(context, scrollLeft, width, height);
    setCanvasSize({ width, height });
  };

  const draw = (
    context: CanvasRenderingContext2D,
    scrollLeft: number,
    width: number,
    height: number
  ) => {
    // Use shared time scale conversion
    const zoom = engineZoom > 0 ? engineZoom : 0.1;
    const pixelsPerMs = zoomToPixelsPerMs(zoom);
    
    context.clearRect(0, 0, width, height);
    context.save();
    context.strokeStyle = "#71717a";
    context.fillStyle = "#71717a";
    context.lineWidth = 1;
    context.font = `${SMALL_FONT_SIZE}px ${SECONDARY_FONT}`;
    context.textBaseline = "top";

    context.translate(0.5, 0);
    context.beginPath();

    // Draw based on timelineDuration (clips end + buffer)
    const totalMs = timelineDuration;
    const totalPixels = totalMs * pixelsPerMs;
    
    // Draw marks every second (1000ms)
    const secondMarks = Math.ceil(totalMs / 1000);
    
    for (let i = 0; i <= secondMarks; i++) {
      const timeMs = i * 1000;
      const pos = timeMs * pixelsPerMs - scrollLeft;
      
      if (pos < -50 || pos > width + 50) continue;
      
      // Draw second number
      const text = `${i}s`;
      const textWidth = context.measureText(text).width;
      context.fillText(text, pos - textWidth/2, 2);
      
      // Draw line
      context.strokeStyle = "#71717a";
      context.beginPath();
      context.moveTo(pos, 18);
      context.lineTo(pos, 28);
      context.stroke();
    }

    context.restore();
    setCanvasSize({ width, height });
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;

    setIsDragging(true);
    setHasDragged(false);

    // Update ref state
    dragRef.current = {
      startX: clickX,
      startScrollPos: scrollLeft,
      isDragging: true,
      hasDragged: false
    };

    // Prevent text selection during drag
    event.preventDefault();
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const touchX = touch.clientX - rect.left;

    setIsDragging(true);
    setHasDragged(false);

    // Update ref state
    dragRef.current = {
      startX: touchX,
      startScrollPos: scrollLeft,
      isDragging: true,
      hasDragged: false
    };

    // Prevent default touch behavior
    event.preventDefault();
  };

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!dragRef.current.isDragging) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const currentX = event.clientX - rect.left;
      const deltaX = Math.abs(dragRef.current.startX - currentX);

      // Only start dragging if we've moved more than 5 pixels
      if (deltaX > 5) {
        dragRef.current.hasDragged = true;
        setHasDragged(true);

        const newScrollLeft = Math.max(
          0,
          dragRef.current.startScrollPos + (dragRef.current.startX - currentX)
        );

        onScroll?.(newScrollLeft);
      }
    },
    [onScroll]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLCanvasElement>) => {
      if (!dragRef.current.isDragging) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const touch = event.touches[0];
      const currentX = touch.clientX - rect.left;
      const deltaX = Math.abs(dragRef.current.startX - currentX);

      // Only start dragging if we've moved more than 5 pixels
      if (deltaX > 5) {
        dragRef.current.hasDragged = true;
        setHasDragged(true);

        const newScrollLeft = Math.max(
          0,
          dragRef.current.startScrollPos + (dragRef.current.startX - currentX)
        );

        onScroll?.(newScrollLeft);
      }
    },
    [onScroll]
  );

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      dragRef.current.hasDragged = false;
      setIsDragging(false);
      setHasDragged(false);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      dragRef.current.hasDragged = false;
      setIsDragging(false);
      setHasDragged(false);
    }
  }, []);

  const handleLocalMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Check if we dragged before resetting state
    const wasDragging = dragRef.current.isDragging;
    const hadDragged = dragRef.current.hasDragged;

    // Always reset drag state on local mouse up
    if (wasDragging) {
      dragRef.current.isDragging = false;
      dragRef.current.hasDragged = false;
      setIsDragging(false);
      setHasDragged(false);
    }

    // Only handle click if we haven't dragged at all
    if (!hadDragged) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Get the bounding box of the canvas to calculate the relative click position
      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;

      // Calculate total x position, including scrollLeft
      const totalX =
        clickX + scrollLeft - timelineOffsetX - TIMELINE_OFFSET_CANVAS_LEFT;

      onClick?.(totalX);
    } else {
      console.log("Ruler drag ended - no click action");
    }
  };

  const handleLocalTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    // Check if we dragged before resetting state
    const wasDragging = dragRef.current.isDragging;
    const hadDragged = dragRef.current.hasDragged;

    // Always reset drag state on local touch end
    if (wasDragging) {
      dragRef.current.isDragging = false;
      dragRef.current.hasDragged = false;
      setIsDragging(false);
      setHasDragged(false);
    }

    // Only handle tap if we haven't dragged at all
    if (!hadDragged) {
      console.log("Ruler tap - seeking to position");
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Get the bounding box of the canvas to calculate the relative touch position
      const rect = canvas.getBoundingClientRect();
      const touch = event.changedTouches[0];
      const touchX = touch.clientX - rect.left;

      // Calculate total x position, including scrollLeft
      const totalX =
        touchX + scrollLeft - timelineOffsetX - TIMELINE_OFFSET_CANVAS_LEFT;

      onClick?.(totalX);
    } else {
    }
  };

  // Add global mouse and touch event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove as any, {
        passive: false
      });
      document.addEventListener("touchend", handleTouchEnd);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove as any);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [
    isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd
  ]);

  return (
    <div
      className="border-t border-border"
      style={{
        position: "relative",
        width: "100%",
        height: `${canvasSize.height}px`
      }}
    >
      <canvas
        onMouseDown={handleMouseDown}
        onMouseUp={handleLocalMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleLocalTouchEnd}
        ref={canvasRef}
        height={canvasSize.height}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          width: "100%",
          display: "block",
          touchAction: "none" // Prevent default touch behaviors
        }}
      />
    </div>
  );
};

export default Ruler;
