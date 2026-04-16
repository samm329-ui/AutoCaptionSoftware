"use client";

import { useState, useCallback, useRef } from "react";
import { useUploadStore, addFileToTimeline, type UploadedFile, handleFileUpload } from "@/store/upload-store";
import {
  Video as VideoIcon,
  Image as ImageIcon,
  Music,
  Upload,
  Type,
  CaptionsIcon,
  Volume2,
  AudioWaveform,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { engineStore, createTrack, type Clip } from "./engine/engine-core";
import { addTrack, addClip, selectClip } from "./engine/commands";
import { selectOrderedTracks } from "./engine/selectors";
import { nanoid } from "nanoid";

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

function ToolButton({ icon, label, onClick, isActive }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center flex-none h-7.5 w-7.5 cursor-pointer rounded-sm transition-all duration-200 shrink-0",
        isActive
          ? "bg-white/10 text-white"
          : "text-muted-foreground hover:bg-white/5 hover:text-white"
      )}
      title={label}
    >
      {icon}
    </button>
  );
}

function MediaToolbar() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploads, addUpload } = useUploadStore();
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>({});

  const extractVideoThumbnail = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.currentTime = 1;
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      video.onerror = () => resolve("");
    });
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      await handleFileUpload(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleAddText = () => {
    const state = engineStore.getState();
    const ordered = selectOrderedTracks(state);
    const textTracks = ordered.filter(t => t.type === "text");
    
    let track;
    let startMs = 0;
    
    if (textTracks.length > 0) {
      let bestTrack = textTracks[0];
      let maxEndMs = 0;
      
      for (const t of textTracks) {
        const trackClips = Object.values(state.clips).filter(c => c?.trackId === t.id);
        if (trackClips.length > 0) {
          const lastEnd = Math.max(...trackClips.map(c => c.display.to));
          if (lastEnd > maxEndMs) {
            maxEndMs = lastEnd;
            bestTrack = t;
          }
        } else if (maxEndMs === 0) {
          bestTrack = t;
        }
      }
      
      track = bestTrack;
      const trackClips = Object.values(state.clips).filter(c => c?.trackId === track!.id);
      startMs = trackClips.length > 0 ? Math.max(...trackClips.map(c => c.display.to)) : 0;
    } else {
      track = createTrack("text", { name: "T1", order: ordered.length });
      engineStore.dispatch(addTrack(track));
    }
    
    const clipId = nanoid();
    const clip: Clip = {
      id: clipId, trackId: track.id, type: "text", name: "Text",
      display: { from: startMs, to: startMs + 5000 },
      trim: { from: 0, to: 5000 },
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, opacity: 1, flipX: false, flipY: false },
      details: { text: "New Text", fontSize: 80, color: "#ffffff", fontFamily: "Inter", textAlign: "center" },
      appliedEffects: [], effectIds: [], keyframeIds: [],
    };
    engineStore.dispatch(addClip(clip, track.id));
    engineStore.dispatch(selectClip(clipId));
  };

  const handleAddCaption = () => {
    const state = engineStore.getState();
    const ordered = selectOrderedTracks(state);
    const captionTracks = ordered.filter(t => t.type === "caption");
    
    let track;
    let startMs = 0;
    
    if (captionTracks.length > 0) {
      let bestTrack = captionTracks[0];
      let maxEndMs = 0;
      
      for (const t of captionTracks) {
        const trackClips = Object.values(state.clips).filter(c => c?.trackId === t.id);
        if (trackClips.length > 0) {
          const lastEnd = Math.max(...trackClips.map(c => c.display.to));
          if (lastEnd > maxEndMs) {
            maxEndMs = lastEnd;
            bestTrack = t;
          }
        } else if (maxEndMs === 0) {
          bestTrack = t;
        }
      }
      
      track = bestTrack;
      const trackClips = Object.values(state.clips).filter(c => c?.trackId === track!.id);
      startMs = trackClips.length > 0 ? Math.max(...trackClips.map(c => c.display.to)) : 0;
    } else {
      track = createTrack("caption", { name: "S1", order: ordered.length });
      engineStore.dispatch(addTrack(track));
    }
    
    const clipId = nanoid();
    const clip: Clip = {
      id: clipId, trackId: track.id, type: "caption", name: "Caption",
      display: { from: startMs, to: startMs + 5000 },
      trim: { from: 0, to: 5000 },
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, opacity: 1, flipX: false, flipY: false },
      details: { text: "Caption", fontSize: 60, color: "#ffffff", textAlign: "center" },
      appliedEffects: [], effectIds: [], keyframeIds: [],
    };
    engineStore.dispatch(addClip(clip, track.id));
    engineStore.dispatch(selectClip(clipId));
  };

  const videoUploads = uploads.filter((u) => u.type === "video");
  const imageUploads = uploads.filter((u) => u.type === "image");
  const audioUploads = uploads.filter((u) => u.type === "audio");

  return (
    <div className="flex w-full">
      <input
        type="file"
        accept="video/*,image/*,audio/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        id="media-toolbar-file-input"
        ref={fileInputRef}
      />
      
      <div 
        className="relative flex items-center py-2 px-2 bg-primary/7 border-b w-full"
        onClick={() => openDropdown && setOpenDropdown(null)}
      >
        <div className="overflow-x-auto scrollbar-hidden! w-full flex items-center">
          <div className="flex items-center gap-2 w-fit mx-auto px-4">
            <ToolButton
              icon={<Upload className="w-3.5 h-3.5" />}
              label="Upload Media"
              onClick={() => fileInputRef.current?.click()}
            />
            
            <ToolButton
              icon={<Type className="w-3.5 h-3.5" />}
              label="Text"
              onClick={handleAddText}
            />
            
            <div className="relative">
              <ToolButton
                icon={<VideoIcon className="w-3.5 h-3.5" />}
                label="Videos"
                onClick={() => setOpenDropdown(openDropdown === "videos" ? null : "videos")}
                isActive={openDropdown === "videos"}
              />
              {openDropdown === "videos" && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-card border rounded-md shadow-lg z-50 p-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-2 pb-2 border-b">
                    <span className="text-sm font-medium">Videos</span>
                    <button onClick={() => setOpenDropdown(null)} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
                  </div>
                  {videoUploads.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No videos uploaded
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {videoUploads.map((video) => (
                        <button
                          key={video.id}
                          onClick={() => { addFileToTimeline(video); setOpenDropdown(null); }}
                          className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left"
                        >
                          <VideoIcon className="w-4 h-4 shrink-0" />
                          <span className="text-sm truncate">{video.fileName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => { fileInputRef.current?.click(); setOpenDropdown(null); }}
                    className="w-full mt-2 flex items-center justify-center gap-2 p-2 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Video
                  </button>
                </div>
              )}
            </div>
            
            <ToolButton
              icon={<CaptionsIcon className="w-3.5 h-3.5" />}
              label="Captions"
              onClick={handleAddCaption}
            />
            
            <div className="relative">
              <ToolButton
                icon={<ImageIcon className="w-3.5 h-3.5" />}
                label="Images"
                onClick={() => setOpenDropdown(openDropdown === "images" ? null : "images")}
                isActive={openDropdown === "images"}
              />
              {openDropdown === "images" && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-card border rounded-md shadow-lg z-50 p-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-2 pb-2 border-b">
                    <span className="text-sm font-medium">Images</span>
                    <button onClick={() => setOpenDropdown(null)} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
                  </div>
                  {imageUploads.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No images uploaded
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {imageUploads.map((image) => (
                        <button
                          key={image.id}
                          onClick={() => { addFileToTimeline(image); setOpenDropdown(null); }}
                          className="aspect-square rounded overflow-hidden hover:ring-2 hover:ring-primary"
                        >
                          <img src={image.objectUrl} alt={image.fileName} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => { fileInputRef.current?.click(); setOpenDropdown(null); }}
                    className="w-full mt-2 flex items-center justify-center gap-2 p-2 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </button>
                </div>
              )}
            </div>
            
            <div className="relative">
              <ToolButton
                icon={<Music className="w-3.5 h-3.5" />}
                label="Audio"
                onClick={() => setOpenDropdown(openDropdown === "audios" ? null : "audios")}
                isActive={openDropdown === "audios"}
              />
              {openDropdown === "audios" && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-card border rounded-md shadow-lg z-50 p-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-2 pb-2 border-b">
                    <span className="text-sm font-medium">Audio</span>
                    <button onClick={() => setOpenDropdown(null)} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
                  </div>
                  {audioUploads.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No audio uploaded
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {audioUploads.map((audio) => (
                        <button
                          key={audio.id}
                          onClick={() => { addFileToTimeline(audio); setOpenDropdown(null); }}
                          className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left"
                        >
                          <Music className="w-4 h-4 shrink-0" />
                          <span className="text-sm truncate">{audio.fileName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => { fileInputRef.current?.click(); setOpenDropdown(null); }}
                    className="w-full mt-2 flex items-center justify-center gap-2 p-2 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Audio
                  </button>
                </div>
              )}
            </div>
            
            <ToolButton
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                  <path d="M3 5.30359C3 3.93159 4.659 3.24359 5.629 4.21359L11.997 10.5826L10.583 11.9966L5 6.41359V17.5856L10.586 11.9996L10.583 11.9966L11.997 10.5826L12 10.5856L18.371 4.21459C19.341 3.24459 21 3.93159 21 5.30359V18.6956C21 20.0676 19.341 20.7556 18.371 19.7856L12 13.5L13.414 11.9996L19 17.5866V6.41359L13.414 11.9996L13.421 12.0056L12.006 13.4206L12 13.4136L5.629 19.7846C4.659 20.7546 3 20.0676 3 18.6956V5.30359Z" fill="currentColor"/>
                </svg>
              }
              label="Transitions"
              onClick={() => {}}
            />
            
            <ToolButton
              icon={<Volume2 className="w-3.5 h-3.5" />}
              label="Volume"
              onClick={() => {}}
            />
            
            <ToolButton
              icon={<AudioWaveform className="w-3.5 h-3.5" />}
              label="Waveform"
              onClick={() => {}}
            />
          </div>
        </div>
        
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-card to-transparent z-10 pointer-events-none" />
      </div>
    </div>
  );
}

export default MediaToolbar;
