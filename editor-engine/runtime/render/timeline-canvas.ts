/**
 * runtime/render/timeline-canvas.ts
 * Pure canvas renderer for the timeline panel.
 *
 * Rendering contract:
 *   - Reads ONLY from the Project state snapshot passed in
 *   - Never owns or mutates any state
 *   - Called via requestAnimationFrame from the React timeline component
 *
 * Usage:
 *   const renderer = new TimelineCanvasRenderer(canvasEl);
 *   renderer.render(project, { activeSnapTimeMs, isDragging });
 */

import type { Project, Clip, Track } from "../../model/schema";
import {
  timeMsToX,
  trackIndexToY,
  getRulerTicks,
  TRACK_HEIGHT_PX,
  TIMELINE_RULER_HEIGHT_PX,
  TRACK_HEADER_WIDTH_PX,
  hitTestClip,
} from "../layout/time-converter";
import { getOrderedTracks, getTrackClips } from "../../state/selectors";

// ─── Theme ────────────────────────────────────────────────────────────────────

const THEME = {
  dark: {
    bg: "#111113",
    rulerBg: "#1a1a1e",
    rulerText: "#888",
    rulerLine: "#2a2a2e",
    trackBg: "#16161a",
    trackAltBg: "#18181c",
    trackBorder: "#222226",
    clipVideo: "#2563eb",
    clipAudio: "#16a34a",
    clipText: "#7c3aed",
    clipCaption: "#d97706",
    clipImage: "#0891b2",
    clipOverlay: "#be185d",
    clipSelected: "#3b82f6",
    clipBorder: "rgba(255,255,255,0.15)",
    clipText2: "rgba(255,255,255,0.85)",
    playhead: "#ef4444",
    playheadHead: "#ef4444",
    snapLine: "#fbbf24",
    selectionFill: "rgba(59,130,246,0.15)",
    selectionBorder: "#3b82f6",
    handle: "#60a5fa",
  },
  light: {
    bg: "#f4f4f5",
    rulerBg: "#e4e4e7",
    rulerText: "#52525b",
    rulerLine: "#d4d4d8",
    trackBg: "#ffffff",
    trackAltBg: "#fafafa",
    trackBorder: "#e4e4e7",
    clipVideo: "#3b82f6",
    clipAudio: "#22c55e",
    clipText: "#8b5cf6",
    clipCaption: "#f59e0b",
    clipImage: "#06b6d4",
    clipOverlay: "#ec4899",
    clipSelected: "#2563eb",
    clipBorder: "rgba(0,0,0,0.12)",
    clipText2: "rgba(255,255,255,0.9)",
    playhead: "#dc2626",
    playheadHead: "#dc2626",
    snapLine: "#d97706",
    selectionFill: "rgba(59,130,246,0.12)",
    selectionBorder: "#2563eb",
    handle: "#2563eb",
  },
};

type ThemeKey = keyof typeof THEME;

export interface RenderOptions {
  theme?: ThemeKey;
  /** Active snap time in ms — if set, draws a snap guide line */
  activeSnapTimeMs?: number;
  /** IDs of clips currently being dragged (rendered with ghost style) */
  draggingClipIds?: Set<string>;
  /** Marquee selection rect in canvas px coordinates */
  marqueeRect?: { x: number; y: number; w: number; h: number };
  /** Device pixel ratio */
  dpr?: number;
}

// ─── Renderer ────────────────────────────────────────────────────────────────

