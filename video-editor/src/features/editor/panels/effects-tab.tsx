"use client";

/**
 * effects-tab.tsx
 * ──────────────────────────────────────────────────────────────
 * The "Effects" tab for the Project Panel.
 * Drop this next to the existing ProjectPanel media content and
 * wrap both in a two-tab layout (Media | Effects).
 *
 * INTEGRATION:
 *  1. Import this component in project-panel.tsx
 *  2. Add a state: const [tab, setTab] = useState<"media" | "effects">("media")
 *  3. Show <TabBar> at the top of the panel
 *  4. Conditionally render <EffectsTab /> or the existing media content
 *
 * DRAG TO TIMELINE:
 *  Dragging an effect card sets drag data that the timeline's drop handler
 *  reads to apply the effect to the clip under the cursor.
 *
 * DRAGGING A TRANSITION:
 *  Dragging a transition card sets drag data with type "transition" which
 *  the timeline reads to insert a transition between two clips.
 */

import React, { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Zap,
  Layers,
  Clock,
  Sparkles,
  Move,
  Eye,
  Film,
} from "lucide-react";
import {
  VIDEO_EFFECTS,
  VideoEffectDef,
  EffectCategory,
  EFFECT_CATEGORY_LABELS,
  EFFECT_CATEGORY_ORDER,
  getEffectsByCategory,
} from "../data/video-effects";
import {
  VIDEO_TRANSITIONS,
  VideoTransitionDef,
  TransitionCategory,
  TRANSITION_CATEGORY_LABELS,
  TRANSITION_CATEGORY_ORDER,
  getTransitionsByCategory,
} from "../data/video-transitions";
import { setDragData } from "@/components/shared/drag-data";
import { useEngineSelection, useEngineDispatch, useEngineSelector } from "../engine/engine-provider";
import { selectActiveClip } from "../engine/selectors";

const EDIT_OBJECT = "EDIT_OBJECT";

const dispatch = (key: string, payload: { payload?: unknown; options?: unknown }) => {
  console.log("dispatch", key, payload);
};

const EFFECT_CATEGORY_ICONS: Partial<Record<EffectCategory, React.ReactNode>> = {
  "adjust":             <Sparkles className="w-3 h-3" />,
  "blur-sharpen":       <Eye className="w-3 h-3" />,
  "color-correction":   <Layers className="w-3 h-3" />,
  "distort":            <Move className="w-3 h-3" />,
  "film-impact-essential": <Film className="w-3 h-3" />,
  "film-impact-lights": <Zap className="w-3 h-3" />,
  "film-impact-motion": <Move className="w-3 h-3" />,
  "stylize":            <Sparkles className="w-3 h-3" />,
  "time":               <Clock className="w-3 h-3" />,
  "transform":          <Layers className="w-3 h-3" />,
};

type SubTab = "effects" | "transitions";

const EffectCard: React.FC<{
  effect: VideoEffectDef;
  onApply: (effect: VideoEffectDef) => void;
}> = ({ effect, onApply }) => {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = "copy";
      const payload = {
        type: "video-effect",
        effectKind: effect.kind,
        effectName: effect.name,
      };
      setDragData(payload);
      e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    },
    [effect]
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={() => onApply(effect)}
      title={`${effect.name} — ${effect.description}\n\nDouble-click to apply | Drag to clip`}
      className="group flex items-center gap-2 px-2.5 py-1.5 rounded cursor-grab active:cursor-grabbing hover:bg-white/8 transition-colors select-none"
    >
      <div className="flex-none w-1 h-5 flex flex-col gap-[2px] justify-center opacity-30 group-hover:opacity-60">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-1 h-[2px] rounded-full bg-current" />
        ))}
      </div>

      <span className="text-xs text-foreground/90 truncate flex-1 leading-tight">
        {effect.name}
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); onApply(effect); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary hover:text-primary/80 px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 shrink-0"
      >
        Apply
      </button>
    </div>
  );
};

