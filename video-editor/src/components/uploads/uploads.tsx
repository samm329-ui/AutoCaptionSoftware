import { useCallback, useState, useRef } from "react";
import { useUploadStore, addFileToTimeline, type UploadedFile } from "@/store/upload-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video as VideoIcon, Image as ImageIcon, Music, Upload, X } from "lucide-react";
import { probeMediaFile } from "@/features/editor/utils/media-probe";

export function extractVideoThumbnail(file: File): Promise<string> {
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
}

export function Uploads() {
  const { uploads, showUploadModal, setShowUploadModal, addUpload } = useUploadStore();
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  }, []);

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    
    for (const file of selectedFiles) {
      const id = crypto.randomUUID();
      const objectUrl = URL.createObjectURL(file);
      
      let type: "video" | "image" | "audio" = "video";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("audio/")) type = "audio";
      
      // Probe media file for ALL metadata (duration, fps, resolution)
      let mediaInfo = {
        duration: 5,
        width: 1920,
        height: 1080,
        fps: 30
      };
      
      try {
        const probed = await probeMediaFile(file);
        mediaInfo = {
          duration: probed.duration,
          width: probed.width,
          height: probed.height,
          fps: probed.fps
        };
      } catch (e) {
        console.warn('Failed to probe media:', e);
      }
      
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
        createdAt: Date.now(),
        duration: mediaInfo.duration,
        width: mediaInfo.width,
        height: mediaInfo.height,
        fps: mediaInfo.fps
      };
      
      addUpload(upload);
      
      if (type === "video") {
        const thumb = await extractVideoThumbnail(file);
        if (thumb) {
          setVideoThumbnails((prev) => ({ ...prev, [id]: thumb }));
        }
      }
    }
    
    setSelectedFiles([]);
    setIsUploading(false);
    setShowUploadModal(false);
  };

  const handleAddToTimeline = (upload: UploadedFile) => {
    addFileToTimeline(upload);
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      <div className="p-4 border-b">
        <Button
          className="w-full"
          onClick={() => setShowUploadModal(true)}
          variant="outline"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Media
        </Button>
      </div>

      {showUploadModal && (
        <div 
          className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowUploadModal(false)}
        >
          <div 
            className="bg-background rounded-lg p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Upload Media</h2>
              <button 
                onClick={() => setShowUploadModal(false)} 
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <input
              type="file"
              accept="video/*,image/*,audio/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
              ref={fileInputRef}
            />
            
            <label
              htmlFor="file-input"
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer block mb-4 hover:border-primary/50 hover:bg-muted/50 transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Video, Image, or Audio
              </p>
            </label>
            
            {selectedFiles.length > 0 && (
              <div className="mb-4 max-h-40 overflow-y-auto border rounded p-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 py-2 border-b last:border-b-0">
                    <span className="flex-1 truncate text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <button 
                      onClick={() => handleRemoveFile(index)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
                className="flex-1"
              >
                {isUploading ? "Uploading..." : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {uploads.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No uploads yet</p>
            <p className="text-xs mt-1">Upload videos, images, or audio</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            {uploads.filter((u) => u.type === "video").length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <VideoIcon className="w-4 h-4" />
                  <span className="font-medium text-sm">Videos</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {uploads
                    .filter((u) => u.type === "video")
                    .map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        thumbnail={videoThumbnails[video.id]}
                        onAdd={() => handleAddToTimeline(video)}
                      />
                    ))}
                </div>
              </div>
            )}

            {uploads.filter((u) => u.type === "image").length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4" />
                  <span className="font-medium text-sm">Images</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {uploads
                    .filter((u) => u.type === "image")
                    .map((image) => (
                      <ImageCard
                        key={image.id}
                        image={image}
                        onAdd={() => handleAddToTimeline(image)}
                      />
                    ))}
                </div>
              </div>
            )}

            {uploads.filter((u) => u.type === "audio").length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Music className="w-4 h-4" />
                  <span className="font-medium text-sm">Audio</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {uploads
                    .filter((u) => u.type === "audio")
                    .map((audio) => (
                      <AudioCard
                        key={audio.id}
                        audio={audio}
                        onAdd={() => handleAddToTimeline(audio)}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function VideoCard({
  video,
  thumbnail,
  onAdd
}: {
  video: UploadedFile;
  thumbnail?: string;
  onAdd: () => void;
}) {
  return (
    <Card
      className="aspect-square cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden relative"
      onClick={onAdd}
    >
      {thumbnail ? (
        <img src={thumbnail} alt={video.fileName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <VideoIcon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="text-[10px] text-white truncate">{video.fileName}</p>
      </div>
    </Card>
  );
}

function ImageCard({
  image,
  onAdd
}: {
  image: UploadedFile;
  onAdd: () => void;
}) {
  return (
    <Card
      className="aspect-square cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden relative"
      onClick={onAdd}
    >
      <img src={image.objectUrl} alt={image.fileName} className="w-full h-full object-cover" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="text-[10px] text-white truncate">{image.fileName}</p>
      </div>
    </Card>
  );
}

function AudioCard({
  audio,
  onAdd
}: {
  audio: UploadedFile;
  onAdd: () => void;
}) {
  return (
    <Card
      className="p-3 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
      onClick={onAdd}
    >
      <div className="flex items-center gap-2">
        <Music className="w-6 h-6 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-xs truncate">{audio.fileName}</p>
          <p className="text-[10px] text-muted-foreground">
            {(audio.fileSize / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>
    </Card>
  );
}

export default Uploads;