export class TimelineCanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastRafId = 0;
  private pendingProject: Project | null = null;
  private pendingOptions: RenderOptions = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context from timeline canvas");
    this.ctx = ctx;
  }

  /** Schedule a render on the next animation frame (debounced). */
  scheduleRender(project: Project, options: RenderOptions = {}): void {
    this.pendingProject = project;
    this.pendingOptions = options;
    if (this.lastRafId) cancelAnimationFrame(this.lastRafId);
    this.lastRafId = requestAnimationFrame(this._flush);
  }

  private _flush = (): void => {
    this.lastRafId = 0;
    if (!this.pendingProject) return;
    this.render(this.pendingProject, this.pendingOptions);
  };

  /** Render immediately (call from within rAF or tests). */
  render(project: Project, options: RenderOptions = {}): void {
    const { theme = "dark", dpr = window.devicePixelRatio ?? 1 } = options;
    const T = THEME[theme];
    const { canvas, ctx } = this;

    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    const { zoom, scrollX, scrollY } = project.ui;
    const tracks = getOrderedTracks(project);

    // ── Background ─────────────────────────────────────────────────────────
    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, w, h);

    // ── Ruler ──────────────────────────────────────────────────────────────
    this.drawRuler(ctx, project, T, w, zoom, scrollX);

    // ── Tracks + Clips ─────────────────────────────────────────────────────
    ctx.save();
    ctx.rect(TRACK_HEADER_WIDTH_PX, TIMELINE_RULER_HEIGHT_PX, w - TRACK_HEADER_WIDTH_PX, h - TIMELINE_RULER_HEIGHT_PX);
    ctx.clip();

    tracks.forEach((track, i) => {
      const y = trackIndexToY(i) - scrollY;
      this.drawTrackBackground(ctx, track, i, T, TRACK_HEADER_WIDTH_PX, y, w - TRACK_HEADER_WIDTH_PX);
      const clips = getTrackClips(project, track.id);
      for (const clip of clips) {
        const isSelected = project.ui.selection.includes(clip.id);
        const isDragging = options.draggingClipIds?.has(clip.id) ?? false;
        this.drawClip(ctx, clip, track, i, T, zoom, scrollX, scrollY, isSelected, isDragging);
      }
    });

    // ── Marquee ────────────────────────────────────────────────────────────
    if (options.marqueeRect) {
      const { x, y, w: mw, h: mh } = options.marqueeRect;
      ctx.fillStyle = T.selectionFill;
      ctx.fillRect(x, y, mw, mh);
      ctx.strokeStyle = T.selectionBorder;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x, y, mw, mh);
      ctx.setLineDash([]);
    }

    // ── Snap Guide ─────────────────────────────────────────────────────────
    if (options.activeSnapTimeMs !== undefined) {
      const snapX = timeMsToX(options.activeSnapTimeMs, scrollX, zoom) + TRACK_HEADER_WIDTH_PX;
      ctx.strokeStyle = T.snapLine;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(snapX, TIMELINE_RULER_HEIGHT_PX);
      ctx.lineTo(snapX, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    // ── Playhead ───────────────────────────────────────────────────────────
    this.drawPlayhead(ctx, project, T, w, h, zoom, scrollX, scrollY);

    ctx.restore();
  }

  // ─── Ruler ────────────────────────────────────────────────────────────────

  private drawRuler(
    ctx: CanvasRenderingContext2D,
    project: Project,
    T: typeof THEME.dark,
    canvasW: number,
    zoom: number,
    scrollX: number
  ): void {
    const rh = TIMELINE_RULER_HEIGHT_PX;
    const contentW = canvasW - TRACK_HEADER_WIDTH_PX;

    ctx.fillStyle = T.rulerBg;
    ctx.fillRect(TRACK_HEADER_WIDTH_PX, 0, contentW, rh);

    const ticks = getRulerTicks(scrollX, contentW, zoom);
    ctx.font = "10px monospace";
    ctx.textBaseline = "middle";

    for (const tick of ticks) {
      const x = tick.xPx + TRACK_HEADER_WIDTH_PX;
      if (x < TRACK_HEADER_WIDTH_PX || x > canvasW) continue;

      ctx.strokeStyle = T.rulerLine;
      ctx.lineWidth = tick.major ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, tick.major ? 0 : rh * 0.6);
      ctx.lineTo(x, rh);
      ctx.stroke();

      if (tick.major && tick.label) {
        ctx.fillStyle = T.rulerText;
        ctx.fillText(tick.label, x + 3, rh * 0.4);
      }
    }

    // Ruler bottom border
    ctx.strokeStyle = T.trackBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rh);
    ctx.lineTo(canvasW, rh);
    ctx.stroke();
  }

  // ─── Track background ─────────────────────────────────────────────────────

  private drawTrackBackground(
    ctx: CanvasRenderingContext2D,
    track: Track,
    index: number,
    T: typeof THEME.dark,
    offsetX: number,
    y: number,
    w: number
  ): void {
    ctx.fillStyle = index % 2 === 0 ? T.trackBg : T.trackAltBg;
    ctx.fillRect(offsetX, y, w, TRACK_HEIGHT_PX);

    ctx.strokeStyle = T.trackBorder;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(offsetX, y + TRACK_HEIGHT_PX);
    ctx.lineTo(offsetX + w, y + TRACK_HEIGHT_PX);
    ctx.stroke();

    // Muted overlay
    if (track.muted || track.hidden) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(offsetX, y, w, TRACK_HEIGHT_PX);
    }
  }

  // ─── Clip ────────────────────────────────────────────────────────────────

  private drawClip(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    track: Track,
    trackIndex: number,
    T: typeof THEME.dark,
    zoom: number,
    scrollX: number,
    scrollY: number,
    isSelected: boolean,
    isDragging: boolean
  ): void {
    const x = timeMsToX(clip.display.from, scrollX, zoom) + TRACK_HEADER_WIDTH_PX;
    const width = timeMsToX(clip.display.to, scrollX, zoom) + TRACK_HEADER_WIDTH_PX - x;
    const y = trackIndexToY(trackIndex) - scrollY + 2;
    const h = TRACK_HEIGHT_PX - 4;
    const r = 4; // corner radius

    if (width < 2) return; // too small to draw

    // Fill color by type
    const colorMap: Record<string, string> = {
      video: T.clipVideo,
      audio: T.clipAudio,
      text: T.clipText,
      caption: T.clipCaption,
      image: T.clipImage,
      overlay: T.clipOverlay,
    };
    const baseColor = colorMap[clip.type] ?? T.clipVideo;

    ctx.globalAlpha = isDragging ? 0.45 : 1;

    // Shadow for selected
    if (isSelected) {
      ctx.shadowColor = T.clipSelected;
      ctx.shadowBlur = 6;
    }

    // Rounded rect
    ctx.beginPath();
    ctx.roundRect?.(x, y, width, h, r);
    ctx.fillStyle = isSelected ? T.clipSelected : baseColor;
    ctx.fill();

    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = isSelected ? "rgba(255,255,255,0.6)" : T.clipBorder;
    ctx.lineWidth = isSelected ? 1.5 : 0.5;
    ctx.stroke();

    // Clip name label
    if (width > 30) {
      ctx.fillStyle = T.clipText2;
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.save();
      ctx.rect(x + 4, y, width - 8, h);
      ctx.clip();
      ctx.fillText(clip.name, x + 6, y + h / 2);
      ctx.restore();
    }

    // Trim handles (only if selected and wide enough)
    if (isSelected && width > 20) {
      ctx.fillStyle = T.handle;
      // Left handle
      ctx.beginPath();
      ctx.roundRect?.(x, y, 5, h, [r, 0, 0, r]);
      ctx.fill();
      // Right handle
      ctx.beginPath();
      ctx.roundRect?.(x + width - 5, y, 5, h, [0, r, r, 0]);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  // ─── Playhead ─────────────────────────────────────────────────────────────

  private drawPlayhead(
    ctx: CanvasRenderingContext2D,
    project: Project,
    T: typeof THEME.dark,
    canvasW: number,
    canvasH: number,
    zoom: number,
    scrollX: number,
    scrollY: number
  ): void {
    const x = timeMsToX(project.ui.playheadTime, scrollX, zoom) + TRACK_HEADER_WIDTH_PX;
    if (x < TRACK_HEADER_WIDTH_PX || x > canvasW) return;

    // Vertical line
    ctx.strokeStyle = T.playhead;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, TIMELINE_RULER_HEIGHT_PX);
    ctx.lineTo(x, canvasH);
    ctx.stroke();

    // Triangle head in ruler
    ctx.fillStyle = T.playheadHead;
    ctx.beginPath();
    const headSize = 7;
    ctx.moveTo(x - headSize / 2, 0);
    ctx.lineTo(x + headSize / 2, 0);
    ctx.lineTo(x, TIMELINE_RULER_HEIGHT_PX);
    ctx.closePath();
    ctx.fill();
  }

  destroy(): void {
    if (this.lastRafId) cancelAnimationFrame(this.lastRafId);
  }
}
