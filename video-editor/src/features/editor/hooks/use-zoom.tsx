import { useCallback, useEffect, useRef, useState } from "react";

interface ISize {
  width: number;
  height: number;
}

function useZoom(containerRef: React.RefObject<HTMLDivElement>, size: ISize) {
  const [zoom, setZoom] = useState(0.5); // Start with a reasonable default
  const currentZoomRef = useRef(0.5);

  const calculateZoom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const PADDING = 40;
    const containerHeight = container.clientHeight - PADDING;
    const containerWidth = container.clientWidth - PADDING;
    const { width, height } = size;

    if (width <= 0 || height <= 0) {
      console.log("Zoom: invalid size", width, height);
      return;
    }

    const widthRatio = containerWidth / width;
    const heightRatio = containerHeight / height;
    const desiredZoom = Math.min(widthRatio, heightRatio, 1);
    
    // Ensure minimum useful zoom
    const finalZoom = Math.max(0.1, Math.min(desiredZoom, 1));
    console.log("Zoom calculated:", finalZoom, "for canvas:", width, "x", height, "container:", containerWidth, "x", containerHeight);
    currentZoomRef.current = finalZoom;
    setZoom(finalZoom);
  }, [containerRef, size]);

  // Calculate zoom when size changes
  useEffect(() => {
    if (size?.width > 0 && size?.height > 0) {
      // Small delay to ensure container is rendered
      const timer = setTimeout(calculateZoom, 50);
      return () => clearTimeout(timer);
    }
  }, [size, calculateZoom]);

  // Listen for resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(calculateZoom);
    });

    resizeObserver.observe(container);

    const handleWindowResize = () => {
      requestAnimationFrame(calculateZoom);
    };

    window.addEventListener("resize", handleWindowResize);

    // Calculate initial zoom with delay
    const initialTimer = setTimeout(calculateZoom, 100);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      clearTimeout(initialTimer);
    };
  }, [containerRef, calculateZoom]);

  const handlePinch = useCallback((e: any) => {
    const deltaY = (e as any).inputEvent?.deltaY;
    if (deltaY === undefined) return;
    const changer = deltaY > 0 ? 0.0085 : -0.0085;
    const currentZoom = currentZoomRef.current;
    const newZoom = currentZoom + changer;
    if (newZoom >= 0.1 && newZoom <= 5) {
      currentZoomRef.current = newZoom;
      setZoom(newZoom);
    }
  }, []);

  return { zoom, handlePinch, recalculateZoom: calculateZoom };
}

export default useZoom;
