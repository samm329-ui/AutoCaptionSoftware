"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Track } from "../engine/engine-core";

interface DeleteTrackModalProps {
  onClose: () => void;
  onDeleteTracks: (config: DeleteConfig) => void;
  tracks: Track[];
}

interface DeleteConfig {
  video: { enabled: boolean; tracksToDelete: string[] };
  audio: { enabled: boolean; tracksToDelete: string[] };
  text: { enabled: boolean; tracksToDelete: string[] };
  subtitle: { enabled: boolean; tracksToDelete: string[] };
}

function getTracksByType(tracks: Track[], group: string): Track[] {
  return tracks.filter(t => t.group === group).sort((a, b) => a.order - b.order);
}

export default function DeleteTrackModal({ onClose, onDeleteTracks, tracks }: DeleteTrackModalProps) {
  const [config, setConfig] = useState<DeleteConfig>({
    video: { enabled: false, tracksToDelete: [] },
    audio: { enabled: false, tracksToDelete: [] },
    text: { enabled: false, tracksToDelete: [] },
    subtitle: { enabled: false, tracksToDelete: [] },
  });

  const videoTracks = getTracksByType(tracks, "video");
  const audioTracks = getTracksByType(tracks, "audio");
  const textTracks = getTracksByType(tracks, "text");
  const subtitleTracks = getTracksByType(tracks, "subtitle");

  const protectedTracks = ["V1", "A1"];

  const updateConfig = (section: keyof DeleteConfig, field: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const toggleTrack = (type: keyof DeleteConfig, trackId: string) => {
    const current = config[type].tracksToDelete;
    if (current.includes(trackId)) {
      updateConfig(type, "tracksToDelete", current.filter(id => id !== trackId));
    } else {
      updateConfig(type, "tracksToDelete", [...current, trackId]);
    }
  };

  const handleDelete = () => {
    onDeleteTracks(config);
    onClose();
  };

  const hasSelection = 
    config.video.tracksToDelete.length > 0 ||
    config.audio.tracksToDelete.length > 0 ||
    config.text.tracksToDelete.length > 0 ||
    config.subtitle.tracksToDelete.length > 0;

  const renderTrackList = (trackList: Track[], type: keyof DeleteConfig) => {
    if (trackList.length === 0) {
      return <div className="text-[9px] text-muted-foreground/50 pl-1">No tracks</div>;
    }
    
    return trackList.map(track => {
      const isProtected = protectedTracks.includes(track.name);
      const isSelected = config[type].tracksToDelete.includes(track.id);
      
      return (
        <label
          key={track.id}
          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
            isProtected 
              ? "opacity-40 cursor-not-allowed" 
              : isSelected 
                ? "bg-red-500/20" 
                : "hover:bg-white/5"
          }`}
        >
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isProtected}
            onChange={() => toggleTrack(type, track.id)}
            className="w-3 h-3"
          />
          <span className="text-[10px]">{track.name}</span>
          {isProtected && <span className="text-[8px] text-muted-foreground">(protected)</span>}
        </label>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-sidebar border border-border rounded-lg shadow-xl w-[420px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-xs font-medium">Delete Track</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Video Tracks */}
          <div className="border border-dashed border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={config.video.enabled}
                onChange={(e) => updateConfig("video", "enabled", e.target.checked)}
                className="w-3 h-3"
              />
              <span className="text-[10px] font-medium">Delete Video Tracks</span>
            </div>
            {config.video.enabled && (
              <div className="pl-5 space-y-1 max-h-20 overflow-y-auto">
                {renderTrackList(videoTracks, "video")}
              </div>
            )}
          </div>

          {/* Audio Tracks */}
          <div className="border border-dashed border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={config.audio.enabled}
                onChange={(e) => updateConfig("audio", "enabled", e.target.checked)}
                className="w-3 h-3"
              />
              <span className="text-[10px] font-medium">Delete Audio Tracks</span>
            </div>
            {config.audio.enabled && (
              <div className="pl-5 space-y-1 max-h-20 overflow-y-auto">
                {renderTrackList(audioTracks, "audio")}
              </div>
            )}
          </div>

          {/* Text Tracks */}
          <div className="border border-dashed border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={config.text.enabled}
                onChange={(e) => updateConfig("text", "enabled", e.target.checked)}
                className="w-3 h-3"
              />
              <span className="text-[10px] font-medium">Delete Text Tracks</span>
            </div>
            {config.text.enabled && (
              <div className="pl-5 space-y-1 max-h-20 overflow-y-auto">
                {renderTrackList(textTracks, "text")}
              </div>
            )}
          </div>

          {/* Subtitle Tracks */}
          <div className="border border-dashed border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={config.subtitle.enabled}
                onChange={(e) => updateConfig("subtitle", "enabled", e.target.checked)}
                className="w-3 h-3"
              />
              <span className="text-[10px] font-medium">Delete Subtitle Tracks</span>
            </div>
            {config.subtitle.enabled && (
              <div className="pl-5 space-y-1 max-h-20 overflow-y-auto">
                {renderTrackList(subtitleTracks, "subtitle")}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-border">
          <button
            onClick={handleDelete}
            disabled={!hasSelection}
            className="px-4 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}