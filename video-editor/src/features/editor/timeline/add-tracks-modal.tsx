"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Track } from "../engine/engine-core";

interface AddTracksModalProps {
  onClose: () => void;
  onAddTracks: (config: TrackConfig) => void;
  tracks: Track[];
}

interface TrackConfig {
  video: { enabled: boolean; amount: number; placement: string };
  audio: { enabled: boolean; amount: number; placement: string; trackType: string };
  submix: { enabled: boolean; amount: number; placement: string; trackType: string };
}

// Generate placement options based on existing tracks
function generatePlacementOptions(tracks: Track[], trackType: "video" | "audio" | "submix"): string[] {
  const filteredTracks = tracks.filter(t => {
    if (trackType === "video") return t.group === "video";
    if (trackType === "audio") return t.group === "audio";
    return false;
  });

  const options: string[] = ["At End"];
  
  for (const track of filteredTracks) {
    options.push(`After ${track.name}`);
  }
  
  return options;
}

// Get track type options
const AUDIO_TYPES = ["Stereo", "5.1", "Adaptive", "Mono"];

export default function AddTracksModal({ onClose, onAddTracks, tracks }: AddTracksModalProps) {
  const [config, setConfig] = useState<TrackConfig>({
    video: { enabled: true, amount: 1, placement: "At End" },
    audio: { enabled: true, amount: 1, placement: "At End", trackType: "Stereo" },
    submix: { enabled: false, amount: 1, placement: "At End", trackType: "Stereo" },
  });

  // Generate options for each section
  const videoOptions = generatePlacementOptions(tracks, "video");
  const audioOptions = generatePlacementOptions(tracks, "audio");

  const handleSubmit = () => {
    onAddTracks(config);
    onClose();
  };

  const updateConfig = (
    section: keyof TrackConfig,
    field: string,
    value: string | number | boolean
  ) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-sidebar border border-border rounded-lg shadow-xl w-[420px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-xs font-medium">Add Track</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Section 1: Add Video Tracks */}
          <div className="border border-dashed border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={config.video.enabled}
                onChange={(e) => updateConfig("video", "enabled", e.target.checked)}
                className="w-3 h-3"
              />
              <span className="text-[10px] font-medium">Add Video Tracks</span>
            </div>
            {config.video.enabled && (
              <div className="space-y-2 pl-5">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] text-muted-foreground w-16">Amount</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.video.amount}
                    onChange={(e) =>
                      updateConfig("video", "amount", parseInt(e.target.value) || 1)
                    }
                    className="w-12 px-2 py-1 text-xs bg-background border border-border rounded"
                  />
                  <span className="text-[9px] text-muted-foreground">How many tracks</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[10px] text-muted-foreground w-16">Placement</label>
                  <select
                    value={config.video.placement}
                    onChange={(e) =>
                      updateConfig("video", "placement", e.target.value)
                    }
                    className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded"
                  >
                    {videoOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Add Audio Tracks */}
          <div className="border border-dashed border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={config.audio.enabled}
                onChange={(e) => updateConfig("audio", "enabled", e.target.checked)}
                className="w-3 h-3"
              />
              <span className="text-[10px] font-medium">Add Audio Tracks</span>
            </div>
            {config.audio.enabled && (
              <div className="space-y-2 pl-5">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] text-muted-foreground w-16">Amount</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.audio.amount}
                    onChange={(e) =>
                      updateConfig("audio", "amount", parseInt(e.target.value) || 1)
                    }
                    className="w-12 px-2 py-1 text-xs bg-background border border-border rounded"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[10px] text-muted-foreground w-16">Placement</label>
                  <select
                    value={config.audio.placement}
                    onChange={(e) =>
                      updateConfig("audio", "placement", e.target.value)
                    }
                    className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded"
                  >
                    {audioOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[10px] text-muted-foreground w-16">Type</label>
                  <select
                    value={config.audio.trackType}
                    onChange={(e) =>
                      updateConfig("audio", "trackType", e.target.value)
                    }
                    className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded"
                  >
                    {AUDIO_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Add Audio Submix Tracks */}
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.submix.enabled}
                onChange={(e) => updateConfig("submix", "enabled", e.target.checked)}
                className="w-3 h-3"
              />
              <span className="text-[10px] font-medium">Add Audio Submix Tracks</span>
            </div>
            {config.submix.enabled && (
              <div className="space-y-2 pl-5">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] text-muted-foreground w-16">Amount</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.submix.amount}
                    onChange={(e) =>
                      updateConfig("submix", "amount", parseInt(e.target.value) || 1)
                    }
                    className="w-12 px-2 py-1 text-xs bg-background border border-border rounded"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[10px] text-muted-foreground w-16">Placement</label>
                  <select
                    value={config.submix.placement}
                    onChange={(e) =>
                      updateConfig("submix", "placement", e.target.value)
                    }
                    className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded"
                  >
                    {audioOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[10px] text-muted-foreground w-16">Type</label>
                  <select
                    value={config.submix.trackType}
                    onChange={(e) =>
                      updateConfig("submix", "trackType", e.target.value)
                    }
                    className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded"
                  >
                    {AUDIO_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-border">
          <button
            onClick={handleSubmit}
            className="px-4 py-1 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
          >
            OK
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