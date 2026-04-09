/**
 * ui/timeline/EngineTimeline.tsx
 *
 * Drop-in replacement for the existing timeline/timeline.tsx.
 *
 * Full wired interaction loop:
 *   pointerdown  → startPointerDrag  →  DRAG_START / TRIM_START (event bus)
 *   pointermove  → onPointerMove     →  DRAG_MOVE  / TRIM_MOVE  (event bus)
 *   pointerup    → onPointerUp       →  DRAG_END   / TRIM_END   (event bus)
 *                ↓
 *   interaction-commander listens to bus events → dispatches
 *     MOVE_CLIP / TRIM_CLIP / RIPPLE_EDIT commands
 *                ↓
 *   engineStore.dispatch → reducer → new Project state
 *                ↓
 *   TimelineCanvasRenderer.scheduleRender → canvas repaint
 *
 * zoom convention: px/ms  (1/300 default = 1px per 300ms)
 */

"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

import {
  engineStore,
  useZoom,
  useScroll,
  useEngineDispatch,
  TimelineCanvasRenderer,
  startPointerDrag,
  onPointerMove as enginePointerMove,
  onPointerUp as enginePointerUp,
  cancelPointerDrag,
  xToTimeMs,
  yToTrackIndex,
  getOrderedTracks,
  hitTestClip,
  getTrackClips,
  TRACK_HEADER_WIDTH_PX,
  TIMELINE_RULER_HEIGHT_PX,
  dragRegistry,
  normalizeClip,
  createTrack,
  nanoid,
  type DragPayload,
} from "../../index";

import { mountInteractionCommander } from "../../runtime/interaction/interaction-commander";
import { eventBus } from "../../events/event-bus";

// ─── Constants ────────────────────────────────────────────────────────────────

// zoom is px/ms.  1/300 = ~0.0033 px/ms (1px = 300ms at rest)
const MIN_ZOOM = 0.00005;  // 1px = 20 000ms  (extreme zoom out)
const MAX_ZOOM = 0.05;     // 1px = 20ms       (extreme zoom in)

// ─── Component ────────────────────────────────────────────────────────────────

