import { create } from "zustand";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_IMAGE, ADD_AUDIO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";

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
}

interface IUploadStore {
  uploads: UploadedFile[];
  addUpload: (upload: UploadedFile) => void;
  removeUpload: (id: string) => void;
  clearUploads: () => void;
  showUploadModal: boolean;
  setShowUploadModal: (show: boolean) => void;
}

export const useUploadStore = create<IUploadStore>((set) => ({
  uploads: [],
  
  addUpload: (upload) =>
    set((state) => ({
      uploads: [upload, ...state.uploads]
    })),
  
  removeUpload: (id) =>
    set((state) => ({
      uploads: state.uploads.filter((u) => u.id !== id)
    })),
  
  clearUploads: () => set({ uploads: [] }),
  
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
      previewUrl: upload.type === "video" ? upload.objectUrl : undefined
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
          display: { from: 0, to: 5000 }
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
