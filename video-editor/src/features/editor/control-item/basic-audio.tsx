/**
 * control-item/basic-audio.tsx — FIXED
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import Volume from "./common/volume";
import Speed from "./common/speed";
import React from "react";
import {
  useEngineActiveId,
  useEngineSelector,
  useEngineDispatch,
} from "../engine/engine-provider";
import { setVolume, setPlaybackRate } from "../engine/commands";

const BasicAudio = ({ type }: { type?: string }) => {
  const showAll = !type;
  const clipId = useEngineActiveId();
  const dispatch = useEngineDispatch();
  const clip = useEngineSelector((p) => (clipId ? p.clips[clipId] : null));

  if (!clipId || !clip) return null;

  const d = clip.details as Record<string, unknown>;
  const volume = (d.volume as number) ?? 100;
  const playbackRate = (d.playbackRate as number) ?? 1;

  const components = [
    {
      key: "speed",
      component: (
        <Speed
          value={playbackRate}
          onChange={(v: number) => dispatch(setPlaybackRate(clipId, v))}
        />
      ),
    },
    {
      key: "volume",
      component: (
        <Volume
          onChange={(v: number) => dispatch(setVolume(clipId, v))}
          value={volume}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-2 px-4 py-4">
          {components
            .filter((c) => showAll || c.key === type)
            .map((c) => (
              <React.Fragment key={c.key}>{c.component}</React.Fragment>
            ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default BasicAudio;
