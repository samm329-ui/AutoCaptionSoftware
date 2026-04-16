/**
 * API Configuration
 * Centralized endpoint management for external services
 * Use environment variables for all URLs and keys
 */
export const API_CONFIG = {
  RENDER: {
    BASE_URL: process.env.RENDER_API_URL || "https://api.designcombo.dev/v1",
    AUTH_HEADER: "Authorization",
    AUTH_PREFIX: "Bearer",
    get ENV_KEY() { return process.env.COMBO_SK; },
  },
  TRANSCRIBE: {
    BASE_URL: process.env.TRANSCRIBE_API_URL || "https://api.combo.sh/v1",
    AUTH_HEADER: "Authorization", 
    AUTH_PREFIX: "Bearer",
    get ENV_KEY() { return process.env.COMBO_SH_JWT; },
  },
} as const;

export const API_ENDPOINTS = {
  CHAT: "/api/chat",
  GENERATE_IMAGE: "/api/generate-image",
  GENERATE_AUDIO: "/api/generate-audio",
  SCHEMA: "/api/schema",
  SCHEME: {
    BASE: process.env.SCHEME_BASE_URL || "https://scheme.combo.sh",
    CREATE: `${process.env.SCHEME_BASE_URL || "https://scheme.combo.sh"}/schemes`,
    RUN: (id: string) => `${process.env.SCHEME_BASE_URL || "https://scheme.combo.sh"}/run/${id}`,
  },
  // Render API endpoints
  RENDER: {
    CREATE_PROJECT: () => `${API_CONFIG.RENDER.BASE_URL}/projects`,
    CREATE_EXPORT: (projectId: string) => `${API_CONFIG.RENDER.BASE_URL}/projects/${projectId}/export`,
    GET_RENDER_STATUS: (renderId: string) => `${API_CONFIG.TRANSCRIBE.BASE_URL}/render/${renderId}`,
  },
  // Transcribe API
  TRANSCRIBE: {
    SPEECH_TO_TEXT: `${API_CONFIG.RENDER.BASE_URL}/audios/speech-to-text`,
    GET_STATUS: (id: string) => `${API_CONFIG.TRANSCRIBE.BASE_URL}/transcribe/${id}`,
  }
} as const;
