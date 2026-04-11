import { Button, buttonVariants } from "@/components/ui/button";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import Draggable from "@/components/shared/draggable";
import { TEXT_ADD_PAYLOAD } from "../constants/payload";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

const ADD_AUDIO = "ADD_AUDIO";
const ADD_IMAGE = "ADD_IMAGE";
const ADD_TEXT = "ADD_TEXT";

const dispatch = (key: string, payload: { payload?: unknown; options?: unknown }) => {
  console.log("dispatch", key, payload);
};

export const Texts = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();

  const handleAddText = () => {
    dispatch(ADD_TEXT, {
      payload: { ...TEXT_ADD_PAYLOAD, id: nanoid() },
      options: {}
    });
  };

  const handleAddAudio = () => {
    dispatch(ADD_AUDIO, {
      payload: {
        id: nanoid(),
        details: {
          src: "https://cdn.designcombo.dev/preset76.mp3"
        }
      },
      options: {}
    });
  };
  // https://cdn.designcombo.dev/rect-gray.png

  const handleAddImage = () => {
    dispatch(ADD_IMAGE, {
      payload: {
        id: nanoid(),
        details: {
          src: "https://cdn.designcombo.dev/rect-gray.png"
        }
      },
      options: {}
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-2 p-4">
        <Draggable
          data={TEXT_ADD_PAYLOAD}
          renderCustomPreview={
            <Button variant="secondary" className="w-60">
              Add text
            </Button>
          }
          shouldDisplayPreview={!isDraggingOverTimeline}
        >
          <div
            onClick={handleAddText}
            className={cn(
              buttonVariants({ variant: "default" }),
              "cursor-pointer"
            )}
          >
            Add text
          </div>
        </Draggable>
      </div>
    </div>
  );
};
