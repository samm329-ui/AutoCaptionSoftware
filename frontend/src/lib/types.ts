// TypeScript types matching the PRD data models

export interface Job {
  id: string;
  status: "queued" | "processing" | "transcribed" | "rendering" | "completed" | "error";
  progress: number;
  step: string;
  filename: string;
  language?: string;
  transcript?: Transcript;
  error?: string;
}

export interface Transcript {
  segments: Segment[];
  word_groups: WordGroup[];
  language: string;
}

export interface Segment {
  start: number;
  end: number;
  text: string;
  words?: Word[];
}

export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface WordGroup {
  text: string;
  words: Word[];
  start: number;
  end: number;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  preview_image?: string;
}

export interface RenderResult {
  render_id: string;
  status: string;
}

export interface VideoInfo {
  width: number;
  height: number;
  fps: number;
  duration: number;
  codec: string;
  size_bytes: number;
}
