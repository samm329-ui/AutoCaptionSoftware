/**
 * menu-item/texts.tsx — ENGINE-FIRST
 *
 * Text/shape inserts go directly to the engine via ADD_TRACK + ADD_CLIP.
 * No event-bus dispatch. No legacy store writes.
 */

import { Button, buttonVariants } from "@/components/ui/button";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import Draggable from "@/components/shared/draggable";
import { TEXT_ADD_PAYLOAD } from "../constants/payload";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import { engineStore, createTrack, type Clip } from "../engine/engine-core";
import { addTrack, addClip, selectClip, setPlayhead } from "../engine/commands";
import { selectTracksByGroup } from "../engine/selectors";

function insertClipToEngine(clipPartial: Omit<Clip, "id" | "trackId" | "appliedEffects" | "effectIds" | "keyframeIds">): void {
  const state = engineStore.getState();
  const clipType = clipPartial.type as Clip["type"];

  const trackGroup = (clipType === "audio") ? "audio" : (clipType === "text" || clipType === "caption") ? "text" : "video";

  const textTracks = selectTracksByGroup(trackGroup)(state);
  let track = textTracks[0];
  if (!track) {
    track = createTrack(clipType === "audio" ? "audio" : clipType === "text" ? "text" : "video", { order: 0 });
    engineStore.dispatch(addTrack(track));
  }

  const playheadTime = state.ui?.playheadTime ?? 0;
  const startMs = playheadTime;
  const dur = (clipPartial.display.to - clipPartial.display.from) || 5000;
  const clipId = nanoid();
  const clip: Clip = {
    id: clipId,
    trackId: track.id,
    appliedEffects: [],
    effectIds: [],
    keyframeIds: [],
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, opacity: 1, flipX: false, flipY: false },
    ...clipPartial,
    display: { from: startMs, to: startMs + dur },
  };

  engineStore.dispatch(addClip(clip, track.id));
  engineStore.dispatch(selectClip(clipId));
}

export const Texts = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();

  const handleAddText = () => {
    const id = nanoid();
    insertClipToEngine({
      type: "text",
      name: "Text",
      display: { from: 0, to: 5000 },
      trim: { from: 0, to: 5000 },
      details: {
        ...TEXT_ADD_PAYLOAD.details,
        text: "Heading and some body",
      },
    });
  };

  const handleAddAudio = () => {
    insertClipToEngine({
      type: "audio",
      name: "Music",
      display: { from: 0, to: 10000 },
      trim: { from: 0, to: 10000 },
      details: { src: "https://cdn.designcombo.dev/preset76.mp3", volume: 100 },
    });
  };

  const handleAddImage = () => {
    insertClipToEngine({
      type: "image",
      name: "Shape",
      display: { from: 0, to: 5000 },
      trim: { from: 0, to: 5000 },
      details: { src: "https://cdn.designcombo.dev/rect-gray.png", width: 200, height: 200 },
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-2 p-4">
        <Draggable
          data={TEXT_ADD_PAYLOAD}
          renderCustomPreview={
            <Button variant="secondary" className="w-60">Add text</Button>
          }
          shouldDisplayPreview={!isDraggingOverTimeline}
        >
          <div
            onClick={handleAddText}
            className={cn(buttonVariants({ variant: "default" }), "cursor-pointer")}
          >
            Add text
          </div>
        </Draggable>
      </div>
    </div>
  );
};
