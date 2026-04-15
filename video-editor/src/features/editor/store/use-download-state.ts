/**
 * useDownloadState - Compatibility wrapper
 * Now uses engine store for state, keeps actions for export logic
 */

import { IDesign } from "../types";
import { useDownloadState as useDownloadStateEngine, engineStore } from "../engine";
import { setExportState as setExportStateCmd } from "../engine/commands";
import { engineStore as projectEngineStore } from "../engine/engine-core";

interface Output {
  url: string;
  type: string;
}

interface DownloadState {
  projectId: string;
  exporting: boolean;
  exportType: "json" | "mp4";
  progress: number;
  output?: Output;
  payload?: IDesign;
  displayProgressModal: boolean;
}

export function useDownloadState() {
  const engineState = useDownloadStateEngine();
  
  return {
    projectId: engineState.projectId,
    exporting: engineState.exporting,
    exportType: engineState.exportType,
    progress: engineState.exportProgress,
    output: engineState.exportOutput ?? undefined,
    displayProgressModal: engineState.displayProgressModal,
    actions: {
      setProjectId: (projectId: string) => engineStore.dispatch(setExportStateCmd({ projectId })),
      setExporting: (exporting: boolean) => engineStore.dispatch(setExportStateCmd({ exporting })),
      setExportType: (exportType: "json" | "mp4") => engineStore.dispatch(setExportStateCmd({ exportType })),
      setProgress: (progress: number) => engineStore.dispatch(setExportStateCmd({ exportProgress: progress })),
      setState: (state: Partial<DownloadState>) => engineStore.dispatch(setExportStateCmd(state as any)),
      setOutput: (output: Output) => engineStore.dispatch(setExportStateCmd({ exportOutput: output })),
      setDisplayProgressModal: (displayProgressModal: boolean) => 
        engineStore.dispatch(setExportStateCmd({ displayProgressModal })),
      startExport: async () => {
        try {
          const project = projectEngineStore.getState();
          
          engineStore.dispatch(setExportStateCmd({ exporting: true, displayProgressModal: true }));

          const payload: IDesign = {
            id: project.id,
            name: project.name,
            size: project.sequences[project.rootSequenceId]?.canvas ?? { width: 1080, height: 1920 },
            elements: Object.values(project.clips).map(clip => ({
              id: clip.id,
              type: clip.type,
              src: clip.details?.src as string || "",
              duration: clip.display.to - clip.display.from,
              from: clip.display.from,
              to: clip.display.to,
              trim: clip.trim,
              volume: clip.details?.volume as number ?? 100,
              transform: clip.transform,
            })) as any,
          };

          const response = await fetch(`/api/render`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              design: payload,
              options: {
                fps: 30,
                size: payload.size,
                format: "mp4"
              }
            })
          });

          if (!response.ok) throw new Error("Failed to submit export request.");

          const jobInfo = await response.json();
          const jobId = jobInfo.render.id;

          const checkStatus = async () => {
            const statusResponse = await fetch(`/api/render/${jobId}`, {
              headers: { "Content-Type": "application/json" }
            });

            if (!statusResponse.ok) throw new Error("Failed to fetch export status.");

            const statusInfo = await statusResponse.json();
            const { status, progress, presigned_url: url } = statusInfo.render;

            engineStore.dispatch(setExportStateCmd({ exportProgress: progress }));

            if (status === "COMPLETED") {
              engineStore.dispatch(setExportStateCmd({ exporting: false, exportOutput: { url, type: "mp4" } }));
            } else if (status === "PROCESSING" || status === "PENDING") {
              setTimeout(checkStatus, 2500);
            }
          };

          checkStatus();
        } catch (error) {
          console.error("Export failed:", error instanceof Error ? error.message : "Unknown error");
          engineStore.dispatch(setExportStateCmd({ exporting: false }));
        }
      },
    },
  };
}

export default useDownloadState;