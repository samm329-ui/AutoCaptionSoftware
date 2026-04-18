import { useEffect, useRef, useState, useMemo } from "react";
import { useEngineSelector, useEngineDispatch } from "../engine/engine-provider";
import { selectAllClips, selectDuration, selectNaturalEndMs } from "../engine/selectors";
import { zoomToPixelsPerMs, pxToMs, msToFrame } from "../engine/time-scale";
import { setPlayhead, seekPlayer } from "../engine/commands";

interface RulerProps {
  scrollLeft?: number;
  onScroll?: (scrollLeft: number) => void;
}

const RULER_OFFSET = 120;

const Ruler = ({ scrollLeft = 0, onScroll }: RulerProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 40 });
  
  const engineDispatch = useEngineDispatch();
  const clips = useEngineSelector(selectAllClips);
  const sequenceDuration = useEngineSelector(selectDuration);
  const naturalEndMs = useEngineSelector(selectNaturalEndMs);
  const zoomState = useEngineSelector((state) => state.ui?.zoom ?? 0.1);
  const fpsState = useEngineSelector((state) => {
    const rootSeqId = state.rootSequenceId;
    const seq = rootSeqId ? state.sequences[rootSeqId] : null;
    return seq?.fps ?? 30;
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, startScrollLeft: 0 });

  const timelineDurationMs = naturalEndMs > 0 ? naturalEndMs : sequenceDuration;

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: 40 });
      }
    };
    
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const fps = fpsState > 0 ? fpsState : 30;
    const zoom = zoomState > 0 ? zoomState : 0.1;
    const pixelsPerMs = zoomToPixelsPerMs(zoom);
    const pixelsPerSecond = pixelsPerMs * 1000;
    
    const totalSeconds = timelineDurationMs / 1000;
    
    const canvasWidth = Math.max(dimensions.width - RULER_OFFSET, 100);
    const canvasHeight = dimensions.height;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();
    
    ctx.fillStyle = "#71717a";
    ctx.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textBaseline = "top";
    
    let majorInterval = 1;
    let mediumInterval = 0.5;
    let minorInterval = 0.1;
    
    if (pixelsPerSecond < 20) {
      majorInterval = 10;
      mediumInterval = 5;
      minorInterval = 1;
    } else if (pixelsPerSecond < 50) {
      majorInterval = 5;
      mediumInterval = 1;
      minorInterval = 0.5;
    } else if (pixelsPerSecond < 100) {
      majorInterval = 2;
      mediumInterval = 1;
      minorInterval = 0.5;
    } else if (pixelsPerSecond < 200) {
      majorInterval = 1;
      mediumInterval = 0.5;
      minorInterval = 0.1;
    } else {
      majorInterval = 0.5;
      mediumInterval = 0.25;
      minorInterval = 0.1;
    }
    
    for (let i = 0; i <= totalSeconds * 100; i++) {
      const seconds = i / 100;
      if (seconds > totalSeconds) break;
      
      const x = seconds * pixelsPerSecond - scrollLeft;
      
      if (x < -10 || x > canvasWidth + 10) continue;
      
      const isMajor = seconds >= 1 && Math.abs(seconds % majorInterval) < 0.005;
      const isMedium = Math.abs(seconds % mediumInterval) < 0.005;
      
      if (isMajor) {
        const label = `${Math.floor(seconds)}s`;
        ctx.fillStyle = "#a1a1aa";
        ctx.fillText(label, x + 4, 2);
        
        ctx.strokeStyle = "#71717a";
        ctx.beginPath();
        ctx.moveTo(x, 16);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      } else if (isMedium) {
        ctx.strokeStyle = "#52525b";
        ctx.beginPath();
        ctx.moveTo(x, 22);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      } else {
        ctx.strokeStyle = "#3f3f46";
        ctx.beginPath();
        ctx.moveTo(x, 28);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }, [fpsState, zoomState, scrollLeft, timelineDurationMs, dimensions.width, dimensions.height, clips]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const clickPosition = x + scrollLeft;
    
    if (clickPosition < 0) return;
    
    const zoom = zoomState > 0 ? zoomState : 0.1;
    const pixelsPerMs = zoomToPixelsPerMs(zoom);
    const timeMs = pxToMs(clickPosition, pixelsPerMs);
    const frame = msToFrame(timeMs, fpsState);
    
    engineDispatch(setPlayhead(timeMs));
    seekPlayer(frame);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, startScrollLeft: scrollLeft };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const newScrollLeft = Math.max(0, dragStartRef.current.startScrollLeft - deltaX);
    onScroll?.(newScrollLeft);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, onScroll]);

  return (
    <div
      ref={containerRef}
      className="border-t border-border bg-background"
      style={{
        width: "100%",
        height: "40px",
        cursor: isDragging ? "grabbing" : "pointer",
        paddingLeft: `${RULER_OFFSET}px`,
        boxSizing: "border-box"
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
};

export default Ruler;