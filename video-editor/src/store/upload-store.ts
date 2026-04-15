/**
 * upload-store - Pure React implementation
 * Uses engine store for state, no Zustand
 */

import { useCallback } from "react";
import { probeMediaFile, type MediaAsset } from "@/features/editor/utils/media-probe";
import {
  engineStore,
  createTrack,
  nanoid,
  type Clip,
  type UploadedFile,
  type ProjectFolder,
} from "@/features/editor/engine/engine-core";
import {
  addTrack,
  addClip,
  selectClip,
  setCanvas,
  addUpload as addUploadCmd,
  removeUpload as removeUploadCmd,
  clearUploads as clearUploadsCmd,
  addFolder as addFolderCmd,
  removeFolder as removeFolderCmd,
  renameFolder as renameFolderCmd,
  moveFileToFolder as moveFileToFolderCmd,
  addMediaAsset as addMediaAssetCmd,
  setUploadModal,
} from "@/features/editor/engine/commands";
import { selectOrderedTracks } from "@/features/editor/engine/selectors";
import { useUploads, useFolders, useMediaAssets, useShowUploadModal } from "@/features/editor/engine";

export function useUploadStore() {
  const uploads = useUploads();
  const folders = useFolders();
  const mediaAssets = useMediaAssets();
  const showUploadModal = useShowUploadModal();

  return {
    uploads,
    folders,
    mediaAssets,
    showUploadModal,
  };
}

export function useUploadStoreWithActions() {
  const uploads = useUploads();
  const folders = useFolders();
  const mediaAssets = useMediaAssets();
  const showUploadModal = useShowUploadModal();

  const addUpload = useCallback((upload: UploadedFile) => {
    engineStore.dispatch(addUploadCmd(upload));
  }, []);

  const addFolder = useCallback((folder: ProjectFolder) => {
    engineStore.dispatch(addFolderCmd(folder));
  }, []);

  const removeFolderAction = useCallback((id: string) => {
    engineStore.dispatch(removeFolderCmd(id));
  }, []);

  const renameFolderAction = useCallback((id: string, name: string) => {
    engineStore.dispatch(renameFolderCmd(id, name));
  }, []);

  const moveFileToFolderAction = useCallback((fileId: string, folderId: string | null) => {
    engineStore.dispatch(moveFileToFolderCmd(fileId, folderId));
  }, []);

  const addMediaAssetAction = useCallback((asset: MediaAsset) => {
    engineStore.dispatch(addMediaAssetCmd(asset));
  }, []);

  const removeUploadAction = useCallback((id: string) => {
    engineStore.dispatch(removeUploadCmd(id));
  }, []);

  const clearUploadsAction = useCallback(() => {
    engineStore.dispatch(clearUploadsCmd());
  }, []);

  const setShowUploadModalAction = useCallback((show: boolean) => {
    engineStore.dispatch(setUploadModal(show));
  }, []);

  return {
    uploads,
    folders,
    mediaAssets,
    showUploadModal,
    addUpload,
    addFolder,
    removeFolder: removeFolderAction,
    renameFolder: renameFolderAction,
    moveFileToFolder: moveFileToFolderAction,
    addMediaAsset: addMediaAssetAction,
    removeUpload: removeUploadAction,
    clearUploads: clearUploadsAction,
    setShowUploadModal: setShowUploadModalAction,
  };
}

export { type UploadedFile, type ProjectFolder };

export function addFileToTimeline(upload: UploadedFile): void {
  const state = engineStore.getState();
  const durationMs = (upload.duration ?? 5) * 1000;

  type ClipType = Clip["type"];
  const clipType: ClipType =
    upload.type === "audio"
      ? "audio"
      : upload.type === "image"
      ? "image"
      : "video";

  type TrackType = "video" | "audio" | "text" | "caption" | "overlay";
  const trackType: TrackType = upload.type === "audio" ? "audio" : "video";

  const existingTracks = selectOrderedTracks(state).filter(t => t.type === trackType);
  
  let track: ReturnType<typeof createTrack> | undefined;
  let startMs = 0;
  
  const allClips = Object.values(state.clips);
  
  for (const existingTrack of existingTracks) {
    const trackClipsOnThisTrack = allClips.filter(c => c && c.trackId === existingTrack.id);
    
    let lastClipEnd = 0;
    if (trackClipsOnThisTrack.length > 0) {
      lastClipEnd = Math.max(...trackClipsOnThisTrack.map(c => c.display.to));
    }
    
    if (lastClipEnd < 30000) {
      track = existingTrack;
      startMs = lastClipEnd + 100;
      break;
    }
  }
  
  if (!track && existingTracks.length > 0) {
    const maxOrder = Math.max(...existingTracks.map(t => t.order));
    track = createTrack(trackType, {
      name: `${trackType.toUpperCase()}${maxOrder + 2}`,
      order: maxOrder + 1,
    });
    engineStore.dispatch(addTrack(track));
  } else if (!track) {
    track = createTrack(trackType, {
      name: trackType === "audio" ? "A1" : "V1",
      order: 0,
    });
    engineStore.dispatch(addTrack(track));
  }

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

  engineStore.dispatch(selectClip(clipId));
}

export async function handleFileUpload(files: File[]): Promise<UploadedFile[]> {
  const uploaded: UploadedFile[] = [];

  for (const file of files) {
    try {
      const asset = await probeMediaFile(file);
      engineStore.dispatch(addMediaAssetCmd(asset));

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

      engineStore.dispatch(addUploadCmd(upload));
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