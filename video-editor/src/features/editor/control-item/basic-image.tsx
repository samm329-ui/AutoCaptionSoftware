/**
 * control-item/basic-image.tsx — FIXED
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import Outline from "./common/outline";
import Shadow from "./common/shadow";
import Opacity from "./common/opacity";
import Rounded from "./common/radius";
import AspectRatio from "./common/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Crop } from "lucide-react";
import React from "react";
import Blur from "./common/blur";
import Brightness from "./common/brightness";
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
  setBlur,
  setBrightness,
} from "../engine/commands";
import { clipToTrackItemCompat } from "./clip-compat";

interface BoxShadow { color: string; x: number; y: number; blur: number }

const BasicImage = ({ type }: { type?: string }) => {
  const showAll = !type;
  const clipId = useEngineActiveId();
  const dispatch = useEngineDispatch();
  const clip = useEngineSelector((p) => (clipId ? p.clips[clipId] : null));
  const { setCropTarget } = useLayoutStore();

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
            <Button variant="secondary" size="icon" onClick={() => setCropTarget(compat as any)}>
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
          <Rounded
            onChange={(v: number) => dispatch(updateDetails(clipId, { borderRadius: v }))}
            value={(d.borderRadius as number) ?? 0}
          />
          <Opacity
            onChange={(v: number) => dispatch(setOpacity(clipId, v))}
            value={opacityForUI}
          />
          <Blur
            onChange={(v: number) => dispatch(setBlur(clipId, v))}
            value={(d.blur as number) ?? 0}
          />
          <Brightness
            onChange={(v: number) => dispatch(setBrightness(clipId, v))}
            value={(d.brightness as number) ?? 100}
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

export default BasicImage;