const TransitionCard: React.FC<{
  transition: VideoTransitionDef;
  onApply: (t: VideoTransitionDef) => void;
}> = ({ transition, onApply }) => {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = "copy";
      const payload = {
        type: "transition",
        id: transition.id,
        kind: transition.kind,
        duration: transition.defaultDuration,
        name: transition.name,
      };
      setDragData(payload);
      e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    },
    [transition]
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={() => onApply(transition)}
      title={`${transition.name} — ${transition.description}\n\nDouble-click to apply | Drag between clips`}
      className="group flex items-center gap-2 px-2.5 py-1.5 rounded cursor-grab active:cursor-grabbing hover:bg-white/8 transition-colors select-none"
    >
      <div className="flex-none w-1 h-5 flex flex-col gap-[2px] justify-center opacity-30 group-hover:opacity-60">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-1 h-[2px] rounded-full bg-current" />
        ))}
      </div>

      <span className="text-xs text-foreground/90 truncate flex-1 leading-tight">
        {transition.name}
      </span>

      <span className="text-[10px] text-muted-foreground shrink-0 opacity-60 group-hover:opacity-100">
        {transition.defaultDuration}s
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); onApply(transition); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary hover:text-primary/80 px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 shrink-0"
      >
        Apply
      </button>
    </div>
  );
};

const CategorySection: React.FC<{
  label: string;
  icon?: React.ReactNode;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ label, icon, count, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div className="border-b border-border/20 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full px-2.5 py-1.5 hover:bg-white/5 transition-colors text-left group"
      >
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wide">
          {label}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground/60">{count}</span>
      </button>

      {open && <div className="pb-1">{children}</div>}
    </div>
  );
};

const EffectsSubTab: React.FC<{ search: string }> = ({ search }) => {
  const engineSelection = useEngineSelection();
  const activeClip = useEngineSelector(selectActiveClip);
  const legacyActiveIds = activeClip ? [activeClip.id] : [];
  const activeIds = engineSelection.length > 0 ? engineSelection : legacyActiveIds;
  const engineDispatch = useEngineDispatch();

  const handleApplyEffect = useCallback(
    (effect: VideoEffectDef) => {
      const clipId = activeIds[0];
      if (!clipId) return;

      const params: Record<string, number | string | boolean> = {};
      effect.controls.forEach((ctrl) => {
        params[ctrl.key] = ctrl.default;
      });

      // Use engine APPLY_EFFECT command — reads/writes engine state only
      engineDispatch({
        type: "APPLY_EFFECT",
        payload: {
          clipId,
          effect: {
            id: `${effect.kind}_${Date.now()}`,
            kind: effect.kind,
            params,
            enabled: true,
          },
        },
      });
    },
    [activeIds, engineDispatch]
  );

  const filteredByCategory = useMemo(() => {
    const q = search.toLowerCase();
    return EFFECT_CATEGORY_ORDER.map((cat) => {
      const effects = getEffectsByCategory(cat).filter(
        (e) =>
          !q ||
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
      return { cat, effects };
    }).filter(({ effects }) => effects.length > 0);
  }, [search]);

  if (filteredByCategory.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-muted-foreground px-4 text-center">
        No effects match "{search}"
      </div>
    );
  }

  return (
    <div>
      {!activeIds[0] && (
        <div className="mx-2.5 mb-2 mt-1 px-2.5 py-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-[10px] text-yellow-400/80 leading-relaxed">
          Select a clip in the timeline to apply effects
        </div>
      )}

      {filteredByCategory.map(({ cat, effects }) => (
        <CategorySection
          key={cat}
          label={EFFECT_CATEGORY_LABELS[cat]}
          icon={EFFECT_CATEGORY_ICONS[cat]}
          count={effects.length}
          defaultOpen={search.length > 0 || ["adjust", "color-correction", "blur-sharpen"].includes(cat)}
        >
          {effects.map((effect) => (
            <EffectCard key={effect.id} effect={effect} onApply={handleApplyEffect} />
          ))}
        </CategorySection>
      ))}
    </div>
  );
};

