"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { getRenderStatus, getDownloadUrl } from "@/lib/api";

export default function ResultPage() {
  const router = useRouter();
  const params = useParams();
  const renderId = params.renderId as string;
  const videoRef = useRef<HTMLVideoElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [renderData, setRenderData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!renderId) return;

    const fetchData = async () => {
      try {
        const data = await getRenderStatus(renderId);
        setRenderData(data);
      } catch (err) {
        console.error("Failed to fetch render data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [renderId]);

  const downloadUrl = getDownloadUrl(renderId);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-5xl mx-auto pt-28 px-6 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Export Complete
          </div>
          <h1 className="font-headline text-3xl md:text-4xl font-bold mb-3">
            Your Video is Ready!
          </h1>
          <p className="text-on-surface-variant max-w-lg mx-auto">
            AI-generated captions have been rendered onto your video.
            Download, share, or try another theme.
          </p>
        </motion.div>

        {/* Video Player */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel overflow-hidden mb-8"
        >
          <div className="relative aspect-video bg-black rounded-t-2xl overflow-hidden group">
            <video
              ref={videoRef}
              src={downloadUrl}
              className="w-full h-full object-contain"
              controls
              playsInline
              preload="metadata"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>

          {/* Video Controls Bar */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-on-surface-variant">
                {renderData?.output_filename || "captioned_video.mp4"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    if (videoRef.current.paused) videoRef.current.play();
                    else videoRef.current.pause();
                  }
                }}
                className="p-2 rounded-lg hover:bg-surface-container-highest/60 transition-colors text-on-surface-variant hover:text-on-surface"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Metadata Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: "Resolution", value: "1920×1080", icon: "📐" },
            { label: "FPS", value: "30", icon: "🎞️" },
            { label: "Format", value: "MP4", icon: "📦" },
            { label: "Status", value: "Complete", icon: "✅" },
          ].map((meta, i) => (
            <div key={i} className="card p-4 text-center">
              <span className="text-2xl mb-2 block">{meta.icon}</span>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">
                {meta.label}
              </p>
              <p className="font-headline font-bold text-on-surface">
                {meta.value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel p-6 mb-8"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-headline font-bold text-lg text-on-surface mb-1">
                Download Your Video
              </h3>
              <p className="text-sm text-on-surface-variant">
                Full quality MP4 with embedded captions
              </p>
            </div>
            <a
              href={downloadUrl}
              download
              className="btn-primary px-8 py-4 text-base flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download MP4
            </a>
          </div>
        </motion.div>

        {/* Quick Share */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-10"
        >
          <span className="text-sm text-on-surface-variant">Quick Share:</span>
          <button
            onClick={handleCopyLink}
            className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5"
          >
            {copied ? "✅ Copied!" : "🔗 Copy Link"}
          </button>
          <button className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5">
            📧 Email
          </button>
          <button className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5">
            📱 Share
          </button>
        </motion.div>

        {/* Caption Fragments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-panel p-6 mb-8"
        >
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4 flex items-center gap-2">
            <span>💬</span> Caption Fragments
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {renderData?.transcript?.word_groups ? (
              renderData.transcript.word_groups.map(
                (group: { start: number; text: string }, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors"
                  >
                    <span className="text-xs font-mono text-primary w-16 shrink-0">
                      {group.start.toFixed(1)}s
                    </span>
                    <p className="text-sm text-on-surface flex-1">
                      {group.text}
                    </p>
                    <button className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                )
              )
            ) : (
              <p className="text-sm text-on-surface-variant text-center py-4">
                Caption data will appear here after processing.
              </p>
            )}
          </div>
        </motion.div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.back()}
            className="btn-accent px-6 py-3"
          >
            🎨 Try Another Theme
          </button>
          <button
            onClick={() => router.push("/")}
            className="btn-secondary px-6 py-3"
          >
            📤 Upload New Video
          </button>
        </div>
      </div>
    </main>
  );
}
