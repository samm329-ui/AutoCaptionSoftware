import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_AI_SERVER_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 300000,
});

export async function uploadVideo(file: File, language: string = "auto") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language", language);
  
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  }
  
  return res.json();
}

export async function getJobStatus(jobId: string) {
  const res = await api.get(`/job/${jobId}`);
  return res.data;
}

export async function getRenderStatus(renderId: string) {
  const res = await api.get(`/render/${renderId}`);
  return res.data;
}

export async function renderVideo(jobId: string, theme: string) {
  const formData = new FormData();
  formData.append("job_id", jobId);
  formData.append("theme", theme);
  const res = await api.post("/render", formData);
  return res.data as { render_id: string; status: string };
}

export function getDownloadUrl(renderId: string) {
  return `${API_BASE}/download/${renderId}`;
}

export async function getThemes() {
  const res = await api.get("/themes");
  return res.data.themes as Array<{ id: string; name: string; description: string; preview_image?: string }>;
}

export async function checkHealth() {
  try {
    const res = await api.get("/health");
    return res.data;
  } catch {
    return null;
  }
}