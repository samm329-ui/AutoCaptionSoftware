"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { getJobStatus, getThemes, renderVideo } from "@/lib/api";
import { Theme } from "@/lib/types";

// Default themes in case server isn't available
const DEFAULT_THEMES: Theme[] = [
  {
    id: "kalakar_fire",
    name: "Kalakar Fire 🔥",
    description: "Bold, fiery Bengali-style captions with pop animation.",
  },
  {
    id: "minimal_clean",
    name: "Minimal Clean ✨",
    description: "Clean, modern captions with subtle fade animation.",
  },
  {
    id: "karaoke_neon",
    name: "Karaoke Neon 🎤",
    description: "Word-by-word karaoke highlighting with neon glow.",
  },
  {
    id: "cinematic_gold",
    name: "Cinematic Gold 🎬",
    description: "Elegant golden captions with slide-up animation.",
  },
];

const THEME_GRADIENTS: Record<string, string> = {
  kalakar_fire: "from-orange-500 via-red-500 to-yellow-500",
  minimal_clean: "from-gray-400 via-white to-gray-300",
  karaoke_neon: "from-cyan-400 via-blue-500 to-purple-500",
  cinematic_gold: "from-yellow-400 via-amber-500 to-orange-400",
};

const THEME_ICONS: Record<string, string> = {
  kalakar_fire: "🔥",
  minimal_clean: "✨",
  karaoke_neon: "🎤",
  cinematic_gold: "🎬",
};

export default function ThemeSelectorPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [themes, setThemes] = useState<Theme[]>(DEFAULT_THEMES);
  const [selectedTheme, setSelectedTheme] = useState<string>("kalakar_fire");
  const [jobStatus, setJobStatus] = useState<string>("loading");
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll job status until transcribed
  useEffect(() => {
    if (!jobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await getJobStatus(jobId);
        setJobStatus(status.status);

        if (status.status === "transcribed") {
          clearInterval(pollInterval);
        } else if (status.status === "error") {
          clearInterval(pollInterval);
          setError(status.error || "Processing failed");
        }
      } catch {
        // Server might not be ready yet
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobId]);

  // Load themes from server
  useEffect(() => {
    getThemes()
      .then(setThemes)
      .catch(() => setThemes(DEFAULT_THEMES));
  }, []);

  const handleRender = async () => {
    if (!jobId || !selectedTheme) return;
    setRendering(true);
    setError(null);

    try {
      const result = await renderVideo(jobId, selectedTheme);
      router.push(`/processing/${result.render_id}?source=${jobId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start rendering";
      setError(message);
      setRendering(false);
    }
  };

  const isReady = jobStatus === "transcribed";

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
          <h1 className="font-headline text-3xl md:text-4xl font-bold mb-3">
            Choose Your Style
          </h1>
          <p className="text-on-surface-variant max-w-lg mx-auto">
            Select a caption theme for your video. Each theme has unique styling,
            animation, and personality.
          </p>
        </motion.div>

        {/* Job Status Banner */}
        <AnimatePresence>
          {!isReady && !error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 p-4 rounded-xl bg-primary-dim/10 border border-primary/20 flex items-center gap-3"
            >
              <svg className="animate-spin w-5 h-5 text-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-primary">
                Transcription in progress... You can select a theme while waiting.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          {themes.map((theme, i) => (
            <motion.div
              key={theme.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              onClick={() => setSelectedTheme(theme.id)}
              className={`card cursor-pointer group relative overflow-hidden ${
                selectedTheme === theme.id ? "card-selected" : ""
              }`}
            >
              {/* Theme Preview Gradient */}
              <div
                className={`h-32 rounded-xl mb-4 bg-gradient-to-br ${
                  THEME_GRADIENTS[theme.id] || "from-purple-500 to-blue-500"
                } flex items-center justify-center relative overflow-hidden`}
              >
                <span className="text-5xl">
                  {THEME_ICONS[theme.id] || "🎨"}
                </span>

                {/* Selection checkmark */}
                <AnimatePresence>
                  {selectedTheme === theme.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 text-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              </div>

              {/* Theme Info */}
              <h3 className="font-headline font-bold text-lg text-on-surface mb-1">
                {theme.name}
              </h3>
              <p className="text-sm text-on-surface-variant">
                {theme.description}
              </p>

              {/* Animation type badge */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest/60 text-xs text-on-surface-variant">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {theme.id === "kalakar_fire" && "Pop Scale"}
                {theme.id === "minimal_clean" && "Fade"}
                {theme.id === "karaoke_neon" && "Word by Word"}
                {theme.id === "cinematic_gold" && "Slide Up"}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 rounded-xl bg-error/10 text-error text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleRender}
            disabled={!isReady || rendering}
            className={`btn-primary px-10 py-4 text-base ${
              !isReady || rendering
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-[1.02]"
            }`}
          >
            {rendering ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting Render...
              </span>
            ) : !isReady ? (
              "Waiting for transcription..."
            ) : (
              `🎬 Render with ${themes.find((t) => t.id === selectedTheme)?.name || selectedTheme}`
            )}
          </button>

          <button
            onClick={() => router.push("/")}
            className="btn-secondary px-6 py-4"
          >
            ← Back to Upload
          </button>
        </div>

        {/* Info */}
        <p className="text-center text-xs text-on-surface-variant/60 mt-6">
          Estimated rendering time: 30-90 seconds depending on video length
        </p>
      </div>
    </main>
  );
}
