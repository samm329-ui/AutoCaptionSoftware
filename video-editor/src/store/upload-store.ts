import { create } from "zustand";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_IMAGE, ADD_AUDIO, EDIT_OBJECT } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { probeMediaFile, type MediaAsset } from "@/features/editor/utils/media-probe";
import useStore from "@/features/editor/store/use-store";

export interface UploadedFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  type: "video" | "image" | "audio";
  objectUrl: string;
  /** Original File object — needed for audio extraction */
  file?: File;
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
      };

      addUpload(upload);
      uploaded.push(upload);
    } catch (error) {
      console.error(`Failed to probe ${file.name}:`, error);
    }
  }

  return uploaded;
}

/** Extract audio PCM from a video File and return as WAV blob URL + duration */
async function extractAudioFromFile(
  file: File
): Promise<{ audioUrl: string; duration: number } | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new AudioContext();
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } finally {
      await audioContext.close();
    }

    if (audioBuffer.numberOfChannels === 0 || audioBuffer.length === 0) {
      return null;
    }

    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;

    // Interleave PCM samples
    let interleaved: Float32Array;
    if (numChannels === 2) {
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      interleaved = new Float32Array(left.length * 2);
      for (let i = 0; i < left.length; i++) {
        interleaved[i * 2] = left[i];
        interleaved[i * 2 + 1] = right[i];
      }
    } else {
      interleaved = audioBuffer.getChannelData(0);
    }

    // Build WAV
    const bitDepth = 16;
    const dataLength = interleaved.length * (bitDepth / 8);
    const totalLength = 44 + dataLength;
    const buffer = new ArrayBuffer(totalLength);
    const view = new DataView(buffer);

    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeStr(0, "RIFF");
    view.setUint32(4, totalLength - 8, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeStr(36, "data");
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < interleaved.length; i++) {
      const s = Math.max(-1, Math.min(1, interleaved[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    const wavBlob = new Blob([buffer], { type: "audio/wav" });
    return { audioUrl: URL.createObjectURL(wavBlob), duration: audioBuffer.duration };
  } catch (error) {
    console.error("Failed to extract audio:", error);
    return null;
  }
}

/** Create a video blob with NO audio track at all by re-encoding via canvas capture */
async function createSilentVideoBlob(
  file: File,
  durationMs: number
): Promise<string | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      const duration = (durationMs && durationMs > 0) ? durationMs / 1000 : video.duration;
      const fps = 30;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(fps);

      const rec = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: Math.max(2_000_000, w * h * 3),
      });
      const chunks: Blob[] = [];

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      rec.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const silentUrl = URL.createObjectURL(blob);
        URL.revokeObjectURL(objectUrl);
        resolve(silentUrl);
      };

      rec.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };

      video.currentTime = 0;
      video.onseeked = () => {
        rec.start(200);

        video.play().catch(() => {});

        const draw = () => {
          if (video.paused || video.ended) {
            setTimeout(() => {
              if (rec.state === "recording") rec.stop();
            }, 300);
            return;
          }
          ctx.drawImage(video, 0, 0, w, h);
          requestAnimationFrame(draw);
        };

        draw();

        setTimeout(() => {
          if (rec.state === "recording") {
            video.pause();
            rec.stop();
          }
        }, duration * 1000 + 500);
      };

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
    };
  });
}

/**
 * Extract audio from a video item and add it to the timeline.
 *
 * Logic:
 *  1. Find the original File from the upload store
 *  2. Extract audio as WAV from the File
 *  3. Create a truly silent video blob (no audio track — re-encoded via canvas)
 *  4. Replace the video's src with the silent blob URL
 *  5. Place extracted audio on an audio track DIRECTLY below the source video's track
 *  6. The audio clip and the video have the SAME duration
 */
