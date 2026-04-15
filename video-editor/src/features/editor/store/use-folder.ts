/**
 * useFolderStore - Compatibility wrapper
 * Now uses engine store instead of Zustand
 */

import { useFolderState, engineStore } from "../engine";
import { setFolderState as setFolderStateCmd } from "../engine/commands";

interface IFolderStore {
  valueFolder: string;
  setValueFolder: (valueFolder: string) => void;
  videos: any[];
  setVideos: (videos: any[] | ((prev: any[]) => any[])) => void;
}

export function useFolderStore(): IFolderStore {
  const { valueFolder, folderVideos } = useFolderState();
  
  return {
    valueFolder,
    setValueFolder: (valueFolder: string) => engineStore.dispatch(setFolderStateCmd({ valueFolder })),
    videos: folderVideos,
    setVideos: (videosOrUpdater: any[] | ((prev: any[]) => any[])) => {
      const videos = typeof videosOrUpdater === "function" 
        ? videosOrUpdater(folderVideos) 
        : videosOrUpdater;
      engineStore.dispatch(setFolderStateCmd({ folderVideos: videos }));
    },
  };
}

export default useFolderStore;