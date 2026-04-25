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
  setFps,
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
import { selectSequenceTracks, selectTracksByGroup } from "@/features/editor/engine/selectors";
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

// Track type validation for file types
const FILE_TYPE_TO_TRACK_GROUP: Record<string, "video" | "audio" | "text" | "subtitle"> = {
  video: "video",
  image: "video",
  audio: "audio",
  text: "text",
  caption: "subtitle",
  adjustment: "video",
  colormatte: "video",
  overlay: "video",
  shape: "video",
  transition: "video",
};

export function getTrackGroupForFileType(fileType: string): "video" | "audio" | "text" | "subtitle" {
  return FILE_TYPE_TO_TRACK_GROUP[fileType] || "video";
}

export function validateFileTypeForTrack(fileType: string, trackGroup: string): { valid: boolean; error: string | null } {
  const requiredGroup = getTrackGroupForFileType(fileType);
  
  if (trackGroup !== requiredGroup) {
    const trackGroupLabel = trackGroup === "video" ? "Video" : trackGroup === "audio" ? "Audio" : trackGroup === "text" ? "Text" : "Subtitle";
    const fileGroupLabel = requiredGroup === "video" ? "Video/Image" : requiredGroup === "audio" ? "Audio" : requiredGroup === "text" ? "Text" : "Caption";
    
    return {
      valid: false,
      error: `${fileGroupLabel} clips cannot be moved to ${trackGroupLabel} tracks`,
    };
  }
  
  return { valid: true, error: null };
}

export { type UploadedFile, type ProjectFolder };

export function addFileToTimeline(upload: UploadedFile, targetTrackId?: string): { success: boolean; error: string | null } {
  const state = engineStore.getState();
  
  // Check if this is the FIRST clip - if so, set project settings
  const existingClips = Object.keys(state.clips || {}).length;
  const rootSeqId = state.rootSequenceId;
  const sequence = rootSeqId ? state.sequences[rootSeqId] : null;
  
  if (existingClips === 0 && upload.type === "video") {
    // First video sets PROJECT settings (canvas size and fps)
    const projectWidth = upload.width || 1920;
    const projectHeight = upload.height || 1080;
    const projectFps = upload.fps || 30;
    
    // Set canvas to match first video's resolution
    if (projectWidth && projectHeight) {
      engineStore.dispatch(setCanvas(projectWidth, projectHeight));
    }
    // Set FPS to match first video
    if (projectFps) {
      engineStore.dispatch(setFps(projectFps));
    }
  }
  
  // Use duration from upload (probed with correct metadata)
  const durationSec = upload.duration || 5;
  const durationMs = durationSec * 1000;
  const playheadTime = state.ui?.playheadTime ?? 0;

  type ClipType = Clip["type"];
  const clipType: ClipType =
    upload.type === "audio"
      ? "audio"
      : upload.type === "image"
      ? "image"
      : "video";

  type TrackType = "video" | "audio" | "text" | "caption" | "overlay";
  
  let trackType: TrackType;
  let trackGroup: "video" | "audio" | "text" | "subtitle";
  
  // Enforce strict track assignment based on file type
  if (upload.type === "audio") {
    // Audio MUST go to audio track only
    trackType = "audio";
    trackGroup = "audio";
  } else if (upload.type === "image") {
    // Image goes to video track (for display)
    trackType = "video";
    trackGroup = "video";
  } else if (upload.type === "video") {
    // Video MUST go to video track only
    trackType = "video";
    trackGroup = "video";
  } else {
    // Default to video track for unknown types
    trackType = "video";
    trackGroup = "video";
  }
  
  // If a specific target track is provided, use it directly
  let targetTrack: ReturnType<typeof createTrack> | undefined;
  let startMs = 0;
  
  if (targetTrackId) {
    // Use the specified track
    targetTrack = state.tracks[targetTrackId];
    if (!targetTrack) {
      return { success: false, error: "Target track not found" };
    }
    
    // VALIDATE: Check if file type is allowed on this track
    const trackGroup = targetTrack.group || (targetTrack.type === "audio" ? "audio" : targetTrack.type === "caption" ? "subtitle" : targetTrack.type === "text" ? "text" : "video");
    const uploadType = upload.type || "video";
    const validation = validateFileTypeForTrack(uploadType, trackGroup);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Get existing clips on this track to calculate start position
    const trackClips = Object.values(state.clips).filter(
      c => c && c.trackId === targetTrackId
    );
    if (trackClips.length > 0) {
      // Start at the end of existing clips (allow overlap by using max)
      // Actually user wants overlap supported, so we start at 0 or find gap
      // For now, let's append to end to allow overlap scenario
      startMs = Math.max(...trackClips.map(c => c.display.to));
    }
  }
  
  // Get tracks from the correct group (only if no specific target)
  let existingTracks: ReturnType<typeof createTrack>[] = [];
  if (!targetTrack) {
    existingTracks = selectTracksByGroup(trackGroup)(state);
  }
  
  const trackNumber = !targetTrack ? existingTracks.length + 1 : 1;
  const prefix = trackGroup === "video" ? "V" : trackGroup === "audio" ? "A" : trackGroup === "text" ? "T" : "S";
  const trackName = !targetTrack ? `${prefix}${trackNumber}` : targetTrack.name;
  
  let track: ReturnType<typeof createTrack> | undefined;
  
  if (targetTrack) {
    // Use provided track
    track = targetTrack;
  } else if (existingTracks.length > 0) {
    // Find the empty track or the one with lowest end time
    let bestTrack = existingTracks[0];
    let maxEndMs = 0;
    
    for (const t of existingTracks) {
      const trackClips = Object.values(state.clips).filter(
        c => c && c.trackId === t.id
      );
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
    const trackClips = Object.values(state.clips).filter(
      c => c && c.trackId === track!.id
    );
    if (trackClips.length > 0) {
      startMs = Math.max(...trackClips.map(c => c.display.to));
    } else {
      startMs = 0;
    }
  } else {
    // Create new track with proper name and order
    const newOrder = existingTracks.length;
    const newTrackName = `${prefix}${newOrder + 1}`;
    track = createTrack(trackType, {
      name: newTrackName,
      order: newOrder,
    });
engineStore.dispatch(addTrack(track));
    startMs = 0;
  }

  const clipId = nanoid();
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

  const currentSeq = state.sequences[state.rootSequenceId];
  if (currentSeq) {
    const newEndMs = startMs + durationMs;
    if (newEndMs > currentSeq.duration) {
      const updatedSeq = { ...currentSeq, duration: newEndMs };
      engineStore.dispatch({
        type: "LOAD_PROJECT",
        payload: {
          project: {
            ...state,
            sequences: {
              ...state.sequences,
              [state.rootSequenceId]: updatedSeq,
            },
          },
        },
      });
    }
  }

  engineStore.dispatch(selectClip(clipId));
  
  return { success: true, error: null };
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