const TransitionsSubTab: React.FC<{ search: string }> = ({ search }) => {
  const engineSelection = useEngineSelection();
  const activeClip = useEngineSelector(selectActiveClip);
  const legacyActiveIds = activeClip ? [activeClip.id] : [];
  const activeIds = engineSelection.length > 0 ? engineSelection : legacyActiveIds;
  const engineDispatch = useEngineDispatch();

  const handleApplyTransition = useCallback(
    (transition: VideoTransitionDef) => {
      const clipId = activeIds[0];
      if (!clipId) return;

      const params: Record<string, number | string | boolean> = {};
      transition.controls.forEach((ctrl) => {
        params[ctrl.key] = ctrl.default;
      });

      engineDispatch(updateDetails(clipId, { pendingTransition: { kind: transition.kind, duration: transition.defaultDuration * 1000, params } }));
    },
    [activeIds, engineDispatch]
  );

  const filteredByCategory = useMemo(() => {
    const q = search.toLowerCase();
    return TRANSITION_CATEGORY_ORDER.map((cat) => {
      const transitions = getTransitionsByCategory(cat).filter(
        (t) =>
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
      return { cat, transitions };
    }).filter(({ transitions }) => transitions.length > 0);
  }, [search]);

  if (filteredByCategory.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-muted-foreground px-4 text-center">
        No transitions match "{search}"
      </div>
    );
  }

  return (
    <div>
      {!activeIds[0] && (
        <div className="mx-2.5 mb-2 mt-1 px-2.5 py-2 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400/80 leading-relaxed">
          Select a clip or drag a transition between two clips
        </div>
      )}

      {filteredByCategory.map(({ cat, transitions }) => (
        <CategorySection
          key={cat}
          label={TRANSITION_CATEGORY_LABELS[cat]}
          count={transitions.length}
          defaultOpen={search.length > 0 || cat === "dissolve"}
        >
          {transitions.map((t) => (
            <TransitionCard key={t.id} transition={t} onApply={handleApplyTransition} />
          ))}
        </CategorySection>
      ))}
    </div>
  );
};

const EffectsTab: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>("effects");
  const [search, setSearch] = useState("");

  const effectCount = VIDEO_EFFECTS.length;
  const transitionCount = VIDEO_TRANSITIONS.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex border-b border-border/40 shrink-0">
        <button
          onClick={() => { setSubTab("effects"); setSearch(""); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors border-b-2",
            subTab === "effects"
              ? "text-foreground border-primary"
              : "text-muted-foreground border-transparent hover:text-foreground/80"
          )}
        >
          <Sparkles className="w-3 h-3" />
          Effects
          <span className="text-[10px] opacity-50">({effectCount})</span>
        </button>
        <button
          onClick={() => { setSubTab("transitions"); setSearch(""); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors border-b-2",
            subTab === "transitions"
              ? "text-foreground border-primary"
              : "text-muted-foreground border-transparent hover:text-foreground/80"
          )}
        >
          <Film className="w-3 h-3" />
          Transitions
          <span className="text-[10px] opacity-50">({transitionCount})</span>
        </button>
      </div>

      <div className="px-2 py-1.5 border-b border-border/30 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={subTab === "effects" ? "Search effects…" : "Search transitions…"}
            className="h-6 pl-6 text-xs bg-transparent border-border/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {subTab === "effects" ? (
          <EffectsSubTab search={search} />
        ) : (
          <TransitionsSubTab search={search} />
        )}
      </div>

      <div className="shrink-0 px-3 py-1.5 border-t border-border/30 text-[10px] text-muted-foreground/50 text-center">
        Double-click to apply · Drag to clip or between clips
      </div>
    </div>
  );
};

export default EffectsTab;