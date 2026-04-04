"use client";

import { useState, useCallback, useRef } from "react";
import useLayoutStore from "./store/use-layout-store";
import { useUploadStore, addFileToTimeline, type UploadedFile } from "@/store/upload-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  PanelRightClose,
  PanelRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
        "flex items-center justify-center flex-none h-8 w-8 cursor-pointer rounded-sm transition-all duration-200",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-white/5 hover:text-white"
      )}
      title={label}
    >
      {icon}
    </button>
  );
}

function MediaToolbar() {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
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
      
      for (const file of files) {
        const id = crypto.randomUUID();
        const objectUrl = URL.createObjectURL(file);
        
        let type: "video" | "image" | "audio" = "video";
        if (file.type.startsWith("image/")) type = "image";
        else if (file.type.startsWith("audio/")) type = "audio";
        
        const upload: UploadedFile = {
          id,
          fileName: file.name,
          filePath: `local/${Date.now()}_${file.name}`,
          fileSize: file.size,
          contentType: file.type,
          type,
          objectUrl,
          status: "completed",
          progress: 100,
          createdAt: Date.now()
        };
        
        addUpload(upload);
        
        if (type === "video") {
          const thumb = await extractVideoThumbnail(file);
          if (thumb) {
            setVideoThumbnails((prev) => ({ ...prev, [id]: thumb }));
          }
        }
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [addUpload, extractVideoThumbnail]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handlePanelClick = (panel: string) => {
    if (activePanel === panel) {
      setShowPanel(!showPanel);
    } else {
      setActivePanel(panel);
      setShowPanel(true);
    }
  };

  const handleAddToTimeline = (upload: UploadedFile) => {
    addFileToTimeline(upload);
  };

  const videoUploads = uploads.filter((u: UploadedFile) => u.type === "video");
  const imageUploads = uploads.filter((u: UploadedFile) => u.type === "image");
  const audioUploads = uploads.filter((u: UploadedFile) => u.type === "audio");

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
      
      <div className="relative flex items-center py-2 px-2 bg-primary/7 border-b w-full">
        <div className="overflow-x-auto scrollbar-hidden! w-full">
          <div className="flex items-center gap-1 w-fit mx-auto px-4">
            <ToolButton
              icon={<Upload className="w-4 h-4" />}
              label="Upload Media"
              onClick={handleUploadClick}
            />
            
            <div className="w-px h-6 bg-border/50 mx-1" />
            
            <ToolButton
              icon={<Type className="w-4 h-4" />}
              label="Text"
              onClick={() => handlePanelClick("texts")}
              isActive={activePanel === "texts"}
            />
            
            <ToolButton
              icon={<VideoIcon className="w-4 h-4" />}
              label="Videos"
              onClick={() => handlePanelClick("videos")}
              isActive={activePanel === "videos"}
            />
            
            <ToolButton
              icon={<CaptionsIcon className="w-4 h-4" />}
              label="Captions"
              onClick={() => handlePanelClick("captions")}
              isActive={activePanel === "captions"}
            />
            
            <ToolButton
              icon={<ImageIcon className="w-4 h-4" />}
              label="Images"
              onClick={() => handlePanelClick("images")}
              isActive={activePanel === "images"}
            />
            
            <ToolButton
              icon={<Music className="w-4 h-4" />}
              label="Audio"
              onClick={() => handlePanelClick("audios")}
              isActive={activePanel === "audios"}
            />
            
            <ToolButton
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <path d="M3 5.30359C3 3.93159 4.659 3.24359 5.629 4.21359L11.997 10.5826L10.583 11.9966L5 6.41359V17.5856L10.586 11.9996L10.583 11.9966L11.997 10.5826L12 10.5856L18.371 4.21459C19.341 3.24459 21 3.93159 21 5.30359V18.6956C21 20.0676 19.341 20.7556 18.371 19.7856L12 13.5L13.414 11.9996L19 17.5866V6.41359L13.414 11.9996L13.421 12.0056L12.006 13.4206L12 13.4136L5.629 19.7846C4.659 20.7546 3 20.0676 3 18.6956V5.30359Z" fill="currentColor"/>
                </svg>
              }
              label="Transitions"
              onClick={() => handlePanelClick("transitions")}
              isActive={activePanel === "transitions"}
            />
            
            <ToolButton
              icon={<Volume2 className="w-4 h-4" />}
              label="Volume"
              onClick={() => handlePanelClick("volume")}
              isActive={activePanel === "volume"}
            />
            
            <ToolButton
              icon={<AudioWaveform className="w-4 h-4" />}
              label="Waveform"
              onClick={() => handlePanelClick("waveform")}
              isActive={activePanel === "waveform"}
            />
          </div>
        </div>
        
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-card to-transparent z-10 pointer-events-none" />
      </div>

      {showPanel && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowPanel(false)}
          />
          <div className="absolute left-0 top-full mt-1 z-50 bg-card border rounded-md shadow-xl w-72 max-h-80 flex flex-col">
            <div className="flex items-center justify-between p-2 border-b">
              <span className="text-sm font-medium capitalize">
                {activePanel === "images" && "Images"}
                {activePanel === "videos" && "Videos"}
                {activePanel === "audios" && "Audio"}
                {activePanel === "texts" && "Text Templates"}
                {activePanel === "captions" && "Captions"}
                {activePanel === "transitions" && "Transitions"}
                {activePanel === "volume" && "Volume"}
                {activePanel === "waveform" && "Waveform"}
              </span>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <ScrollArea className="flex-1 p-2">
              {activePanel === "images" && (
                imageUploads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No images uploaded</p>
                    <Button size="sm" variant="link" onClick={handleUploadClick} className="mt-2">
                      Upload Images
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {imageUploads.map((image) => (
                      <div
                        key={image.id}
                        className="aspect-square cursor-pointer hover:ring-2 hover:ring-primary rounded overflow-hidden relative group"
                        onClick={() => handleAddToTimeline(image)}
                      >
                        <img
                          src={image.objectUrl}
                          alt={image.fileName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-xs text-white">Add</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
              
              {activePanel === "videos" && (
                videoUploads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <VideoIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No videos uploaded</p>
                    <Button size="sm" variant="link" onClick={handleUploadClick} className="mt-2">
                      Upload Videos
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {videoUploads.map((video) => (
                      <div
                        key={video.id}
                        className="aspect-video cursor-pointer hover:ring-2 hover:ring-primary rounded overflow-hidden relative group"
                        onClick={() => handleAddToTimeline(video)}
                      >
                        {videoThumbnails[video.id] ? (
                          <img
                            src={videoThumbnails[video.id]}
                            alt={video.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <VideoIcon className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-[10px] text-white truncate">{video.fileName}</p>
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-xs text-white">Add</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
              
              {activePanel === "audios" && (
                audioUploads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No audio uploaded</p>
                    <Button size="sm" variant="link" onClick={handleUploadClick} className="mt-2">
                      Upload Audio
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {audioUploads.map((audio) => (
                      <div
                        key={audio.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer group"
                        onClick={() => handleAddToTimeline(audio)}
                      >
                        <Music className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{audio.fileName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {(audio.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
              
              {activePanel === "texts" && (
                <div className="text-center py-8 text-muted-foreground">
                  <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click to add text</p>
                  <Button size="sm" variant="link" className="mt-2">
                    Text Templates
                  </Button>
                </div>
              )}
              
              {activePanel === "captions" && (
                <div className="text-center py-8 text-muted-foreground">
                  <CaptionsIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Auto-generate captions</p>
                  <Button size="sm" variant="link" className="mt-2">
                    Caption Settings
                  </Button>
                </div>
              )}
              
              {activePanel === "transitions" && (
                <div className="text-center py-8 text-muted-foreground">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 mx-auto mb-2 opacity-50">
                    <path d="M3 5.30359C3 3.93159 4.659 3.24359 5.629 4.21359L11.997 10.5826L10.583 11.9966L5 6.41359V17.5856L10.586 11.9996L10.583 11.9966L11.997 10.5826L12 10.5856L18.371 4.21459C19.341 3.24459 21 3.93159 21 5.30359V18.6956C21 20.0676 19.341 20.7556 18.371 19.7856L12 13.5L13.414 11.9996L19 17.5866V6.41359L13.414 11.9996L13.421 12.0056L12.006 13.4206L12 13.4136L5.629 19.7846C4.659 20.7546 3 20.0676 3 18.6956V5.30359Z" fill="currentColor"/>
                  </svg>
                  <p className="text-sm">Transitions</p>
                  <Button size="sm" variant="link" className="mt-2">
                    Browse Transitions
                  </Button>
                </div>
              )}
              
              {activePanel === "volume" && (
                <div className="text-center py-8 text-muted-foreground">
                  <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Volume Control</p>
                </div>
              )}
              
              {activePanel === "waveform" && (
                <div className="text-center py-8 text-muted-foreground">
                  <AudioWaveform className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Audio Waveform</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}

export default MediaToolbar;
