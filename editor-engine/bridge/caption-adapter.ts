/**
 * bridge/caption-adapter.ts
 *
 * Connects the caption backend (FastAPI + Whisper pipeline) to the engine.
 *
 * All caption state changes use the dedicated ADD_CAPTIONS / DELETE_CAPTIONS
 * commands — never LOAD_PROJECT.  This means:
 *   • Caption updates are granular and undoable independently
 *   • The rest of the project state is untouched
 *   • History entries are clearly labelled
 *
 * Backend API (from existing backend/api/jobs.py):
 *   POST /transcribe          — start a transcription job
 *   GET  /transcribe/:id      — poll job status + progress
 */

import { eventBus } from "../events/event-bus";
import { engineStore } from "../state/engine-store";
import { normalizeCaption } from "../validation/normalize";
import type { Caption } from "../model/schema";
import { nanoid } from "../utils/id";

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 1500;
const BACKEND_BASE =
  typeof process !== "undefined"
    ? (process.env?.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000")
    : "http://localhost:8000";

// ─── Job tracking ─────────────────────────────────────────────────────────────

interface CaptionJob {
  jobId: string;
  clipId: string;
  intervalId: ReturnType<typeof setInterval> | null;
}

const activeJobs = new Map<string, CaptionJob>();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Submit a clip's asset URL to the caption backend for transcription.
 *
 * On completion the captions are inserted into the engine store via the
 * ADD_CAPTIONS command — a single undoable history entry.
 *
 * @param clipId   - Engine clip id the captions belong to
 * @param videoUrl - URL of the video/audio asset to transcribe
 * @param language - ISO language code, e.g. "en", "hi" (default "en")
 */
export async function startCaptionJob(
  clipId: string,
  videoUrl: string,
  language = "en"
): Promise<void> {
  try {
    const res = await fetch(`${BACKEND_BASE}/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: videoUrl, language, clip_id: clipId }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`Transcription request failed: ${err}`);
    }

    const data = await res.json();
    const jobId: string = data.job_id ?? nanoid();

    eventBus.emit("CAPTION_JOB_STARTED", { jobId, clipId });

    const job: CaptionJob = { jobId, clipId, intervalId: null };
    activeJobs.set(jobId, job);
    job.intervalId = setInterval(() => _pollJob(jobId), POLL_INTERVAL_MS);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[CaptionAdapter] startCaptionJob:", message);
    eventBus.emit("CAPTION_JOB_FAILED", { jobId: nanoid(), error: message });
  }
}

/** Cancel an in-progress caption job and stop polling. */
export function cancelCaptionJob(jobId: string): void {
  _stopPolling(jobId);
}

/** Cancel all active caption jobs (call on editor unmount). */
export function cancelAllCaptionJobs(): void {
  for (const jobId of activeJobs.keys()) _stopPolling(jobId);
}

// ─── Polling loop ─────────────────────────────────────────────────────────────

async function _pollJob(jobId: string): Promise<void> {
  const job = activeJobs.get(jobId);
  if (!job) return;

  try {
    const res = await fetch(`${BACKEND_BASE}/transcribe/${jobId}`);
    if (!res.ok) throw new Error(`Poll failed: ${res.statusText}`);

    const data = await res.json();

    if (data.status === "processing") {
      const progress =
        typeof data.progress === "number" ? data.progress : 0;
      eventBus.emit("CAPTION_JOB_PROGRESS", { jobId, progress });
      return;
    }

    if (data.status === "complete") {
      _stopPolling(jobId);
      const captions = _parseCaptions(data.result ?? [], job.clipId);
      eventBus.emit("CAPTION_JOB_COMPLETE", {
        jobId,
        clipId: job.clipId,
        captions,
      });
      _applyCaptions(captions, job.clipId);
      return;
    }

    if (data.status === "failed") {
      _stopPolling(jobId);
      eventBus.emit("CAPTION_JOB_FAILED", {
        jobId,
        error: data.error ?? "Unknown transcription error",
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[CaptionAdapter] poll error:", message);
    _stopPolling(jobId);
    eventBus.emit("CAPTION_JOB_FAILED", { jobId, error: message });
  }
}

// ─── Apply captions via dedicated command ─────────────────────────────────────

function _applyCaptions(captions: Caption[], clipId: string): void {
  if (!captions.length) return;

  // 1. Clear any existing captions for this clip first (one undo step)
  const state = engineStore.getState();
  const existingIds = Object.values(state.captions)
    .filter((c): c is Caption => !!c && c.trackId === clipId)
    .map((c) => c.id);

  if (existingIds.length > 0) {
    engineStore.dispatch(
      { type: "DELETE_CAPTIONS", payload: { captionIds: existingIds } },
      { skipHistory: true }
    );
  }

  // 2. Insert new captions as a single undoable command
  engineStore.dispatch(
    { type: "ADD_CAPTIONS", payload: { captions } },
    { description: `Add ${captions.length} captions` }
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _parseCaptions(rawList: unknown[], clipId: string): Caption[] {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((raw) =>
      normalizeCaption({
        ...(raw as object),
        // Associate captions with the clip via trackId field
        // (caption.trackId stores the clipId for this use-case;
        //  if you add a dedicated captionTrack later, adjust here)
        trackId: clipId,
      })
    )
    .filter((c): c is Caption => c !== null);
}

function _stopPolling(jobId: string): void {
  const job = activeJobs.get(jobId);
  if (!job) return;
  if (job.intervalId !== null) clearInterval(job.intervalId);
  activeJobs.delete(jobId);
}
