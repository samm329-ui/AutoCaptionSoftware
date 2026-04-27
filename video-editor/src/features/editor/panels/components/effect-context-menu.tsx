/**
 * effect-context-menu.tsx
 * Right-click context menu for effect operations
 */

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Copy, Clipboard, Trash2, Star, Clock } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { AppliedEffect } from "../../data/video-effects";

interface EffectContextMenuProps {
  effect: AppliedEffect;
  clipId: string;
  hasClipboard: boolean;
  clipboardCount: number;
  onCopyEffect: () => void;
  onCopyAllEffects: () => void;
  onPasteEffects: () => void;
  onRemoveEffect: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  children: React.ReactNode;
}

export function EffectContextMenu({
  effect,
  clipId,
  hasClipboard,
  clipboardCount,
  onCopyEffect,
  onCopyAllEffects,
  onPasteEffects,
  onRemoveEffect,
  onToggleFavorite,
  isFavorite,
  children,
}: EffectContextMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {children}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "min-w-[160px] z-50",
            "bg-background border border-border rounded-md shadow-lg",
            "p-1 animate-in fade-in-0 zoom-in-95 duration-100"
          )}
          align="start"
          sideOffset={5}
        >
          {/* Copy Single Effect */}
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
              "cursor-pointer hover:bg-white/5 outline-none",
              "text-muted-foreground hover:text-foreground"
            )}
            onClick={onCopyEffect}
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Effect
            <span className="ml-auto text-[10px] text-muted-foreground/50">
              Ctrl+Shift+C
            </span>
          </DropdownMenu.Item>

          {/* Copy All Effects */}
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
              "cursor-pointer hover:bg-white/5 outline-none",
              "text-muted-foreground hover:text-foreground"
            )}
            onClick={onCopyAllEffects}
          >
            <Copy className="w-3.5 h-3.5" />
            Copy All Effects
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-border/50 my-1" />

          {/* Paste Effects */}
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
              "cursor-pointer hover:bg-white/5 outline-none",
              !hasClipboard && "opacity-50 cursor-not-allowed",
              hasClipboard ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50"
            )}
            onClick={hasClipboard ? onPasteEffects : undefined}
            disabled={!hasClipboard}
          >
            <Clipboard className="w-3.5 h-3.5" />
            Paste Effect
            {hasClipboard && (
              <span className="ml-auto text-[10px] text-muted-foreground/50">
                ({clipboardCount})
              </span>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground/50">
              Ctrl+Shift+V
            </span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-border/50 my-1" />

          {/* Remove All Effects */}
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
              "cursor-pointer hover:bg-white/5 outline-none",
              "text-red-400 hover:text-red-300"
            )}
            onClick={onRemoveEffect}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove All Effects
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * Simple context menu trigger wrapper
 * Use this to wrap any element that should trigger the menu on right-click
 */
export function EffectContextMenuTrigger({
  children,
  onContextMenu,
}: {
  children: React.ReactNode;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onContextMenu={onContextMenu}
      className="cursor-context-menu"
    >
      {children}
    </div>
  );
}

/**
 * Standalone context menu for Applied Effects list
 * Shows at the header level with "Remove All" option
 */
export function AppliedEffectsContextMenu({
  effects,
  hasClipboard,
  clipboardCount,
  onCopyAllEffects,
  onPasteEffects,
  onRemoveAllEffects,
  children,
}: {
  effects: AppliedEffect[];
  hasClipboard: boolean;
  clipboardCount: number;
  onCopyAllEffects: () => void;
  onPasteEffects: () => void;
  onRemoveAllEffects: () => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <div className="cursor-pointer">{children}</div>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "min-w-[180px] z-50",
            "bg-background border border-border rounded-md shadow-lg",
            "p-1 animate-in fade-in-0 zoom-in-95 duration-100"
          )}
          align="start"
          sideOffset={5}
        >
          <DropdownMenu.Label className="text-[10px] text-muted-foreground px-2 py-1">
            Applied Effects ({effects.length})
          </DropdownMenu.Label>

          <DropdownMenu.Separator className="h-px bg-border/50 my-1" />

          {/* Copy All */}
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
              "cursor-pointer hover:bg-white/5 outline-none",
              "text-muted-foreground hover:text-foreground"
            )}
            onClick={onCopyAllEffects}
            disabled={effects.length === 0}
          >
            <Copy className="w-3.5 h-3.5" />
            Copy All ({effects.length})
          </DropdownMenu.Item>

          {/* Paste */}
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
              "cursor-pointer hover:bg-white/5 outline-none",
              !hasClipboard && "opacity-50 cursor-not-allowed",
              hasClipboard ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50"
            )}
            onClick={hasClipboard ? onPasteEffects : undefined}
            disabled={!hasClipboard}
          >
            <Clipboard className="w-3.5 h-3.5" />
            Paste
            {hasClipboard && (
              <span className="ml-auto text-[10px] text-muted-foreground/50">
                ({clipboardCount})
              </span>
            )}
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-border/50 my-1" />

          {/* Remove All */}
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
              "cursor-pointer hover:bg-white/5 outline-none",
              "text-red-400 hover:text-red-300"
            )}
            onClick={onRemoveAllEffects}
            disabled={effects.length === 0}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove All Effects
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default EffectContextMenu;