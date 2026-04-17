import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { dispatch } from "../../utils/events";
import { EDIT_OBJECT } from "../../store/use-store";
import { useState } from "react";
import { useEngineDispatch } from "../../engine/engine-provider";
import { updateDetails, updateTransform } from "../../engine/commands";
import { engineStore } from "../../engine/engine-core";

export default function Flip({
  trackItem
}: {
  trackItem: any;
}) {
  const [flip, setFlip] = useState({
    flipX: trackItem.details.flipX,
    flipY: trackItem.details.flipY
  });

  const handleFlip = (value: string) => {
    if (value === "x") {
      engineStore.dispatch(updateDetails(trackItem.id, {
              flipX: !flip.flipX
            }));
      setFlip({ ...flip, flipX: !flip.flipX });
    } else if (value === "y") {
      engineStore.dispatch(updateDetails(trackItem.id, {
              flipY: !flip.flipY
            }));
      setFlip({ ...flip, flipY: !flip.flipY });
    }
  };
  return (
    <div className="flex flex-col gap-2 py-4">
      <Label className="font-sans text-[10px] font-semibold">Flip</Label>
      <div className="flex">
        <Button variant="outline" onClick={() => handleFlip("x")}>
          Flip X
        </Button>
        <Button variant="outline" onClick={() => handleFlip("y")}>
          Flip Y
        </Button>
      </div>
    </div>
  );
}