"use client";

import { useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  MousePointer2,
  Scissors,
  ArrowRightLeft,
  List,
  Pen,
  Square,
  Hand,
  Type,
  Trash2,
} from "lucide-react";
import { useEngineDispatch, useEngineSelector } from "./engine/engine-provider";
import { deleteClips, splitClip, setTool as setToolCommand } from "./engine/commands";
import { createTrack, type Clip } from "./engine/engine-core";
import { addTrack, addClip, selectClip } from "./engine/commands";
import { selectOrderedTracks, selectAllClips, selectTrackClips, selectPlayheadTime, selectScroll } from "./engine/selectors";
import { engineStore } from "./engine/engine-core";
import { nanoid } from "./engine/engine-core";

export type EditorTool = 
  | "select" 
  | "trackSelect" 
  | "rippleEdit" 
  | "razor" 
  | "pen" 
  | "rectangle" 
  | "hand" 
  | "text";

interface ToolButtonProps {
  id: EditorTool;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

const tools: ToolButtonProps[] = [
  { id: "select", icon: <MousePointer2 className="w-3 h-3" />, label: "Selection Tool", shortcut: "V" },
  { id: "trackSelect", icon: <List className="w-3 h-3" />, label: "Track Select Forward", shortcut: "A" },
  { id: "rippleEdit", icon: <ArrowRightLeft className="w-3 h-3" />, label: "Ripple Edit Tool", shortcut: "B" },
  { id: "razor", icon: <Scissors className="w-3 h-3" />, label: "Razor Tool", shortcut: "C" },
  { id: "pen", icon: <Pen className="w-3 h-3" />, label: "Pen Tool", shortcut: "P" },
  { id: "rectangle", icon: <Square className="w-3 h-3" />, label: "Rectangle Tool", shortcut: "R" },
  { id: "hand", icon: <Hand className="w-3 h-3" />, label: "Hand Tool", shortcut: "H" },
  { id: "text", icon: <Type className="w-3 h-3" />, label: "Text Tool", shortcut: "T" },
];

const toolRows = [
  tools.slice(0, 4),
  tools.slice(4, 8),
];

interface EditingToolbarProps {
  className?: string;
}

export function EditingToolbar({ className }: EditingToolbarProps) {
  const engineDispatch = useEngineDispatch();
  const activeTool = useEngineSelector((state) => state.ui?.activeTool ?? "select");
  const selection = useEngineSelector((state) => state.ui?.selection ?? []);
  const playheadTime = useEngineSelector((state) => state.ui?.playheadTime ?? 0);

  const setTool = useCallback((tool: EditorTool) => {
    engineDispatch(setToolCommand(tool));
  }, [engineDispatch]);

  const selectionLength = selection.length;

  const doSplit = useCallback(() => {
    if (selectionLength === 0) return;
    const clipId = selection[0];
    engineDispatch(splitClip(clipId, playheadTime));
  }, [selectionLength, selection, playheadTime, engineDispatch]);

  const doDelete = useCallback(() => {
    if (selectionLength === 0) return;
    engineDispatch(deleteClips(selection));
  }, [selectionLength, selection, engineDispatch]);

  const doAddText = useCallback(() => {
    const state = engineStore.getState();
    const ordered = selectOrderedTracks(state);
    const textTracks = ordered.filter(t => t.type === "text");
    
    let track;
    let startMs = 0;
    
    if (textTracks.length > 0) {
      let bestTrack = textTracks[0];
      let maxEndMs = 0;
      
      for (const t of textTracks) {
        const trackClips = Object.values(state.clips).filter(c => c?.trackId === t.id);
        if (trackClips.length > 0) {
          const lastEnd = Math.max(...trackClips.map(c => c.display.to));
          if (lastEnd > maxEndMs) {
            maxEndMs = lastEnd;
            bestTrack = t;
          }
        } else if (maxEndMs === 0) {
          bestTrack = t;
        }
      }
      
      track = bestTrack;
      const trackClips = Object.values(state.clips).filter(c => c?.trackId === track!.id);
      startMs = trackClips.length > 0 ? Math.max(...trackClips.map(c => c.display.to)) : 0;
    } else {
      track = createTrack("text", { name: "T1", order: ordered.length });
      engineDispatch(addTrack(track));
    }
    
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

  const handleToolClick = useCallback((toolId: EditorTool) => {
    setTool(toolId);
    
    if (toolId === "razor" && selectionLength > 0) {
      doSplit();
    } else if (toolId === "text") {
      doAddText();
    }
  }, [setTool, selectionLength, doSplit, doAddText]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = e.key.toLowerCase();
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      
      if (!ctrlOrCmd) {
        switch (key) {
          case "v": setTool("select"); break;
          case "a": setTool("trackSelect"); break;
          case "b": setTool("rippleEdit"); break;
          case "c": 
            if (selectionLength > 0) doSplit();
            break;
          case "p": setTool("pen"); break;
          case "r": setTool("rectangle"); break;
          case "h": setTool("hand"); break;
          case "t": doAddText(); break;
          case "delete":
          case "backspace": 
            if (selectionLength > 0) doDelete(); 
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool, selectionLength, doSplit, doDelete, doAddText]);

return (
    <div className={cn("flex flex-col py-1 px-0.5 bg-card border-r border-border/80 w-10 flex-none", className)}>
      <div className="flex flex-col justify-evenly h-full">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={cn(
              "w-5 h-5 mx-auto flex items-center justify-center rounded-md transition-all duration-150",
              activeTool === tool.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export default EditingToolbar;