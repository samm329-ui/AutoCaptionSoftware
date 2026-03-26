"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { uploadVideo } from "@/lib/api";

const ACCEPTED_FORMATS = {
  "video/mp4": [".mp4"],
  "video/quicktime": [".mov"],
  "video/x-msvideo": [".avi"],
  "video/x-matroska": [".mkv"],
  "video/webm": [".webm"],
};

const MAX_SIZE = 500 * 1024 * 1024; // 500MB

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("auto");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      if (f.size > MAX_SIZE) {
        setError("File size exceeds 500MB limit.");
        return;
      }
      setFile(f);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxFiles: 1,
    maxSize: MAX_SIZE,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await uploadVideo(file, language);
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Navigate to themes page
      setTimeout(() => {
        router.push(`/themes/${result.job_id}`);
      }, 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed. Make sure the AI server is running.";
      setError(message);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    return `${(bytes / 1e3).toFixed(1)} KB`;
  };

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-4xl mx-auto pt-28 px-6 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="font-headline text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary via-primary-dim to-secondary bg-clip-text text-transparent">
              AI Caption Generator
            </span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-xl mx-auto">
            Upload your video and let AI generate stunning captions with
            Bengali & English support. Frame-by-frame precision powered by WhisperX.
          </p>
        </motion.div>

        {/* Upload Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-panel p-8"
        >
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? "dropzone-active" : ""} ${
              file ? "border-success/30 bg-success/5" : ""
            }`}
          >
            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file-selected"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-on-surface font-semibold text-lg">
                      {file.name}
                    </p>
                    <p className="text-on-surface-variant text-sm mt-1">
                      {formatSize(file.size)} • Ready to process
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-sm text-error hover:text-error/80 transition-colors"
                  >
                    Remove
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="no-file"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary-dim/10 flex items-center justify-center group-hover:bg-primary-dim/20 transition-colors">
                    <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-on-surface font-semibold text-lg">
                      {isDragActive ? "Drop your video here" : "Drag & drop your video"}
                    </p>
                    <p className="text-on-surface-variant text-sm mt-1">
                      or click to browse • MP4, MOV, AVI, MKV, WEBM • Max 500MB
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Language Select */}
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label className="text-sm text-on-surface-variant font-medium">
              Audio Language:
            </label>
            <div className="flex gap-2">
              {[
                { value: "auto", label: "🌐 Auto Detect" },
                { value: "hi", label: "🇮🇳 Hindi" },
                { value: "en", label: "🇬🇧 English" },
                { value: "bn", label: "🇧🇩 Bengali" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLanguage(opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    language === opt.value
                      ? "bg-primary-dim/20 text-primary border border-primary/30"
                      : "bg-surface-container-highest/50 text-on-surface-variant border border-transparent hover:bg-surface-container-highest"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 rounded-xl bg-error/10 text-error text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Progress */}
          <AnimatePresence>
            {uploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-on-surface-variant">
                    Uploading & Processing...
                  </span>
                  <span className="text-sm font-mono text-primary">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`btn-primary px-10 py-4 text-base ${
                !file || uploading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-[1.02]"
              }`}
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                "Upload & Transcribe"
              )}
            </button>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10"
        >
          {[
            {
              icon: "🎙️",
              title: "WhisperX AI",
              desc: "Word-level precision with forced alignment",
            },
            {
              icon: "🇧🇩",
              title: "Bengali Support",
              desc: "Native Bengali text rendering with Noto fonts",
            },
            {
              icon: "🎨",
              title: "4 Themes",
              desc: "Kalakar Fire, Minimal, Karaoke Neon, Cinematic Gold",
            },
          ].map((feature, i) => (
            <div key={i} className="card text-center">
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-headline font-semibold text-on-surface mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-on-surface-variant">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
