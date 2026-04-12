/**
 * control-list.tsx — ENGINE-FIRST
 *
 * Derives active control type from engine selection + engine clip type.
 */

import { useCallback } from "react";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import useLayoutStore from "./store/use-layout-store";
import { useEngineSelector } from "./engine/engine-provider";
import { selectActiveClip } from "./engine/selectors";

type ItemType = "image" | "video" | "audio" | "text" | "caption";

export default function ControlList() {
  const activeClip = useEngineSelector(selectActiveClip);
  const controlType = activeClip?.type as ItemType | undefined;

  return <>{controlType && <ControlMenu controlType={controlType} />}</>;
}

function ControlMenu({ controlType }: { controlType: ItemType }) {
  const { setShowToolboxItem, setActiveToolboxItem, activeToolboxItem } =
    useLayoutStore();

  const openToolboxItem = useCallback(
    (type: string) => {
      if (type === activeToolboxItem) {
        setShowToolboxItem(false);
        setActiveToolboxItem(null);
      } else {
        setShowToolboxItem(true);
        setActiveToolboxItem(type);
      }
    },
    [activeToolboxItem, setShowToolboxItem, setActiveToolboxItem]
  );

  return (
    <div
      style={{ zIndex: 201 }}
      className="absolute right-2.5 top-1/2 flex w-14 -translate-y-1/2 flex-col items-center rounded-lg bg-sidebar py-2 shadow-lg"
    >
      {
        {
          image:   <ImageMenuList   activeToolboxItem={activeToolboxItem!} type={controlType} openToolboxItem={openToolboxItem} />,
          video:   <VideoMenuList   activeToolboxItem={activeToolboxItem!} type={controlType} openToolboxItem={openToolboxItem} />,
          audio:   <AudioMenuList   activeToolboxItem={activeToolboxItem!} type={controlType} openToolboxItem={openToolboxItem} />,
          text:    <TextMenuList    activeToolboxItem={activeToolboxItem!} type={controlType} openToolboxItem={openToolboxItem} />,
          caption: <TextMenuList    activeToolboxItem={activeToolboxItem!} type={controlType} openToolboxItem={openToolboxItem} />,
        }[controlType as "image"]
      }
    </div>
  );
}

const ImageMenuList = ({ openToolboxItem, type, activeToolboxItem }: any) => (
  <div className="flex flex-col items-center">
    <BasicMenuListItem activeToolboxItem={activeToolboxItem} openToolboxItem={openToolboxItem} type={type} />
    <AnimationMenuListItem activeToolboxItem={activeToolboxItem} openToolboxItem={openToolboxItem} />
    <SmartMenuListItem activeToolboxItem={activeToolboxItem} openToolboxItem={openToolboxItem} />
  </div>
);

const TextMenuList = ({ openToolboxItem, type, activeToolboxItem }: any) => (
  <div className="flex flex-col items-center">
    <BasicMenuListItem activeToolboxItem={activeToolboxItem} openToolboxItem={openToolboxItem} type={type} />
    <AnimationMenuListItem activeToolboxItem={activeToolboxItem} openToolboxItem={openToolboxItem} />
    <SmartMenuListItem activeToolboxItem={activeToolboxItem} openToolboxItem={openToolboxItem} />
    <PresetsMenuListItem activeToolboxItem={activeToolboxItem} type={type} openToolboxItem={openToolboxItem} />
  </div>
);

const VideoMenuList = ({ openToolboxItem, type, activeToolboxItem }: any) => (
  <div className="flex flex-col items-center">
    <BasicMenuListItem activeToolboxItem={activeToolboxItem} openToolboxItem={openToolboxItem} type={type} />
    <AnimationMenuListItem activeToolboxItem={activeToolboxItem} openToolboxItem={openToolboxItem} />
  </div>
);

const AudioMenuList = ({ openToolboxItem, type, activeToolboxItem }: any) => (
  <div className="flex flex-col items-center">
    <BasicMenuListItem activeToolboxItem={activeToolboxItem} openToolboxItem={openToolboxItem} type={type} />
    <SmartMenuListItem activeToolboxItem={activeToolboxItem} openToolboxItem={openToolboxItem} />
  </div>
);

const PresetsMenuListItem = ({ openToolboxItem, type, activeToolboxItem }: any) => (
  <Button size="icon" onClick={() => openToolboxItem(`preset-${type}`)}
    variant={`preset-${type}` === activeToolboxItem ? "secondary" : "ghost"}
    className={`preset-${type}` !== activeToolboxItem ? "text-muted-foreground" : ""}
  ><Icons.preset size={20} /></Button>
);

const BasicMenuListItem = ({ openToolboxItem, type, activeToolboxItem }: any) => {
  const Icon = Icons[type as "image"];
  return (
    <Button size="icon" onClick={() => openToolboxItem(`basic-${type}`)}
      variant={`basic-${type}` === activeToolboxItem ? "secondary" : "ghost"}
      className={`basic-${type}` !== activeToolboxItem ? "text-muted-foreground" : ""}
    >{Icon && <Icon size={20} />}</Button>
  );
};

const SmartMenuListItem = ({ openToolboxItem, activeToolboxItem }: any) => (
  <Button size="icon" onClick={() => openToolboxItem("smart")}
    variant={activeToolboxItem === "smart" ? "secondary" : "ghost"}
    className={activeToolboxItem !== "smart" ? "text-muted-foreground" : ""}
  ><Icons.smart size={20} /></Button>
);

const AnimationMenuListItem = ({ openToolboxItem, activeToolboxItem }: any) => (
  <Button size="icon" onClick={() => openToolboxItem("animation")}
    variant={activeToolboxItem === "animation" ? "secondary" : "ghost"}
    className={activeToolboxItem !== "animation" ? "text-muted-foreground" : ""}
  >
    <Icons.animation size={20} />
  </Button>
);
