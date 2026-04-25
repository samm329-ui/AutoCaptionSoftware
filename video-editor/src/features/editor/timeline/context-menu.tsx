"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Eye, EyeOff, Volume2, VolumeX } from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddTrack: () => void;
  onDeleteTrack: () => void;
  onToggleAllVideoOutput: () => void;
  onToggleAllAudioOutput: () => void;
}

export default function ContextMenu({
  x,
  y,
  onClose,
  onAddTrack,
  onDeleteTrack,
  onToggleAllVideoOutput,
  onToggleAllAudioOutput,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Adjust position - keep menu above panel borders by showing it above click point
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.max(100, y - 130);

  const menuItems = [
    { label: "Add Track", icon: Plus, onClick: onAddTrack },
    { label: "Delete Track", icon: Trash2, onClick: onDeleteTrack },
    { separator: true },
    { label: "Toggle Video Output", icon: Eye, onClick: onToggleAllVideoOutput },
    { label: "Toggle Audio Output", icon: Volume2, onClick: onToggleAllAudioOutput },
  ];

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[100] min-w-[160px] bg-sidebar border border-border rounded-md shadow-xl",
        "py-1 animate-in fade-in slide-in-from-top-1 duration-100"
      )}
      style={{ left: adjustedX, top: adjustedY }}
    >
      {menuItems.map((item, index) => {
        if (item.separator) {
          return <div key={index} className="h-px bg-border/50 my-1" />;
        }

        const Icon = item.icon!;
        return (
          <button
            key={item.label}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            className={cn(
              "w-full px-2 py-1 flex items-center gap-2 text-xs transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <Icon className="w-3 h-3" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}