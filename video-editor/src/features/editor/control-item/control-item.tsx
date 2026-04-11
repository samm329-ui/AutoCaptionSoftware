import React, { useEffect, useState } from "react";
import BasicText from "./basic-text";
import BasicImage from "./basic-image";
import BasicVideo from "./basic-video";
import BasicAudio from "./basic-audio";
import BasicCaption from "./basic-caption";
import { MenuItem } from "../menu-item";
import useStore from "../store/use-store";
import useLayoutStore from "../store/use-layout-store";

// ENGINE MIGRATION: Import engine hooks
import { useEngineSelection, useEngineSelector, type Clip } from "../engine/engine-provider";

const ActiveControlItem = ({
  trackItem
}: {
  trackItem?: any;
}) => {
  if (!trackItem) {
    return null;
  }
  return (
    <>
      {
        {
          text: <BasicText trackItem={trackItem} />,
          caption: (
            <BasicCaption trackItem={trackItem} />
          ),
          image: <BasicImage trackItem={trackItem} />,
          video: <BasicVideo trackItem={trackItem} />,
          audio: <BasicAudio trackItem={trackItem} />
        }[trackItem.type as "text"]
      }
    </>
  );
};

export const ControlItem = () => {
  // MIGRATION: Get selection from engine
  const engineSelection = useEngineSelection();
  
  // Fallback to Zustand for track items map
  const { activeIds, trackItemsMap, transitionsMap } = useStore();
  const [trackItem, setTrackItem] = useState<any>(null);
  const { setTrackItem: setLayoutTrackItem } = useLayoutStore();

  // Use engine selection if available
  const selection = engineSelection.length > 0 ? engineSelection : activeIds;

  useEffect(() => {
    if (selection.length === 1) {
      const [id] = selection;
      // First check Zustand (has full track item data)
      const item = trackItemsMap[id];
      if (item) {
        setTrackItem(item);
        setLayoutTrackItem(item);
      } else {
        // Check if it's a transition
        console.log(transitionsMap[id]);
        setTrackItem(null);
        setLayoutTrackItem(null);
      }
    } else {
      setTrackItem(null);
      setLayoutTrackItem(null);
    }
  }, [selection, trackItemsMap, transitionsMap, setLayoutTrackItem]);

  if (!trackItem) {
    return <MenuItem />;
  }

  return (
    <div className="w-full flex-none border-l border-border/80 bg-card hidden lg:block">
      <ActiveControlItem trackItem={trackItem} />
    </div>
  );
};