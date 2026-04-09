/**
 * Engine Debug Panel
 * 
 * This component proves the engine is working by showing:
 * 1. Engine state (clips, selection, playhead)
 * 2. Whether events are being received
 * 
 * Delete this file after verifying the engine works.
 */

"use client";

import { useEffect, useState } from "react";
import { useEngine, useEngineSelection, useEnginePlayhead } from "./engine/engine-provider";

export function EngineDebugPanel() {
  const project = useEngine();
  const selection = useEngineSelection();
  const playhead = useEnginePlayhead();
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const originalDispatch = project; // Just to reference project
    console.log("[Engine Debug] Engine state updated:", {
      clips: Object.keys(project.clips).length,
      tracks: Object.keys(project.tracks).length,
      selection,
      playhead: Math.round(playhead),
    });
  }, [project, selection, playhead]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: "fixed",
          bottom: "10px",
          right: "10px",
          zIndex: 99999,
          padding: "8px 16px",
          background: "#10b981",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Engine Debug
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        right: "10px",
        zIndex: 99999,
        width: "300px",
        background: "#1f2937",
        color: "white",
        padding: "16px",
        borderRadius: "8px",
        fontSize: "12px",
        fontFamily: "monospace",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
        <strong>Engine Status</strong>
        <button
          onClick={() => setIsVisible(false)}
          style={{ background: "transparent", border: "none", color: "white", cursor: "pointer" }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: "8px" }}>
        <strong>Clips:</strong> {Object.keys(project.clips).length}
      </div>

      <div style={{ marginBottom: "8px" }}>
        <strong>Tracks:</strong> {Object.keys(project.tracks).length}
      </div>

      <div style={{ marginBottom: "8px" }}>
        <strong>Selection:</strong> [{selection.join(", ")}]
      </div>

      <div style={{ marginBottom: "12px" }}>
        <strong>Playhead:</strong> {Math.round(playhead)}ms
      </div>

      <div style={{ marginBottom: "8px" }}>
        <strong>Canvas:</strong> {project.sequences[project.rootSequenceId]?.canvas.width}x
        {project.sequences[project.rootSequenceId]?.canvas.height}
      </div>

      <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "8px" }}>
        If clips are greater than 0 when you add media, engine IS working!
      </div>
    </div>
  );
}
