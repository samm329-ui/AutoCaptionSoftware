/**
 * useDataState - Compatibility wrapper
 * Now uses engine store instead of Zustand
 */

import { useFonts, useCompactFonts, engineStore } from "../engine";
import { setFonts as setFontsCmd, setCompactFonts as setCompactFontsCmd } from "../engine/commands";

export function useDataState() {
  const fonts = useFonts();
  const compactFonts = useCompactFonts();
  
  return {
    fonts,
    compactFonts,
    setFonts: (fonts: any[]) => engineStore.dispatch(setFontsCmd(fonts)),
    setCompactFonts: (compactFonts: any[]) => engineStore.dispatch(setCompactFontsCmd(compactFonts)),
  };
}

export default useDataState;