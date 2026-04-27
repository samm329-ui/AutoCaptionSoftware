/**
 * effect-reorder-list.tsx
 * Drag and drop reordering for applied effects
 */

"use client";

import React, { useState, useCallback, useRef } from "react";
import { GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppliedEffect } from "../../data/video-effects";

interface EffectReorderListProps {
  effects: AppliedEffect[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  children: (effect: AppliedEffect, index: number) => React.ReactNode;
}

export function EffectReorderList({
  effects,
  onReorder,
  children,
}: EffectReorderListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [useArrows, setUseArrows] = useState(false); // Toggle between drag and arrows

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null) return;
    if (index !== dragIndex) {
      setDragOverIndex(index);
    }
  }, [dragIndex]);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      onReorder(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, onReorder]);

  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      onReorder(index, index - 1);
    }
  }, [onReorder]);

  const handleMoveDown = useCallback((index: number) => {
    if (index < effects.length - 1) {
      onReorder(index, index + 1);
    }
  }, [onReorder, effects.length]);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <div className="flex items-center justify-end gap-1 px-3 py-1 border-b border-border/20">
        <button
          onClick={() => setUseArrows(!useArrows)}
          className="text-[9px] text-muted-foreground hover:text-foreground transition-colors"
          title={useArrows ? "Switch to drag & drop" : "Switch to arrow buttons"}
        >
          {useArrows ? (
            <GripVertical className="w-3 h-3" />
          ) : (
            <span className="text-[10px]">↕</span>
          )}
        </button>
        <span className="text-[9px] text-muted-foreground">
          {useArrows ? "Arrows" : "Drag"}
        </span>
      </div>

      {/* Effect List */}
      <div className="space-y-0">
        {effects.map((effect, index) => (
          <div
            key={effect.id}
            draggable={!useArrows}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-150",
              dragIndex === index && "opacity-50",
              dragOverIndex === index && dragIndex !== index && "border-t-2 border-t-primary"
            )}
          >
            {/* Drag Handle / Move Buttons */}
            <div className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-10",
              useArrows ? "flex flex-col gap-0" : "cursor-grab active:cursor-grabbing"
            )}>
              {useArrows ? (
                <>
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className={cn(
                      "p-0.5 hover:bg-white/10 rounded",
                      index === 0 && "opacity-30 cursor-not-allowed"
                    )}
                    title="Move up"
                  >
                    <ChevronUp className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === effects.length - 1}
                    className={cn(
                      "p-0.5 hover:bg-white/10 rounded",
                      index === effects.length - 1 && "opacity-30 cursor-not-allowed"
                    )}
                    title="Move down"
                  >
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-0.5 px-1 py-2">
                  <GripVertical className="w-3 h-3 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {/* Effect Content - shifted to make room for handle */}
            <div className="pl-8">
              {children(effect, index)}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {effects.length === 0 && (
        <div className="px-3 py-4 text-center text-[10px] text-muted-foreground">
          No effects applied
        </div>
      )}
    </div>
  );
}

/**
 * Simplified version with just move up/down buttons
 * (No drag-drop, just arrows)
 */
export function SimpleEffectList({
  effects,
  onReorder,
  children,
}: EffectReorderListProps) {
  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      onReorder(index, index - 1);
    }
  }, [onReorder]);

  const handleMoveDown = useCallback((index: number) => {
    if (index < effects.length - 1) {
      onReorder(index, index + 1);
    }
  }, [onReorder, effects.length]);

  return (
    <div className="space-y-0">
      {effects.map((effect, index) => (
        <div key={effect.id} className="relative">
          {/* Move Controls */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-0 z-10">
            <button
              onClick={() => handleMoveUp(index)}
              disabled={index === 0}
              className={cn(
                "p-0.5 hover:bg-white/10 rounded",
                index === 0 && "opacity-30 cursor-not-allowed"
              )}
              title="Move up"
            >
              <ChevronUp className="w-3 h-3 text-muted-foreground" />
            </button>
            <button
              onClick={() => handleMoveDown(index)}
              disabled={index === effects.length - 1}
              className={cn(
                "p-0.5 hover:bg-white/10 rounded",
                index === effects.length - 1 && "opacity-30 cursor-not-allowed"
              )}
              title="Move down"
            >
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>

          {/* Effect Content */}
          <div className="pl-8">
            {children(effect, index)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default EffectReorderList;