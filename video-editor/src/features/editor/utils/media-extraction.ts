/**
 * Media Extraction Utilities
 * Extracts audio-only or video-only tracks from source media
 */

import { nanoid } from "nanoid";

export interface ExtractionOptions {
  sourceUrl: string;
  sourceType: "video" | "audio";
  inTime: number;
  outTime: number;
  duration: number;
}

export interface ExtractedMedia {
  file: File;
  url: string;
  duration: number;
  type: "video" | "audio";
}

/**
 * Extract audio-only from video source
 * Uses Web Audio API to decode and re-encode audio track
 */
export async function extractAudioOnly(
  sourceUrl: string,
  inTime: number,
  outTime: number
): Promise<ExtractedMedia> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.src = sourceUrl;
    audio.crossOrigin = "anonymous";

    audio.onloadedmetadata = async () => {
      try {
        const duration = Math.max(0.1, outTime - inTime);
        const clampedInTime = Math.max(0, Math.min(inTime, audio.duration));
        const clampedOutTime = Math.max(clampedInTime, Math.min(outTime, audio.duration));
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const response = await fetch(sourceUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const sampleRate = audioBuffer.sampleRate;
        const channels = audioBuffer.numberOfChannels;
        const startSample = Math.floor(clampedInTime * sampleRate);
        const endSample = Math.floor(clampedOutTime * sampleRate);
        const length = Math.max(1, endSample - startSample);
        
        const trimmedBuffer = audioContext.createBuffer(channels, length, sampleRate);
        
        for (let channel = 0; channel < channels; channel++) {
          const data = audioBuffer.getChannelData(channel);
          const trimmedData = trimmedBuffer.getChannelData(channel);
          for (let i = 0; i < length; i++) {
            trimmedData[i] = data[startSample + i];
          }
        }
        
        const wavBlob = audioBufferToWav(trimmedBuffer);
        const file = new File([wavBlob], `extracted-audio-${nanoid()}.wav`, {
          type: "audio/wav",
        });
        const url = URL.createObjectURL(file);
        
        resolve({
          file,
          url,
          duration,
          type: "audio",
        });
        
        audioContext.close();
      } catch (err) {
        reject(err);
      }
    };

    audio.onerror = () => {
      reject(new Error("Failed to load audio source"));
    };
  });
}

/**
 * Extract video-only from video source (remove audio)
 * Uses canvas to render video without audio track
 */
export async function extractVideoOnly(
  sourceUrl: string,
  inTime: number,
  outTime: number,
  width: number = 1920,
  height: number = 1080
): Promise<ExtractedMedia> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = sourceUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      try {
        const clampedInTime = Math.max(0, Math.min(inTime, video.duration));
        const clampedOutTime = Math.max(clampedInTime, Math.min(outTime, video.duration));
        const duration = Math.max(0.1, clampedOutTime - clampedInTime);
        
        const actualWidth = video.videoWidth || width;
        const actualHeight = video.videoHeight || height;
        
        const canvas = document.createElement("canvas");
        canvas.width = actualWidth;
        canvas.height = actualHeight;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        
        const stream = canvas.captureStream(30);
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : MediaRecorder.isTypeSupported("video/webm")
            ? "video/webm"
            : "video/mp4";
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 5000000,
        });
        
        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const file = new File([blob], `extracted-video-${nanoid()}.webm`, {
            type: mimeType,
          });
          const url = URL.createObjectURL(file);
          
          resolve({
            file,
            url,
            duration,
            type: "video",
          });
        };
        
        const targetDurationMs = duration * 1000;
        
        const captureVideo = async () => {
          mediaRecorder.start();
          
          video.currentTime = clampedInTime;
          
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              resolve();
            };
            video.addEventListener("seeked", onSeeked);
          });
          
          const captureFrame = async () => {
            ctx.drawImage(video, 0, 0, actualWidth, actualHeight);
            
            if (video.currentTime >= clampedOutTime - 0.033) {
              mediaRecorder.stop();
              return;
            }
            
            video.currentTime += 1 / 30;
            
            await new Promise<void>((resolve) => {
              const onSeeked = () => {
                video.removeEventListener("seeked", onSeeked);
                resolve();
              };
              video.addEventListener("seeked", onSeeked);
            });
            
            await captureFrame();
          };
          
          await captureFrame();
          
          setTimeout(() => {
            if (mediaRecorder.state === "recording") {
              mediaRecorder.stop();
            }
          }, targetDurationMs + 2000);
        };
        
        captureVideo();
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => {
      reject(new Error("Failed to load video source"));
    };
  });
}

/**
 * Convert AudioBuffer to WAV blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(0, "RIFF");
  view.setUint32(4, bufferLength - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);
  
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, value, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: "audio/wav" });
}