export default function EngineTimeline() {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const rendererRef    = useRef<TimelineCanvasRenderer | null>(null);
  const draggingIds    = useRef(new Set<string>());
  const snapRef        = useRef<number | undefined>(undefined);

  const { theme } = useTheme();
  const dispatch  = useEngineDispatch();
  const zoom      = useZoom();
  const { scrollX, scrollY } = useScroll();

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    rendererRef.current = new TimelineCanvasRenderer(canvas);

    const renderOpts = () => ({
      theme: (theme ?? "dark") as "dark" | "light",
      draggingClipIds: draggingIds.current,
      activeSnapTimeMs: snapRef.current,
    });

    // Paint on every engine state change
    const unsubState = engineStore.subscribe((state) => {
      rendererRef.current?.scheduleRender(state, renderOpts());
    });

    // Update snap indicator line
    const unsubSnap = eventBus.on("SNAP_ACTIVATED", ({ timeMs }) => {
      snapRef.current = timeMs;
      rendererRef.current?.scheduleRender(engineStore.getState(), renderOpts());
    });
    const unsubSnapClear = eventBus.on("SNAP_CLEARED", () => {
      snapRef.current = undefined;
      rendererRef.current?.scheduleRender(engineStore.getState(), renderOpts());
    });

    // Wire interaction events → engine commands
    const unmountCommander = mountInteractionCommander();

    // Initial paint
    rendererRef.current.render(engineStore.getState(), renderOpts());

    return () => {
      unsubState();
      unsubSnap();
      unsubSnapClear();
      unmountCommander();
      rendererRef.current?.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-paint when theme changes without remounting
  useEffect(() => {
    rendererRef.current?.render(engineStore.getState(), {
      theme: (theme ?? "dark") as "dark" | "light",
    });
  }, [theme]);

  // ── Resize observer ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio ?? 1;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width  = width  * dpr;
        canvas.height = height * dpr;
        canvas.style.width  = `${width}px`;
        canvas.style.height = `${height}px`;
        rendererRef.current?.render(engineStore.getState(), {
          theme: (theme ?? "dark") as "dark" | "light",
          dpr,
        });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [theme]);

  // ── Pointer down ─────────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      canvas.setPointerCapture(e.pointerId);

      const rect  = canvas.getBoundingClientRect();
      const xPx   = e.clientX - rect.left;
      const yPx   = e.clientY - rect.top;

      // ── Ruler → seek ───────────────────────────────────────────────────
      if (yPx < TIMELINE_RULER_HEIGHT_PX) {
        const timeMs = xToTimeMs(xPx - TRACK_HEADER_WIDTH_PX, scrollX, zoom);
        dispatch({ type: "SET_PLAYHEAD", payload: { timeMs: Math.max(0, timeMs) } });
        return;
      }

      // ── Hit-test clips ─────────────────────────────────────────────────
      const project    = engineStore.getState();
      const trackIndex = yToTrackIndex(yPx);
      if (trackIndex < 0) return;

      const tracks = getOrderedTracks(project);
      const track  = tracks[trackIndex];
      if (!track) return;

      const clips    = getTrackClips(project, track.id);
      const contentX = xPx - TRACK_HEADER_WIDTH_PX;

      for (const clip of clips) {
        const hit = hitTestClip(
          contentX,
          clip.display.from,
          clip.display.to,
          scrollX,
          zoom
        );
        if (!hit) continue;

        // Selection bookkeeping
        if (e.shiftKey) {
          dispatch({ type: "ADD_TO_SELECTION", payload: { clipId: clip.id } });
        } else if (!project.ui.selection.includes(clip.id)) {
          dispatch({ type: "SET_SELECTION", payload: { clipIds: [clip.id] } });
        }

        // Start gesture
        if (hit.type === "body") {
          draggingIds.current.add(clip.id);
          startPointerDrag(e.nativeEvent, "move", canvas, clip.id);
        } else if (hit.type === "trim-start") {
          startPointerDrag(e.nativeEvent, "trim-start", canvas, clip.id);
        } else if (hit.type === "trim-end") {
          startPointerDrag(e.nativeEvent, "trim-end", canvas, clip.id);
        }
        return;
      }

      // ── No clip hit → deselect + marquee ──────────────────────────────
      dispatch({ type: "CLEAR_SELECTION" });
      startPointerDrag(e.nativeEvent, "marquee", canvas);
    },
    [dispatch, zoom, scrollX]
  );

  // ── Pointer move ─────────────────────────────────────────────────────────
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      enginePointerMove(e.nativeEvent, zoom, scrollX);
    },
    [zoom, scrollX]
  );

  // ── Pointer up ───────────────────────────────────────────────────────────
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      const rect   = canvas.getBoundingClientRect();
      const yPx    = e.clientY - rect.top;

      const project    = engineStore.getState();
      const trackIndex = yToTrackIndex(yPx);
      const tracks     = getOrderedTracks(project);
      const targetTrack = tracks[trackIndex];

      enginePointerUp(e.nativeEvent, zoom, targetTrack?.id);
      draggingIds.current.clear();
      snapRef.current = undefined;
    },
    [zoom]
  );

  // ── Wheel ─────────────────────────────────────────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        // Anchor zoom at the pointer position so the content under the
        // cursor doesn't jump.  zoom = px/ms → newScrollX keeps
        //   (mouseContentX + scrollX) / zoom = (mouseContentX + newScrollX) / newZoom
        const canvas     = canvasRef.current!;
        const rect       = canvas.getBoundingClientRect();
        const mouseX     = e.clientX - rect.left - TRACK_HEADER_WIDTH_PX;
        const pivotTimeMs = xToTimeMs(mouseX, scrollX, zoom);

        const factor  = e.deltaY > 0 ? 0.85 : 1 / 0.85;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));

        // Solve: pivotTimeMs * newZoom - newScrollX = mouseX
        const newScrollX = Math.max(0, pivotTimeMs * newZoom - mouseX);

        dispatch({ type: "SET_ZOOM",   payload: { zoom: newZoom } });
        dispatch({ type: "SET_SCROLL", payload: { scrollX: newScrollX } });
      } else {
        dispatch({
          type: "SET_SCROLL",
          payload: {
            scrollX: Math.max(0, scrollX + e.deltaX),
            scrollY: Math.max(0, scrollY + e.deltaY),
          },
        });
      }
    },
    [dispatch, zoom, scrollX, scrollY]
  );

  // ── HTML5 drag-over / drop (from media bin) ───────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const payload: DragPayload | null = dragRegistry.resolveFromDataTransfer(e);
      if (!payload?.asset) return;

      const canvas   = canvasRef.current!;
      const rect     = canvas.getBoundingClientRect();
      const contentX = e.clientX - rect.left - TRACK_HEADER_WIDTH_PX;
      const yPx      = e.clientY - rect.top;

      // zoom = px/ms → ms = px / zoom, offset by scrollX
      const timeMs     = Math.max(0, xToTimeMs(contentX, scrollX, zoom));
      const trackIndex = yToTrackIndex(yPx);

      const project     = engineStore.getState();
      const tracks      = getOrderedTracks(project);
      const targetTrack = tracks[trackIndex];
      const trackId     = targetTrack?.id ?? nanoid();

      // AssetType is "video" | "audio" | "image" | "font".
      // Map to the ClipType the timeline understands:
      //   font assets are rendered as text clips
      //   everything else maps 1-to-1
      const clipType =
        payload.asset.type === "audio"
          ? "audio"
          : payload.asset.type === "image"
          ? "image"
          : payload.asset.type === "font"
          ? "text"
          : "video"; // covers "video" and any unknown future type

      if (!targetTrack) {
        dispatch({
          type: "ADD_TRACK",
          payload: {
            track: createTrack(
              clipType === "audio"
                ? "audio"
                : clipType === "text"
                ? "text"
                : "video",
              { id: trackId, order: tracks.length }
            ),
          },
        });
      }

      const duration = payload.asset.duration ?? 5000;
      const clip = normalizeClip({
        id:      nanoid(),
        type:    clipType,
        name:    payload.asset.name,
        assetId: payload.asset.id,
        trackId,
        display: { from: timeMs, to: timeMs + duration },
        trim:    { from: 0, to: duration },
        details: { src: payload.asset.url, duration },
      });

      if (clip) {
        dispatch({ type: "ADD_CLIP", payload: { clip, trackId } });
      }

      dragRegistry.release(payload.token);
    },
    [dispatch, zoom, scrollX]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          cancelPointerDrag();
          draggingIds.current.clear();
          snapRef.current = undefined;
        }}
        style={{ touchAction: "none", cursor: "default" }}
      />
    </div>
  );
}
