import { useIsSmallScreen } from "../../../hooks/use-media-query";
import {
  TIMELINE_OFFSET_X_SMALL,
  TIMELINE_OFFSET_X_LARGE
} from "../constants/constants";

const TIMELINE_TOOLBAR_WIDTH = 64;

export function useTimelineOffsetX(): number {
  const isSmallScreen = useIsSmallScreen();
  const baseOffset = isSmallScreen ? TIMELINE_OFFSET_X_SMALL : TIMELINE_OFFSET_X_LARGE;
  return baseOffset + TIMELINE_TOOLBAR_WIDTH;
}
