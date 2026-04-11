import { IDesign } from "../features/editor/types";
import { create } from "zustand";

interface ISceneStore {
  scene: IDesign | null;
  setScene: (scene: IDesign) => void;
}

export const useSceneStore = create<ISceneStore>((set) => ({
  scene: null,
  setScene: (scene) => set({ scene })
}));
