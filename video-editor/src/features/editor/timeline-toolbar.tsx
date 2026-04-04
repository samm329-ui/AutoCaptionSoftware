"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  MousePointer2,
  Scissors,
  ArrowRightLeft,
  List,
  MoveHorizontal,
  Pen,
  Square,
  Hand,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export type ToolType =
  | "select"
  | "cut"
  | "rippleEdit"
  | "trackSelect"
  | "slip"
  | "pen"
  | "rectangle"
  | "hand"
  | "text"
  | "zoomIn"
  | "zoomOut";

interface Tool {
  id: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

const tools: Tool[] = [
  { id: "select", icon: <MousePointer2 className="w-4 h-4" />, label: "Selection Tool", shortcut: "V" },
  { id: "cut", icon: <Scissors className="w-4 h-4" />, label: "Cut Tool", shortcut: "C" },
  { id: "rippleEdit", icon: <ArrowRightLeft className="w-4 h-4" />, label: "Ripple Edit", shortcut: "B" },
  { id: "trackSelect", icon: <List className="w-4 h-4" />, label: "Track Select Forward", shortcut: "A" },
  { id: "slip", icon: <MoveHorizontal className="w-4 h-4" />, label: "Slip Tool", shortcut: "Y" },
  { id: "pen", icon: <Pen className="w-4 h-4" />, label: "Pen Tool", shortcut: "P" },
  { id: "rectangle", icon: <Square className="w-4 h-4" />, label: "Rectangle Tool", shortcut: "R" },
  { id: "hand", icon: <Hand className="w-4 h-4" />, label: "Hand Tool", shortcut: "H" },
  { id: "text", icon: <Type className="w-4 h-4" />, label: "Text Tool", shortcut: "T" },
];

interface TimelineToolbarProps {
  onToolChange?: (tool: ToolType) => void;
  className?: string;
}

export function TimelineToolbar({ onToolChange, className }: TimelineToolbarProps) {
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [showZoomControls, setShowZoomControls] = useState(false);

  const handleToolClick = (toolId: ToolType) => {
    setActiveTool(toolId);
    onToolChange?.(toolId);
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-card border-r border-border/80 h-full",
        className
      )}
    >
      <div className="flex flex-col items-center py-2 gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={cn(
              "flex items-center justify-center flex-none h-9 w-9 cursor-pointer rounded-sm transition-all duration-200",
              activeTool === tool.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-white/5 hover:text-white"
            )}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
          >
            {tool.icon}
          </button>
        ))}
      </div>
      
      <div className="flex-1" />
      
      <div className="flex flex-col items-center py-2 gap-1 border-t">
        <button
          onClick={() => {
            setActiveTool("zoomIn");
            onToolChange?.("zoomIn");
          }}
          className={cn(
            "flex items-center justify-center flex-none h-9 w-9 cursor-pointer rounded-sm transition-all duration-200",
            activeTool === "zoomIn"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-white/5 hover:text-white"
          )}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => {
            setActiveTool("zoomOut");
            onToolChange?.("zoomOut");
          }}
          className={cn(
            "flex items-center justify-center flex-none h-9 w-9 cursor-pointer rounded-sm transition-all duration-200",
            activeTool === "zoomOut"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-white/5 hover:text-white"
          )}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default TimelineToolbar;
