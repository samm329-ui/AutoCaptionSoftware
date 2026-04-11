import { create } from "zustand";
import { probeMediaFile, type MediaAsset } from "@/features/editor/utils/media-probe";
import useStore from "@/features/editor/store/use-store";

export interface UploadedFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  type: "video" | "image" | "audio" | "adjustment" | "colormatte";
  objectUrl: string;
  file?: File;
  status: "completed" | "uploading" | "failed";
  progress: number;
  createdAt: number;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  color?: string;
  folderId?: string | null;
}

export interface ProjectFolder {
  id: string;
  name: string;
  createdAt: number;
}

interface IUploadStore {
  uploads: UploadedFile[];
  folders: ProjectFolder[];
  mediaAssets: MediaAsset[];
  addUpload: (upload: UploadedFile) => void;
  addFolder: (folder: ProjectFolder) => void;
  removeFolder: (id: string) => void;
  renameFolder: (id: string, name: string) => void;
  moveFileToFolder: (fileId: string, folderId: string | null) => void;
  addMediaAsset: (asset: MediaAsset) => void;
  removeUpload: (id: string) => void;
  clearUploads: () => void;
  showUploadModal: boolean;
  setShowUploadModal: (show: boolean) => void;
}

export const useUploadStore = create<IUploadStore>((set) => ({
  uploads: [],
  folders: [],
  mediaAssets: [],

  addUpload: (upload) =>
    set((state) => ({
      uploads: [upload, ...state.uploads]
    })),

  addFolder: (folder) =>
    set((state) => ({
      folders: [...state.folders, folder]
    })),

  removeFolder: (id) =>
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      uploads: state.uploads.map((u) =>
        u.folderId === id ? { ...u, folderId: undefined } : u
      ),
    })),

  renameFolder: (id, name) =>
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === id ? { ...f, name } : f
      ),
    })),

  moveFileToFolder: (fileId, folderId) =>
    set((state) => ({
      uploads: state.uploads.map((u) =>
        u.id === fileId ? { ...u, folderId } : u
      ),
    })),

  addMediaAsset: (asset) =>
    set((state) => ({
      mediaAssets: [asset, ...state.mediaAssets]
    })),

  removeUpload: (id) =>
    set((state) => ({
      uploads: state.uploads.filter((u) => u.id !== id)
    })),

  clearUploads: () => set({ uploads: [], folders: [], mediaAssets: [] }),

  showUploadModal: false,
  setShowUploadModal: (show) => set({ showUploadModal: show })
}));

function generateId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function addFileToTimeline(upload: UploadedFile): void {
  const store = useStore.getState();

  const videoWidth = upload.width ?? 1920;
  const videoHeight = upload.height ?? 1080;
  const videoFps = upload.fps ?? 30;

  if (videoWidth && videoHeight) {
    store.setState({
      size: { width: videoWidth, height: videoHeight },
    });
  }

  if (videoFps > 0) {
    store.setState({ fps: videoFps });
  }

  const itemId = upload.id || generateId();
  const duration = upload.duration ?? 5;

  const newItem = {
    id: itemId,
    type: upload.type,
    name: upload.fileName,
    display: {
      from: 0,
      to: duration * 1000,
    },
    trim: {
      from: 0,
      to: duration * 1000,
    },
    details: {
      src: upload.objectUrl,
      width: videoWidth,
      height: videoHeight,
      name: upload.fileName,
    },
    metadata: {
      previewUrl: upload.type === "video" ? upload.objectUrl : undefined,
      duration: upload.duration,
      width: upload.width,
      height: upload.height,
      fps: upload.fps,
    },
  };

  const newTrackItemIds = [...store.trackItemIds, itemId];
  const newTrackItemsMap = {
    ...store.trackItemsMap,
    [itemId]: newItem,
  };

  store.setState({
    trackItemIds: newTrackItemIds,
    trackItemsMap: newTrackItemsMap,
    duration: Math.max(store.duration, duration * 1000),
  });
}

export async function handleFileUpload(files: File[]): Promise<UploadedFile[]> {
  const { addUpload, addMediaAsset } = useUploadStore.getState();
  const uploaded: UploadedFile[] = [];

  for (const file of files) {
    try {
      const asset = await probeMediaFile(file);
      addMediaAsset(asset);

      const objectUrl = URL.createObjectURL(file);

      const upload: UploadedFile = {
        id: asset.id,
        fileName: asset.name,
        filePath: `local/${Date.now()}_${asset.name}`,
        fileSize: file.size,
        contentType: file.type,
        type: asset.kind as "video" | "image" | "audio",
        objectUrl,
        file,
        status: "completed",
        progress: 100,
        createdAt: Date.now(),
        duration: asset.duration,
        width: asset.width,
        height: asset.height,
        fps: asset.fps,
      };

      addUpload(upload);
      uploaded.push(upload);
    } catch (error) {
      console.error(`Failed to probe ${file.name}:`, error);
    }
  }

  return uploaded;
}

export function extractAudioFromVideoToTimeline(
  _src: string,
  _id: string,
  _fileName: string,
  _displayFrom: number
): void {
  console.warn("extractAudioFromVideoToTimeline not implemented - audio extraction needs implementation");
}