export async function extractAudioFromVideoToTimeline(
  videoSrc: string,
  videoId: string,
  fileName?: string,
  displayFrom?: number
): Promise<string | null> {
  try {
    // ── 1. Find original File ──────────────────────────────────────
    const uploads = useUploadStore.getState().uploads;
    const uploadRecord = uploads.find(
      (u) => u.objectUrl === videoSrc || u.fileName === fileName
    );

    if (!uploadRecord?.file) {
      console.error("Cannot extract: original File not found for", videoSrc);
      return null;
    }

    // ── 2. Extract audio as WAV ───────────────────────────────────
    const audioResult = await extractAudioFromFile(uploadRecord.file);
    if (!audioResult) {
      console.error("No audio track found in video file");
      return null;
    }
    const { audioUrl, duration: audioDuration } = audioResult;

    // ── 3. Get video metadata from trackItemsMap ────────────────────
    const { trackItemsMap } = useStore.getState();
    const sourceVideo = trackItemsMap[videoId];
    const videoDurationMs =
      (sourceVideo?.metadata?.duration ?? audioDuration * 1000);

    // ── 4. Create a silent video blob (no audio track) ─────────────
    const silentUrl = await createSilentVideoBlob(
      uploadRecord.file,
      videoDurationMs
    );

    // ── 5. Replace video src with silent blob (permanent silence) ────
    if (silentUrl) {
      dispatch(EDIT_OBJECT, {
        payload: {
          [videoId]: {
            details: {
              src: silentUrl,
              previewUrl: silentUrl,
              volume: 1,
            },
            metadata: {
              hasExtractedAudio: true,
            },
          },
        },
      });
    } else {
      // Fallback: just mute
      dispatch(EDIT_OBJECT, {
        payload: {
          [videoId]: {
            details: { volume: 0 },
            metadata: { hasExtractedAudio: true },
          },
        },
      });
    }

    // ── 6. Register extracted audio in upload store ────────────────
    const uploadId = generateId();
    const upload: UploadedFile = {
      id: uploadId,
      fileName: `${uploadRecord.fileName?.replace(/\.[^.]+$/, "") || "extracted"}.wav`,
      filePath: `extracted/${uploadId}.wav`,
      fileSize: 0,
      contentType: "audio/wav",
      type: "audio",
      objectUrl: audioUrl,
      status: "completed",
      progress: 100,
      createdAt: Date.now(),
      duration: videoDurationMs / 1000,
    };
    useUploadStore.getState().addUpload(upload);

    // ── 7. Determine exact track position ────────────────────────────
    const tracks = useStore.getState().tracks;

    // Find the source video's track index
    const videoTrackIndex = tracks.findIndex((t) =>
      t.items.includes(videoId)
    );

    // Target: audio track goes DIRECTLY below the video track (videoTrackIndex + 1)
    // We insert BEFORE any existing audio tracks that might be below
    const AUDIO_TYPES = new Set([
      "audio",
      "linealAudioBars",
      "radialAudioBars",
      "waveAudioBars",
      "hillAudioBars",
    ]);

    // Find all audio tracks below the video track
    const audioTracksBelow = tracks
      .map((t, i) => ({ track: t, index: i }))
      .filter(
        ({ track, index }) =>
          AUDIO_TYPES.has(track.type) && index > videoTrackIndex
      );

    // Place audio: either just below video track (if no audio tracks below),
    // or at the position of the first audio track below (shifting it down)
    const targetIndex =
      audioTracksBelow.length > 0
        ? audioTracksBelow[0].index
        : videoTrackIndex >= 0
          ? videoTrackIndex + 1
          : tracks.length;

    // ── 8. Add audio to timeline ───────────────────────────────────
    dispatch(ADD_AUDIO, {
      payload: {
        id: generateId(),
        details: { src: audioUrl, volume: 100 },
        metadata: {
          previewUrl: audioUrl,
          duration: videoDurationMs,
          isExtractedAudio: true,
          sourceVideoId: videoId,
        },
        type: "audio",
        display: {
          from: displayFrom ?? 0,
          to: (displayFrom ?? 0) + videoDurationMs,
        },
      },
      options: {
        targetTrackIndex: targetIndex,
      },
    });

    return audioUrl;
  } catch (error) {
    console.error("Failed to extract audio:", error);
    return null;
  }
}
