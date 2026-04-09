/**
 * Engine Debug Panel
 * 
 * This component proves the engine is working by showing:
 * 1. Engine state (clips, selection, playhead)
 * 2. Whether events are being received
 * 3. Sample clip data
 * 
 * Delete this file after verifying the engine works.
 */

"use client";

import { useEffect, useState } from "react";
import { useEngine, useEngineSelection, useEnginePlayhead } from "./engine/engine-provider";
import useStore from "./store/use-store";

export function EngineDebugPanel() {
  const project = useEngine();
  const selection = useEngineSelection();
  const playhead = useEnginePlayhead();
  
  // Also read Zustand for comparison
  const { activeIds, trackItemsMap } = useStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log("[Engine Debug] Engine state:", {
      engineClips: Object.keys(project.clips).length,
      engineTracks: Object.keys(project.tracks).length,
      engineSelection: selection,
      zustandActiveIds: activeIds,
      zustandTrackItemsMapKeys: Object.keys(trackItemsMap).length,
    });
  }, [project, selection, activeIds, trackItemsMap]);

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

  const engineClipCount = Object.keys(project.clips).length;
  const zustandClipCount = Object.keys(trackItemsMap).length;
  const isWorking = engineClipCount > 0 || zustandClipCount > 0;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        right: "10px",
        zIndex: 99999,
        width: "320px",
        maxHeight: "400px",
        overflow: "auto",
        background: "#1f2937",
        color: "white",
        padding: "16px",
        borderRadius: "8px",
        fontSize: "12px",
        fontFamily: "monospace",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
        <strong>Engine Debug</strong>
        <button
          onClick={() => setIsVisible(false)}
          style={{ background: "transparent", border: "none", color: "white", cursor: "pointer" }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: "8px", color: isWorking ? "#10b981" : "#ef4444" }}>
        <strong>Status:</strong> {isWorking ? "Working" : "No clips loaded"}
      </div>

      <div style={{ marginBottom: "8px", borderBottom: "1px solid #374151", paddingBottom: "8px" }}>
        <strong style={{ color: "#f59e0b" }}>ENGINE</strong>
      </div>

      <div style={{ marginBottom: "4px" }}>
        <strong>Clips:</strong> {engineClipCount}
      </div>

      <div style={{ marginBottom: "4px" }}>
        <strong>Tracks:</strong> {Object.keys(project.tracks).length}
      </div>

      <div style={{ marginBottom: "4px" }}>
        <strong>Selection:</strong> [{selection.join(", ")}]
      </div>

      <div style={{ marginBottom: "8px" }}>
        <strong>Playhead:</strong> {Math.round(playhead)}ms
      </div>

      <div style={{ marginBottom: "8px", borderBottom: "1px solid #374151", paddingBottom: "8px" }}>
        <strong style={{ color: "#3b82f6" }}>ZUSTAND (fallback)</strong>
      </div>

      <div style={{ marginBottom: "4px" }}>
        <strong>Active IDs:</strong> [{activeIds.join(", ")}]
      </div>

      <div style={{ marginBottom: "4px" }}>
        <strong>Clips:</strong> {zustandClipCount}
      </div>

      {engineClipCount === 0 && zustandClipCount > 0 && (
        <div style={{ marginTop: "8px", padding: "8px", background: "#f59e0b20", borderRadius: "4px", fontSize: "10px" }}>
          Engine has no clips! Bridge may not be receiving events. Check console logs.
        </div>
      )}

      {engineClipCount > 0 && (
        <div style={{ marginTop: "8px", padding: "8px", background: "#10b98120", borderRadius: "4px", fontSize: "10px" }}>
          Engine IS receiving events! Clips are being synced.
        </div>
      )}

      <div style={{ marginTop: "12px", fontSize: "10px", color: "#9ca3af" }}>
        <p>Check browser console (F12) for detailed logs.</p>
        <p>Open console to see [Engine Debug] logs.</p>
      </div>
    </div>
  );
}
