import axios from "axios";

export type UploadProgressCallback = (
  uploadId: string,
  progress: number
) => void;

export type UploadStatusCallback = (
  uploadId: string,
  status: "uploaded" | "failed",
  error?: string
) => void;

export interface UploadCallbacks {
  onProgress: UploadProgressCallback;
  onStatus: UploadStatusCallback;
}

export async function processFileUpload(
  uploadId: string,
  file: File,
  callbacks: UploadCallbacks
): Promise<any> {
  try {
    callbacks.onProgress(uploadId, 10);

    let uploadUrl: string;

    // Try to get presigned URL first
    try {
      const {
        data: { uploads, _fallback }
      } = await axios.post(
        "/api/uploads/presign",
        {
          userId: "PJ1nkaufw0hZPyhN7bWCP",
          fileNames: [file.name]
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 5000
        }
      );

      if (_fallback) {
        // External service unavailable - use object URL for local preview
        uploadUrl = URL.createObjectURL(file);
        
        const fileType = file.type.split("/")[0];
        let mediaType = "other";
        if (fileType === "video") mediaType = "video";
        else if (fileType === "image") mediaType = "image";
        else if (fileType === "audio") mediaType = "audio";
        
        const uploadData = {
          fileName: file.name,
          filePath: `local/${Date.now()}_${file.name}`,
          fileSize: file.size,
          contentType: file.type || "application/octet-stream",
          metadata: { 
            objectUrl: uploadUrl,
            isLocalFile: true,
            originalFile: file
          },
          folder: null,
          type: mediaType,
          method: "local",
          origin: "user",
          status: "uploaded",
          isPreview: false
        };

        callbacks.onProgress(uploadId, 100);
        callbacks.onStatus(uploadId, "uploaded");
        return uploadData;
      }

      const uploadInfo = uploads[0];
      
      // Upload file with progress tracking
      await axios.put(uploadInfo.presignedUrl, file, {
        headers: { "Content-Type": uploadInfo.contentType },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          callbacks.onProgress(uploadId, percent);
        },
        validateStatus: () => true
      });

      const uploadData = {
        fileName: uploadInfo.fileName,
        filePath: uploadInfo.filePath,
        fileSize: file.size,
        contentType: uploadInfo.contentType,
        metadata: { uploadedUrl: uploadInfo.url },
        folder: uploadInfo.folder || null,
        type: uploadInfo.contentType.split("/")[0],
        method: "direct",
        origin: "user",
        status: "uploaded",
        isPreview: false
      };

      callbacks.onStatus(uploadId, "uploaded");
      return uploadData;
    } catch (presignError) {
      // Fallback: use local object URL
      console.log("Using local object URL fallback");
      uploadUrl = URL.createObjectURL(file);
      
      const fileType = file.type.split("/")[0];
      let mediaType = "other";
      if (fileType === "video") mediaType = "video";
      else if (fileType === "image") mediaType = "image";
      else if (fileType === "audio") mediaType = "audio";
      
      const uploadData = {
        fileName: file.name,
        filePath: `local/${Date.now()}_${file.name}`,
        fileSize: file.size,
        contentType: file.type || "application/octet-stream",
        metadata: { 
          objectUrl: uploadUrl,
          isLocalFile: true
        },
        folder: null,
        type: mediaType,
        method: "local",
        origin: "user",
        status: "uploaded",
        isPreview: false
      };

      callbacks.onProgress(uploadId, 100);
      callbacks.onStatus(uploadId, "uploaded");
      return uploadData;
    }
  } catch (error) {
    callbacks.onStatus(uploadId, "failed", (error as Error).message);
    throw error;
  }
}

export async function processUrlUpload(
  uploadId: string,
  url: string,
  callbacks: UploadCallbacks
): Promise<any[]> {
  try {
    callbacks.onProgress(uploadId, 10);

    const { data: { uploads = [] } = {} } = await axios.post(
      "/api/uploads/url",
      {
        userId: "PJ1nkaufw0hZPyhN7bWCP",
        urls: [url]
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    callbacks.onProgress(uploadId, 50);

    const uploadDataArray = uploads.map((uploadInfo: any) => ({
      fileName: uploadInfo.fileName,
      filePath: uploadInfo.filePath,
      fileSize: 0,
      contentType: uploadInfo.contentType,
      metadata: { originalUrl: uploadInfo.originalUrl },
      folder: uploadInfo.folder || null,
      type: uploadInfo.contentType.split("/")[0],
      method: "url",
      origin: "user",
      status: "uploaded",
      isPreview: false
    }));

    callbacks.onProgress(uploadId, 100);
    callbacks.onStatus(uploadId, "uploaded");
    return uploadDataArray;
  } catch (error) {
    callbacks.onStatus(uploadId, "failed", (error as Error).message);
    throw error;
  }
}

export async function processUpload(
  uploadId: string,
  upload: { file?: File; url?: string },
  callbacks: UploadCallbacks
): Promise<any> {
  if (upload.file) {
    return await processFileUpload(uploadId, upload.file, callbacks);
  }
  if (upload.url) {
    return await processUrlUpload(uploadId, upload.url, callbacks);
  }
  callbacks.onStatus(uploadId, "failed", "No file or URL provided");
  throw new Error("No file or URL provided");
}
