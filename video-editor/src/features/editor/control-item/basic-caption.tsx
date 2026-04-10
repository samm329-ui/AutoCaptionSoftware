/**
 * control-item/basic-caption.tsx — FIXED
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import useDataState from "../store/use-data-state";
import { loadFonts } from "../utils/fonts";
import React, { useEffect, useState } from "react";
import Outline from "./common/outline";
import Shadow from "./common/shadow";
import CaptionWords from "./common/caption-words";
import CaptionColors from "./common/caption-colors";
import { TextControls } from "./common/text";
import AnimationCaption from "./common/animation-caption";
import { PresetCaption } from "./common/preset-caption";
import { ICompactFont, IFont } from "../interfaces/editor";
import { DEFAULT_FONT } from "../constants/font";
import {
  useEngineActiveId,
  useEngineSelector,
  useEngineDispatch,
} from "../engine/engine-provider";
import { updateDetails, setOpacity } from "../engine/commands";
import {
  clipToTrackItemCompat,
  clipToCaptionProperties,
} from "./clip-compat";

interface BoxShadow { color: string; x: number; y: number; blur: number }

const getStyleName = (fontName: string): string => {
  const end = fontName.lastIndexOf("-");
  return fontName.substring(end + 1).replace("Italic", " Italic");
};

const BasicCaption = ({ type }: { type?: string }) => {
  const showAll = !type;
  const clipId = useEngineActiveId();
  const dispatch = useEngineDispatch();
  const clip = useEngineSelector((p) => (clipId ? p.clips[clipId] : null));
  const { compactFonts, fonts } = useDataState();
  const [activeModalAnimation, setActiveModalAnimation] = useState(false);

  const [selectedFont, setSelectedFont] = useState<ICompactFont>({
    family: "Open Sans",
    styles: [],
    default: DEFAULT_FONT,
    name: "Regular",
  });

  useEffect(() => {
    if (!clip) return;
    const d = clip.details as Record<string, unknown>;
    const fontFamily = (d.fontFamily as string) || DEFAULT_FONT.postScriptName;
    const currentFont = fonts.find((f) => f.postScriptName === fontFamily);
    if (!currentFont) return;
    const compactFont = compactFonts.find((f) => f.family === currentFont.family);
    if (!compactFont) return;
    setSelectedFont({ ...compactFont, name: getStyleName(currentFont.postScriptName) });
  }, [clip?.id, fonts, compactFonts]);

  if (!clipId || !clip) return null;

  const d = clip.details as Record<string, unknown>;
  const compat = clipToTrackItemCompat(clip);
  const properties = clipToCaptionProperties(clip, selectedFont.family);

  const handleChangeFontStyle = async (font: IFont) => {
    await loadFonts([{ name: font.postScriptName, url: font.url }]);
    setSelectedFont({ ...selectedFont, name: getStyleName(font.postScriptName) });
    dispatch(updateDetails(clipId, { fontFamily: font.postScriptName, fontUrl: font.url }));
  };

  const onChangeFontFamily = async (font: ICompactFont) => {
    await loadFonts([{ name: font.default.postScriptName, url: font.default.url }]);
    setSelectedFont({ ...font, name: getStyleName(font.default.postScriptName) });
    dispatch(updateDetails(clipId, { fontFamily: font.default.postScriptName, fontUrl: font.default.url }));
  };

  const components = [
    {
      key: "captionPreset",
      component: <PresetCaption trackItem={compat as any} properties={properties as any} />,
    },
    {
      key: "captionWords",
      component: <CaptionWords trackItem={compat as any} />,
    },
    {
      key: "textControls",
      component: (
        <TextControls
          trackItem={compat as any}
          properties={properties as any}
          selectedFont={selectedFont}
          onChangeFontFamily={onChangeFontFamily}
          handleChangeFontStyle={handleChangeFontStyle}
          onChangeFontSize={(v: number) => dispatch(updateDetails(clipId, { fontSize: v }))}
          handleColorChange={(v: string) => dispatch(updateDetails(clipId, { color: v }))}
          handleBackgroundChange={(v: string) => dispatch(updateDetails(clipId, { backgroundColor: v }))}
          onChangeTextAlign={(v: string) => dispatch(updateDetails(clipId, { textAlign: v }))}
          onChangeTextDecoration={(v: string) => dispatch(updateDetails(clipId, { textDecoration: v }))}
          handleChangeOpacity={(v: number) => dispatch(setOpacity(clipId, v))}
        />
      ),
    },
    {
      key: "captionColors",
      component: (
        <CaptionColors
          trackItem={compat as any}
          properties={properties as any}
          onChangeAppearedColor={(v: string) => dispatch(updateDetails(clipId, { appearedColor: v }))}
          onChangeActiveColor={(v: string) => dispatch(updateDetails(clipId, { activeColor: v }))}
          onChangeActiveFillColor={(v: string) => dispatch(updateDetails(clipId, { activeFillColor: v }))}
          onChangeIsKeywordColor={(v: string) => dispatch(updateDetails(clipId, { isKeywordColor: v }))}
          onChangePreservedColor={(v: boolean) => dispatch(updateDetails(clipId, { preservedColorKeyWord: v }))}
        />
      ),
    },
    {
      key: "animationCaption",
      component: (
        <AnimationCaption
          trackItem={compat as any}
          activeModal={activeModalAnimation}
          handleModal={setActiveModalAnimation}
        />
      ),
    },
    {
      key: "fontStroke",
      component: (
        <Outline
          label="Font stroke"
          onChageBorderWidth={(v: number) => dispatch(updateDetails(clipId, { borderWidth: v }))}
          onChangeBorderColor={(v: string) => dispatch(updateDetails(clipId, { borderColor: v }))}
          valueBorderWidth={(d.borderWidth as number) || 0}
          valueBorderColor={(d.borderColor as string) || "#000000"}
        />
      ),
    },
    {
      key: "fontShadow",
      component: (
        <Shadow
          label="Font shadow"
          onChange={(v: BoxShadow) => dispatch(updateDetails(clipId, { boxShadow: v }))}
          value={(d.boxShadow as BoxShadow) || { color: "#000000", x: 0, y: 0, blur: 0 }}
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

export default BasicCaption;
