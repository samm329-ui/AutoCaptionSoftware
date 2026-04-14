import { create } from "zustand";
import { probeMediaFile, type MediaAsset } from "@/features/editor/utils/media-probe";
import {
  engineStore,
  createTrack,
  nanoid,
  type Clip,
} from "@/features/editor/engine/engine-core";
import {
  addTrack,
  addClip,
  selectClip,
  setCanvas,
} from "@/features/editor/engine/commands";
import { selectOrderedTracks } from "@/features/editor/engine/selectors";

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

/**
 * addFileToTimeline — engine-first
 *
 * 1. Find or create a track of the correct type.
 * 2. Dispatch ADD_CLIP with a proper engine Clip shape.
 * 3. Update canvas / fps / duration through engine commands.
 * 4. Select the new clip.
 *
 * Never writes to Zustand trackItemsMap / trackItemIds.
 */
export function addFileToTimeline(upload: UploadedFile): void {
  const state = engineStore.getState();
  const durationMs = (upload.duration ?? 5) * 1000;

  // ── 1. Determine clip type ────────────────────────────────────────────────
  type ClipType = Clip["type"];
  const clipType: ClipType =
    upload.type === "audio"
      ? "audio"
      : upload.type === "image"
      ? "image"
      : "video";

  type TrackType = "video" | "audio" | "text" | "caption" | "overlay";
  const trackType: TrackType = upload.type === "audio" ? "audio" : "video";

  // ── 2. Find existing track of matching type or create one ─────────────────
  const existingTracks = selectOrderedTracks(state);
  let track = existingTracks.find((t) => t.type === trackType);

  if (!track) {
    track = createTrack(trackType, {
      name: trackType === "audio" ? "Audio" : "Video",
      order: existingTracks.length,
    });
    engineStore.dispatch(addTrack(track));
  }

  // ── 3. Calculate placement ────────────────────────────────
  // Place after last clip on this track to avoid overlap
  const trackClips = Object.values(engineStore.getState().clips).filter(
    (c) => c && c.trackId === track!.id
  );
  let startMs = 0;
  if (trackClips.length > 0) {
    const maxEnd = Math.max(...trackClips.map(c => c.display.to));
    startMs = maxEnd + 100; // 100ms gap
  }

  // ── 4. Build the clip ─────────────────────────────────────────────────────
  const clipId = upload.id || nanoid();
  const clip: Clip = {
    id: clipId,
    type: clipType,
    trackId: track.id,
    assetId: upload.id,
    name: upload.fileName,
    display: { from: startMs, to: startMs + durationMs },
    trim: { from: 0, to: durationMs },
    transform: {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotate: 0,
      opacity: 1,
      flipX: false,
      flipY: false,
    },
    details: {
      src: upload.objectUrl,
      width: upload.width ?? 1920,
      height: upload.height ?? 1080,
      name: upload.fileName,
      volume: 100,
      playbackRate: 1,
    },
    appliedEffects: [],
    effectIds: [],
    keyframeIds: [],
    metadata: {
      previewUrl: upload.type === "video" ? upload.objectUrl : undefined,
      duration: upload.duration,
      width: upload.width,
      height: upload.height,
      fps: upload.fps,
    },
  };

  engineStore.dispatch(addClip(clip, track.id));

  // ── 5. Update canvas size for first video/image clip ─────────────────────
  if (
    (clipType === "video" || clipType === "image") &&
    upload.width &&
    upload.height
  ) {
    const seq = engineStore.getState().sequences[engineStore.getState().rootSequenceId];
    if (seq && Object.keys(engineStore.getState().clips).length === 1) {
      engineStore.dispatch(setCanvas(upload.width, upload.height));
    }
  }

  // ── 6. Extend sequence duration if needed ────────────────────────────────
  const newEndMs = startMs + durationMs;
  const currentSeq = engineStore.getState().sequences[engineStore.getState().rootSequenceId];
  if (currentSeq && newEndMs > currentSeq.duration) {
    const updatedSeq = { ...currentSeq, duration: newEndMs + 2000 };
    engineStore.dispatch({
      type: "LOAD_PROJECT",
      payload: {
        project: {
          ...engineStore.getState(),
          sequences: {
            ...engineStore.getState().sequences,
            [engineStore.getState().rootSequenceId]: updatedSeq,
          },
        },
      },
    });
  }

  // ── 7. Select the new clip ────────────────────────────────────────────────
  engineStore.dispatch(selectClip(clipId));
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
