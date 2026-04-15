/**
 * useSceneStore - DEPRECATED
 * This store is no longer used. Scene state is managed by engine.
 * Keeping for backwards compatibility only.
 */

import { IDesign } from "../features/editor/types";

interface ISceneStore {
  scene: IDesign | null;
  setScene: (scene: IDesign) => void;
}

export const useSceneStore = (): ISceneStore => ({
  scene: null,
  setScene: () => {},
});

export default useSceneStore;