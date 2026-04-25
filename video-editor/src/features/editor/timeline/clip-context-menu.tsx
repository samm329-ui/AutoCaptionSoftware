"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Scissors, Copy, Clipboard, Trash2, Play, Film, 
  Clock, Link2, Layers, Unlink, Merge, FolderOpen,
  Eye, EyeOff, Lock, Unlock, Volume2, VolumeX,
  Move, FastForward, Layers2
} from "lucide-react";

interface ClipContextMenuProps {
  x: number;
  y: number;
  clipId: string;
  clipName: string;
  clipType: string;
  isEnabled: boolean;
  isLocked: boolean;
  onClose: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onClear: () => void;
  onRippleDelete: () => void;
  onToggleEnable: () => void;
  onRename: () => void;
  onSpeedDuration: () => void;
  onNest: () => void;
  onLabel: (color: string) => void;
  onScaleToFrame: () => void;
  onFitToFrame: () => void;
}

export default function ClipContextMenu({
  x,
  y,
  clipId,
  clipName,
  clipType,
  isEnabled,
  isLocked,
  onClose,
  onCut,
  onCopy,
  onPaste,
  onClear,
  onRippleDelete,
  onToggleEnable,
  onRename,
  onSpeedDuration,
  onNest,
  onLabel,
  onScaleToFrame,
  onFitToFrame,
}: ClipContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Adjust position - show at click point
  const adjustedX = Math.min(x, window.innerWidth - 230);
  const adjustedY = y;

  const menuItems: MenuItem[] = [
    { label: "Cut", icon: Scissors, onClick: onCut },
    { label: "Copy", icon: Copy, onClick: onCopy },
    { label: "Paste", icon: Clipboard, onClick: onPaste },
    { label: "Paste Attributes...", icon: Clipboard, disabled: true },
    { separator: true },
    { label: "Remove Attributes...", disabled: true },
    { label: "Clear", icon: Trash2, onClick: onClear },
    { label: "Ripple Delete", icon: Move, onClick: onRippleDelete },
    { separator: true },
    { label: "Edit Original", icon: Film, disabled: true },
    { label: "Edit in Adobe Photoshop", disabled: clipType !== "image" },
    { separator: true },
    { label: "Replace With Clip >", disabled: true, submenu: [] },
    { label: "Render and Replace...", disabled: true },
    { label: "Restore Unrendered", disabled: true },
    { label: "Restore Captions from Source Clip", disabled: true },
    { separator: true },
    { label: "Export As Motion Graphics Template...", disabled: true },
    { label: "Generative Extend >", disabled: true, submenu: [] },
    { separator: true },
    { 
      label: "Enable", 
      icon: isEnabled ? Eye : EyeOff, 
      checked: isEnabled,
      onClick: onToggleEnable 
    },
    { label: "Link", icon: Link2, disabled: true },
    { label: "Group", icon: Layers, disabled: true },
    { label: "Ungroup", icon: Unlink, disabled: true },
    { separator: true },
    { label: "Synchronize", disabled: true },
    { label: "Merge Clips...", icon: Merge, disabled: true },
    { label: "Nest...", icon: Layers2, onClick: onNest },
    { label: "Make Subsequence", disabled: true },
    { separator: true },
    { 
      label: "Label >", 
      submenu: [
        { label: "Aqua", onClick: () => onLabel("aqua") },
        { label: "Blue", onClick: () => onLabel("blue") },
        { label: "Cyan", onClick: () => onLabel("cyan") },
        { label: "Green", onClick: () => onLabel("green") },
        { label: "Magenta", onClick: () => onLabel("magenta") },
        { label: "Olive", onClick: () => onLabel("olive") },
        { label: "Orange", onClick: () => onLabel("orange") },
        { label: "Purple", onClick: () => onLabel("purple") },
        { label: "Red", onClick: () => onLabel("red") },
        { label: "Rose", onClick: () => onLabel("rose") },
        { label: "Sky Blue", onClick: () => onLabel("sky") },
        { label: "Tan", onClick: () => onLabel("tan") },
        { label: "Yellow", onClick: () => onLabel("yellow") },
      ] 
    },
    { separator: true },
    { label: "Speed/Duration...", icon: Clock, onClick: onSpeedDuration },
    { label: "Scene Edit Detection...", disabled: true },
    { label: "Frame Hold Options...", disabled: true },
    { label: "Add Frame Hold", disabled: true },
    { label: "Insert Frame Hold Segment", disabled: true },
    { separator: true },
    { label: "Field Options...", disabled: true },
    { label: "Time Interpolation >", disabled: true, submenu: [] },
    { separator: true },
    { label: "Scale to Frame Size", onClick: onScaleToFrame },
    { label: "Fit to Frame", onClick: onFitToFrame },
    { label: "Fill Frame", disabled: true },
    { label: "Adjustment Layer", disabled: true },
    { separator: true },
    { label: "Rename...", onClick: onRename },
    { label: "Reveal in Project", icon: FolderOpen, disabled: true },
  ];

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.separator) {
      return <div key={index} className="h-px bg-border/50 my-1" />;
    }

    const Icon = item.icon;
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isActive = activeSubmenu === item.label;

    return (
      <button
        key={item.label}
        onClick={() => {
          if (!item.disabled && item.onClick) {
            item.onClick();
            onClose();
          }
        }}
        onMouseEnter={() => hasSubmenu && setActiveSubmenu(item.label)}
        className={cn(
          "w-full px-2 py-1 flex items-center justify-between text-xs transition-colors",
          item.disabled 
            ? "opacity-40 cursor-not-allowed" 
            : "hover:bg-white/5"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="w-4">{item.checked !== undefined && item.checked && "✓ "}</span>
          {Icon && <Icon className="w-3 h-3 text-muted-foreground" />}
          <span className={item.checked ? "font-medium" : ""}>{item.label}</span>
        </div>
        {hasSubmenu && <span className="text-muted-foreground">▶</span>}
      </button>
    );
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[100] min-w-[220px] max-h-[70vh] bg-sidebar border border-border rounded-md shadow-xl",
        "py-1 overflow-y-auto scrollbar-thin animate-in fade-in slide-in-from-top-1 duration-100"
      )}
      style={{ left: adjustedX, top: adjustedY }}
    >
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
      `}</style>
      {menuItems.map((item, index) => renderMenuItem(item, index))}
    </div>
  );
}