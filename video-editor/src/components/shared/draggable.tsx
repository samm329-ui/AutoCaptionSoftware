import React, { useState, cloneElement, ReactElement } from "react";
import { createPortal } from "react-dom";
import { setDragData } from "./drag-data";

interface DraggableProps {
  children: ReactElement;
  shouldDisplayPreview?: boolean;
  renderCustomPreview?: ReactElement;
  data?: Record<string, any>;
}

const Draggable: React.FC<DraggableProps> = ({
  children,
  renderCustomPreview,
  data = {},
  shouldDisplayPreview = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleDragStart = (e: React.DragEvent<HTMLElement>) => {
    setIsDragging(true);
    
    // Store data in module-level ref
    setDragData(data);
    
    // Set effect allowed
    e.dataTransfer.effectAllowed = "move";
    
    // CRITICAL: timeline reads types[0] and tries to JSON.parse it
    // Must ensure text/plain always contains valid JSON
    let jsonString = "{}";
    try {
      if (data && typeof data === 'object') {
        jsonString = JSON.stringify(data);
        // Verify it's valid JSON by parsing it back
        JSON.parse(jsonString);
      }
    } catch (err) {
      console.error('Failed to serialize drag data:', err);
      jsonString = "{}";
    }
    
    e.dataTransfer.setData("text/plain", jsonString);

    setPosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragData(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault(); // Important: allows drop
    if (isDragging) {
      setPosition({
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  // Add dragover event listener to document
  React.useEffect(() => {
    const handleDocumentDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (isDragging) {
        setPosition({
          x: e.clientX,
          y: e.clientY
        });
      }
    };

    if (isDragging) {
      document.addEventListener("dragover", handleDocumentDragOver);
    }

    return () => {
      document.removeEventListener("dragover", handleDocumentDragOver);
    };
  }, [isDragging]);

  const childWithProps = cloneElement(children, {
    draggable: true,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOver: handleDragOver,
    style: {
      ...(children.props as any)?.style
    }
  } as any);

  return (
    <>
      {childWithProps}
      {isDragging && shouldDisplayPreview && renderCustomPreview
        ? createPortal(
            <div
              style={{
                position: "fixed",
                left: position.x,
                top: position.y,
                pointerEvents: "none",
                zIndex: 9999,
                transform: "translate(-50%, -50%)" // Center the preview
              }}
            >
              {renderCustomPreview}
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default Draggable;
