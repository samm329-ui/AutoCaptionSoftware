"use client";

import { useState, useEffect, useCallback } from "react";
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
  Trash2,
} from "lucide-react";
import { getCurrentTime } from "./utils/time";
import { useEngineSelection, useEngineDispatch } from "./engine/engine-provider";
import { deleteClips, splitClip, cloneClip } from "./engine/commands";
import { createTrack, type Clip } from "./engine/engine-core";
import { addTrack, addClip, selectClip } from "./engine/commands";
import { selectOrderedTracks } from "./engine/selectors";
import { engineStore } from "./engine/engine-core";
import { nanoid } from "./engine/engine-core";

const ACTIVE_SPLIT = "ACTIVE_SPLIT";
const LAYER_DELETE = "LAYER_DELETE";
const TIMELINE_SCALE_CHANGED = "TIMELINE_SCALE_CHANGED";
const ADD_TEXT = "ADD_TEXT";

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

export { TimelineToolbar as default };
export function TimelineToolbar({ onToolChange, className }: TimelineToolbarProps) {
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const engineSelection = useEngineSelection();
  const engineDispatch = useEngineDispatch();

  const safeSelection = engineSelection ?? [];
  const selectionLength = safeSelection.length;

  const doSplit = useCallback(() => {
    if (selectionLength === 0) return;
    const clipId = safeSelection[0];
    const currentTime = getCurrentTime();
    engineDispatch(splitClip(clipId, currentTime));
  }, [selectionLength, safeSelection, engineDispatch]);

  const doDelete = useCallback(() => {
    if (selectionLength === 0) return;
    engineDispatch(deleteClips(safeSelection));
  }, [selectionLength, safeSelection, engineDispatch]);

  const doAddText = useCallback(() => {
    const state = engineStore.getState();
    const ordered = selectOrderedTracks(state);
    let track = ordered.find(t => t.type === "text");
    if (!track) {
      track = createTrack("text", { order: ordered.length });
      engineDispatch(addTrack(track));
    }
    const trackClips = Object.values(engineStore.getState().clips).filter(c => c?.trackId === track!.id);
    const startMs = trackClips.reduce((max, c) => Math.max(max, c ? c.display.to : 0), 0);
    const clipId = nanoid();
    const clip: Clip = {
      id: clipId, trackId: track.id, type: "text", name: "Text",
      display: { from: startMs, to: startMs + 5000 },
      trim: { from: 0, to: 5000 },
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, opacity: 1, flipX: false, flipY: false },
      details: { text: "New Text", fontSize: 80, color: "#ffffff", fontFamily: "Inter", textAlign: "center" },
      appliedEffects: [], effectIds: [], keyframeIds: [],
    };
    engineDispatch(addClip(clip, track.id));
    engineDispatch(selectClip(clipId));
  }, [engineDispatch]);

  const handleToolClick = (toolId: ToolType) => {
    setActiveTool(toolId);
    onToolChange?.(toolId);
    
    if (toolId === "cut" && selectionLength > 0) {
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
  }, [onToolChange, doSplit, doDelete, doAddText]);

  return (
    <div className={cn("flex bg-card border-r border-border/80 h-full overflow-hidden", className)}>
      <div className="flex flex-col items-center py-2 px-0.5 gap-0.5 flex-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded transition-colors",
              activeTool === tool.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
          >
            {tool.icon}
          </button>
        ))}
        
        <div className="w-6 h-px bg-border my-1" />
        
        <button
          onClick={doDelete}
          disabled={selectionLength === 0}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded transition-colors",
            selectionLength > 0
              ? "text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
              : "text-muted-foreground/30 cursor-not-allowed"
          )}
          title="Delete (Del)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}