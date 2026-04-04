import { create } from "zustand";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_IMAGE, ADD_AUDIO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { probeMediaFile, type MediaAsset } from "@/features/editor/utils/media-probe";

export interface UploadedFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  type: "video" | "image" | "audio";
  objectUrl: string;
  status: "completed" | "uploading" | "failed";
  progress: number;
  createdAt: number;
  duration?: number;
  width?: number;
  height?: number;
}

interface IUploadStore {
  uploads: UploadedFile[];
  mediaAssets: MediaAsset[];
  addUpload: (upload: UploadedFile) => void;
  addMediaAsset: (asset: MediaAsset) => void;
  removeUpload: (id: string) => void;
  clearUploads: () => void;
  showUploadModal: boolean;
  setShowUploadModal: (show: boolean) => void;
}

export const useUploadStore = create<IUploadStore>((set) => ({
  uploads: [],
  mediaAssets: [],
  
  addUpload: (upload) =>
    set((state) => ({
      uploads: [upload, ...state.uploads]
    })),
  
  addMediaAsset: (asset) =>
    set((state) => ({
      mediaAssets: [asset, ...state.mediaAssets]
    })),
  
  removeUpload: (id) =>
    set((state) => ({
      uploads: state.uploads.filter((u) => u.id !== id)
    })),
  
  clearUploads: () => set({ uploads: [], mediaAssets: [] }),
  
  showUploadModal: false,
  setShowUploadModal: (show) => set({ showUploadModal: show })
}));

export function addFileToTimeline(upload: UploadedFile): void {
  const payload = {
    id: generateId(),
    details: {
      src: upload.objectUrl
    },
    metadata: {
      previewUrl: upload.type === "video" ? upload.objectUrl : undefined,
      duration: upload.duration,
      width: upload.width,
      height: upload.height,
    }
  };
  
  switch (upload.type) {
    case "video":
      dispatch(ADD_VIDEO, {
        payload,
        options: {
          resourceId: "main",
          scaleMode: "fit"
        }
      });
      break;
    case "image":
      dispatch(ADD_IMAGE, {
        payload: {
          ...payload,
          type: "image",
          display: { from: 0, to: (upload.duration || 5) * 1000 }
        },
        options: {}
      });
      break;
    case "audio":
      dispatch(ADD_AUDIO, {
        payload: {
          ...payload,
          type: "audio"
        },
        options: {}
      });
      break;
  }
}

export async function handleFileUpload(files: File[]): Promise<UploadedFile[]> {
  const { addUpload, addMediaAsset } = useUploadStore.getState();
  const uploaded: UploadedFile[] = [];
  
  for (const file of files) {
    try {
      const asset = await probeMediaFile(file);
      addMediaAsset(asset);
      
      const upload: UploadedFile = {
        id: asset.id,
        fileName: asset.name,
        filePath: `local/${Date.now()}_${asset.name}`,
        fileSize: file.size,
        contentType: file.type,
        type: asset.kind as "video" | "image" | "audio",
        objectUrl: asset.url || "",
        status: "completed",
        progress: 100,
        createdAt: Date.now(),
        duration: asset.duration,
        width: asset.width,
        height: asset.height,
      };
      
      addUpload(upload);
      uploaded.push(upload);
    } catch (error) {
      console.error(`Failed to probe ${file.name}:`, error);
    }
  }
  
  return uploaded;
}
