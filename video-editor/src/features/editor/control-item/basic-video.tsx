/**
 * control-item/basic-video.tsx — FIXED
 *
 * REVIEW FIXES:
 *   - Removed legacy runtime/types import (IBoxShadow).
 *   - Removed per-file trackItemCompat construction.
 *   - compat shim now comes from the single shared clipToTrackItemCompat()
 *     in clip-compat.ts. One place, not four.
 *   - Opacity reads from clip.transform.opacity (0–1).
 *     UI display: multiply by 100 for the slider label.
 *     Dispatch: setOpacity(clipId, value) where value is 0–100 from slider.
 *     setOpacity() normalizes back to 0–1 before writing to engine.
 *   - Volume: stored as 0–100 in details.volume. Consistent with setVolume().
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import Outline from "./common/outline";
import Shadow from "./common/shadow";
import Opacity from "./common/opacity";
import Rounded from "./common/radius";
import AspectRatio from "./common/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Crop } from "lucide-react";
import Volume from "./common/volume";
import React from "react";
import Speed from "./common/speed";
import useLayoutStore from "../store/use-layout-store";
import { Label } from "@/components/ui/label";
import { Animations } from "./common/animations";
import {
  useEngineActiveId,
  useEngineSelector,
  useEngineDispatch,
} from "../engine/engine-provider";
import {
  updateDetails,
  setOpacity,
  setVolume,
  setPlaybackRate,
} from "../engine/commands";
import { clipToTrackItemCompat } from "./clip-compat";

interface BoxShadow { color: string; x: number; y: number; blur: number }

const BasicVideo = ({ type }: { type?: string }) => {
  const showAll = !type;
  const clipId = useEngineActiveId();
  const dispatch = useEngineDispatch();
  const { setCropTarget } = useLayoutStore();
  const clip = useEngineSelector((p) => (clipId ? p.clips[clipId] : null));

  if (!clipId || !clip) return null;

  const d = clip.details as Record<string, unknown>;
  const opacityForUI = Math.round(clip.transform.opacity * 100);
  const compat = clipToTrackItemCompat(clip);

  const components = [
    {
      key: "crop",
      component: (
        <div className="flex flex-col gap-2">
          <Label className="font-sans text-xs font-semibold">Crop</Label>
          <div className="mb-4">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setCropTarget(compat as any)}
            >
              <Crop size={18} />
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: "basic",
      component: (
        <div className="flex flex-col gap-2">
          <Label className="font-sans text-xs font-semibold">Basic</Label>
          <AspectRatio />
          <Volume
            onChange={(v: number) => dispatch(setVolume(clipId, v))}
            value={(d.volume as number) ?? 100}
          />
          <Opacity
            onChange={(v: number) => dispatch(setOpacity(clipId, v))}
            value={opacityForUI}
          />
          <Speed
            value={(d.playbackRate as number) ?? 1}
            onChange={(v: number) => dispatch(setPlaybackRate(clipId, v))}
          />
          <Rounded
            onChange={(v: number) => dispatch(updateDetails(clipId, { borderRadius: v }))}
            value={(d.borderRadius as number) ?? 0}
          />
        </div>
      ),
    },
    {
      key: "animations",
      component: <Animations trackItem={compat as any} properties={compat as any} />,
    },
    {
      key: "outline",
      component: (
        <Outline
          label="Outline"
          onChageBorderWidth={(v: number) => dispatch(updateDetails(clipId, { borderWidth: v }))}
          onChangeBorderColor={(v: string) => dispatch(updateDetails(clipId, { borderColor: v }))}
          valueBorderWidth={(d.borderWidth as number) ?? 0}
          valueBorderColor={(d.borderColor as string) ?? "#000000"}
        />
      ),
    },
    {
      key: "shadow",
      component: (
        <Shadow
          label="Shadow"
          onChange={(v: BoxShadow) => dispatch(updateDetails(clipId, { boxShadow: v }))}
          value={(d.boxShadow as BoxShadow) ?? { color: "transparent", x: 0, y: 0, blur: 0 }}
        />
      ),
    },
  ];

  return (
    <div className="flex lg:h-[calc(100vh-84px)] flex-1 flex-col overflow-hidden min-h-[340px]">
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

export default BasicVideo;
