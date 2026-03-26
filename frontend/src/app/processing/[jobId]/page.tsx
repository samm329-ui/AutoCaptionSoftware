"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { getJobStatus } from "@/lib/api";

const PIPELINE_STEPS = [
  { id: "upload", label: "Upload Complete", icon: "📤" },
  { id: "audio", label: "Extracting Audio", icon: "🎵" },
  { id: "transcribe", label: "AI Transcription", icon: "🧠" },
  { id: "render", label: "Rendering Captions", icon: "🎨" },
  { id: "finalize", label: "Finalizing Video", icon: "✅" },
];

function getActiveStep(progress: number): number {
  if (progress < 15) return 0;
  if (progress < 35) return 1;
  if (progress < 65) return 2;
  if (progress < 90) return 3;
  return 4;
}

export default function ProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const renderId = params.jobId as string;

  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("Starting...");
  const [status, setStatus] = useState("rendering");
  const [error, setError] = useState<string | null>(null);

  // Poll render job status
  useEffect(() => {
    if (!renderId) return;

    const pollInterval = setInterval(async () => {
      try {
        const data = await getJobStatus(renderId);
        setProgress(data.progress || 0);
        setStep(data.step || "Processing...");
        setStatus(data.status);

        if (data.status === "completed") {
          clearInterval(pollInterval);
          setTimeout(() => {
            router.push(`/result/${renderId}`);
          }, 1500);
        } else if (data.status === "error") {
          clearInterval(pollInterval);
          setError(data.error || "Processing failed");
        }
      } catch {
        // Server might be busy
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [renderId, router]);

  const activeStep = getActiveStep(progress);

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="flex min-h-screen pt-20">
        {/* Left Sidebar */}
        <div className="hidden lg:flex flex-col w-64 p-6 border-r border-white/[0.04]">
          <div className="mt-4 space-y-1">
            {["Editor", "Captions", "Styles", "Audio", "Export"].map(
              (item, i) => (
                <div
                  key={item}
                  className={`sidebar-item ${
                    i === 1 ? "sidebar-item-active" : ""
                  }`}
                >
                  <span className="text-base">
                    {["✏️", "💬", "🎨", "🔊", "📦"][i]}
                  </span>
                  {item}
                </div>
              )
            )}
          </div>

          {/* Server Status */}
          <div className="mt-auto p-4 rounded-xl bg-surface-container-low">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-on-surface-variant">
                Server Active
              </span>
            </div>
            <p className="text-xs text-on-surface-variant/60">
              Processing on local GPU
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl"
          >
            {/* Phone Mockup Preview */}
            <div className="mx-auto w-56 h-96 rounded-3xl bg-surface-container-low border-2 border-surface-container-highest overflow-hidden mb-10 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                {status === "completed" ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-6xl"
                  >
                    ✅
                  </motion.div>
                ) : error ? (
                  <div className="text-4xl">❌</div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-3 border-primary border-t-transparent animate-spin" />
                    <p className="text-xs text-on-surface-variant">
                      {progress}%
                    </p>
                  </div>
                )}
              </div>

              {/* Simulated caption overlay */}
              <div className="absolute bottom-6 left-0 right-0 px-4">
                <div className="bg-black/60 rounded-lg px-3 py-2 text-center">
                  <span className="text-xs text-white/80 font-medium">
                    Caption Preview Area
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Info */}
            <div className="text-center mb-8">
              <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">
                {status === "completed"
                  ? "Processing Complete! 🎉"
                  : error
                  ? "Processing Failed"
                  : "Processing Your Video..."}
              </h2>
              <p className="text-on-surface-variant text-sm">{step}</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-on-surface-variant">
                  Overall Progress
                </span>
                <span className="text-sm font-mono text-primary font-bold">
                  {progress}%
                </span>
              </div>
              <div className="progress-track h-3">
                <motion.div
                  className="progress-fill h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Pipeline Steps */}
            <div className="space-y-3">
              {PIPELINE_STEPS.map((pStep, i) => (
                <motion.div
                  key={pStep.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 ${
                    i < activeStep
                      ? "bg-success/5"
                      : i === activeStep
                      ? "bg-primary-dim/10 border border-primary/20"
                      : "opacity-40"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                      i < activeStep
                        ? "bg-success/20"
                        : i === activeStep
                        ? "bg-primary-dim/20"
                        : "bg-surface-container-highest/40"
                    }`}
                  >
                    {i < activeStep ? "✓" : pStep.icon}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      i <= activeStep
                        ? "text-on-surface"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {pStep.label}
                  </span>
                  {i === activeStep && status !== "completed" && !error && (
                    <div className="ml-auto">
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Error Actions */}
            {error && (
              <div className="mt-6 text-center">
                <p className="text-error text-sm mb-4">{error}</p>
                <button
                  onClick={() => router.push("/")}
                  className="btn-secondary px-6 py-3"
                >
                  ← Try Again
                </button>
              </div>
            )}

            {/* Footer Info */}
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-on-surface-variant/50">
              <span>Estimated time: &lt;90s</span>
              <span>•</span>
              <span>Do not close this tab</span>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
