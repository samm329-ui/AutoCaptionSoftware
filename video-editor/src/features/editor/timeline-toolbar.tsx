"use client";

import { useState, useEffect } from "react";
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
import { getCurrentTime } from "./utils/time";
import useStore from "./store/use-store";

const ACTIVE_SPLIT = "ACTIVE_SPLIT";
const LAYER_DELETE = "LAYER_DELETE";
const TIMELINE_SCALE_CHANGED = "TIMELINE_SCALE_CHANGED";
const ADD_TEXT = "ADD_TEXT";

const dispatch = (key: string, payload: { payload?: unknown; options?: unknown }) => {
  console.log("dispatch", key, payload);
};

const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

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

interface ToolButtonProps {
  id: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

const tools: ToolButtonProps[] = [
  { id: "select", icon: <MousePointer2 className="w-3.5 h-3.5" />, label: "Selection", shortcut: "V" },
  { id: "cut", icon: <Scissors className="w-3.5 h-3.5" />, label: "Cut", shortcut: "C" },
  { id: "rippleEdit", icon: <ArrowRightLeft className="w-3.5 h-3.5" />, label: "Ripple Edit", shortcut: "B" },
  { id: "trackSelect", icon: <List className="w-3.5 h-3.5" />, label: "Track Select", shortcut: "A" },
  { id: "slip", icon: <MoveHorizontal className="w-3.5 h-3.5" />, label: "Slip", shortcut: "Y" },
  { id: "pen", icon: <Pen className="w-3.5 h-3.5" />, label: "Pen", shortcut: "P" },
  { id: "rectangle", icon: <Square className="w-3.5 h-3.5" />, label: "Rectangle", shortcut: "R" },
  { id: "hand", icon: <Hand className="w-3.5 h-3.5" />, label: "Hand", shortcut: "H" },
  { id: "text", icon: <Type className="w-3.5 h-3.5" />, label: "Text", shortcut: "T" },
];

interface TimelineToolbarProps {
  onToolChange?: (tool: ToolType) => void;
  className?: string;
}

export function TimelineToolbar({ onToolChange, className }: TimelineToolbarProps) {
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const { scale, activeIds } = useStore();

  const doSplit = () => {
    dispatch(ACTIVE_SPLIT, {
      payload: {},
      options: { time: getCurrentTime() }
    });
  };

  const doAddText = () => {
    dispatch(ADD_TEXT, {
      payload: {
        id: generateId(),
        type: "text",
        name: "Text",
        details: { text: "New Text" },
      },
      options: {},
    });
  };

  const doDelete = () => {
    if (activeIds.length > 0) {
      dispatch(LAYER_DELETE);
    }
  };

  const handleZoom = (direction: "in" | "out") => {
    const newIndex = direction === "in" 
      ? Math.min(scale.index + 1, 20) 
      : Math.max(scale.index - 1, 0);
    
    dispatch(TIMELINE_SCALE_CHANGED, {
      payload: { scale: { ...scale, index: newIndex } }
    });
  };

  const handleToolClick = (toolId: ToolType) => {
    setActiveTool(toolId);
    onToolChange?.(toolId);
    
    if (toolId === "cut" && activeIds.length > 0) {
      doSplit();
    } else if (toolId === "text") {
      doAddText();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      switch (key) {
        case "v": setActiveTool("select"); onToolChange?.("select"); break;
        case "c": doSplit(); break;
        case "b": setActiveTool("rippleEdit"); onToolChange?.("rippleEdit"); break;
        case "a": setActiveTool("trackSelect"); onToolChange?.("trackSelect"); break;
        case "y": setActiveTool("slip"); onToolChange?.("slip"); break;
        case "p": setActiveTool("pen"); onToolChange?.("pen"); break;
        case "r": setActiveTool("rectangle"); onToolChange?.("rectangle"); break;
        case "h": setActiveTool("hand"); onToolChange?.("hand"); break;
        case "t": doAddText(); break;
        case "delete":
        case "backspace": doDelete(); break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIds, onToolChange, scale]);

  return (
    <div className={cn("flex bg-card border-r border-border/80 h-full overflow-hidden", className)}>
      <div className="flex flex-col items-center py-2 px-0.5 gap-0.5 flex-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={cn(
              "flex items-center justify-center flex-none h-7.5 w-7.5 cursor-pointer rounded-sm transition-all duration-200",
              activeTool === tool.id ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
            )}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
          >
            {tool.icon}
          </button>
        ))}
      </div>
      
      <div className="flex flex-col items-center py-2 px-0.5 gap-0.5 border-l">
        <button
          onClick={() => handleZoom("in")}
          className="flex items-center justify-center flex-none h-7.5 w-7.5 cursor-pointer rounded-sm transition-all duration-200 text-muted-foreground hover:bg-white/5 hover:text-white"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="flex items-center justify-center flex-none h-7.5 w-7.5 cursor-pointer rounded-sm transition-all duration-200 text-muted-foreground hover:bg-white/5 hover:text-white"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default TimelineToolbar;
