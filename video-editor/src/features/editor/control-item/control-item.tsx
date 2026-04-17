/**
 * control-item/control-item.tsx — ENGINE-FIRST
 *
 * Reads active clip from engine selector.
 * No useStore for project state.
 */

import React from "react";
import BasicText from "./basic-text";
import BasicImage from "./basic-image";
import BasicVideo from "./basic-video";
import BasicAudio from "./basic-audio";
import BasicCaption from "./basic-caption";
import { MenuItem } from "../menu-item";
import {
  useEngineSelector,
  useEngineDispatch,
} from "../engine/engine-provider";
import { selectActiveClip } from "../engine/selectors";

const ActiveControlItem = ({ trackItem }: { trackItem?: any }) => {
  if (!trackItem) return null;
  return (
    <>
      {
        {
          text:    <BasicText trackItem={trackItem} />,
          caption: <BasicCaption trackItem={trackItem} />,
          image:   <BasicImage trackItem={trackItem} />,
          video:   <BasicVideo trackItem={trackItem} />,
          audio:   <BasicAudio trackItem={trackItem} />,
        }[trackItem.type as "text"]
      }
    </>
  );
};

export const ControlItem = () => {
  // Engine is the only source of truth
  const activeClip = useEngineSelector(selectActiveClip);

  if (!activeClip) {
    return <MenuItem />;
  }

  return (
    <div className="w-full flex-none border-l border-border/80 bg-card hidden lg:block" style={{ padding: '4px', fontSize: '10px' }}>
      <ActiveControlItem trackItem={activeClip} />
    </div>
  );
};
