import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { dispatch } from "../../utils/events";
import { EDIT_OBJECT } from "../../store/use-store";
import { useEngineDispatch } from "../../engine/engine-provider";
import { updateDetails, updateTransform } from "../../engine/commands";
import { engineStore } from "../../engine/engine-core";

export default function PlaybackRate({ trackItem }: { trackItem: any }) {
  const handleChangePlaybackRate = (value: number) => {
    engineStore.dispatch(updateDetails(trackItem.id, { playbackRate: value }));
  };
  return (
    <div className="flex flex-col gap-2 py-4">
      <Label className="font-sans text-xs font-semibold">Aspect ratio</Label>
      <div className="flex">
        <Button
          variant="outline"
          onClick={() => {
            handleChangePlaybackRate(0.5);
          }}
        >
          x0.5
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            handleChangePlaybackRate(1);
          }}
        >
          x1
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            handleChangePlaybackRate(1.5);
          }}
        >
          x1.5
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            handleChangePlaybackRate(2);
          }}
        >
          x2
        </Button>
      </div>
    </div>
  );
}