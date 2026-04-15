/**
 * useCropStore - Pure React implementation
 * UI state goes to engine, element management stays local
 */

import { useState, useCallback, useEffect } from "react";
import { useCropState, engineStore } from "../engine";
import { 
  setCropTarget, 
  setCropArea, 
  setCropSrc, 
  setCropState, 
  clearCrop 
} from "../engine/commands";

type Area = [x: number, y: number, width: number, height: number];

interface CropStateLocal {
  area: Area;
  src: string;
  fileLoading: boolean;
  step: number;
  scale: number;
  size: { width: number; height: number };
  element: HTMLImageElement | HTMLVideoElement | undefined;
}

export function useCropStore() {
  const cropState = useCropState();
  
  const [area, setAreaState] = useState<Area>(cropState.cropArea);
  const [step, setStepState] = useState(cropState.cropStep);
  const [element, setElement] = useState<HTMLImageElement | HTMLVideoElement | undefined>(undefined);
  
  useEffect(() => {
    setAreaState(cropState.cropArea);
  }, [cropState.cropArea]);
  
  useEffect(() => {
    setStepState(cropState.cropStep);
  }, [cropState.cropStep]);

  const setArea = useCallback((newArea: Area) => {
    setAreaState(newArea);
    engineStore.dispatch(setCropArea(newArea));
  }, []);

  const setStep = useCallback((newStep: number) => {
    setStepState(newStep);
    engineStore.dispatch(setCropState({ step: newStep }));
  }, []);

  const loadImage = useCallback((src: string) => {
    engineStore.dispatch(setCropSrc(src));
    engineStore.dispatch(setCropState({ fileLoading: true }));
    
    const image = document.createElement("img");
    image.setAttribute("crossOrigin", "anonymous");
    image.setAttribute("src", src);
    image.addEventListener("load", () => {
      const imageWidth = image.naturalWidth;
      const imageHeight = image.naturalHeight;
      const maxWidth = 700;
      const maxHeight = 520;

      const widthScale = maxWidth / imageWidth;
      const heightScale = maxHeight / imageHeight;
      const scaleFactor = Math.min(widthScale, heightScale);
      
      const newArea: Area = [0, 0, imageWidth * scaleFactor, imageHeight * scaleFactor];
      
      setAreaState(newArea);
      setElement(image);
      setStepState(1);
      
      engineStore.dispatch(setCropArea(newArea));
      engineStore.dispatch(setCropState({ 
        scale: scaleFactor, 
        size: { width: imageWidth, height: imageHeight },
        fileLoading: false,
      }));
    });
    image.src = src;
  }, []);

  const loadVideo = useCallback((src: string) => {
    setAreaState([0, 0, 0, 0]);
    engineStore.dispatch(setCropSrc(src));
    engineStore.dispatch(setCropArea([0, 0, 0, 0]));
    engineStore.dispatch(setCropState({ fileLoading: true }));

    const video = document.createElement("video");

    video.setAttribute("playsinline", "");
    video.preload = "metadata";
    video.autoplay = false;
    video.crossOrigin = "anonymous";

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = 0.01;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      const maxWidth = 520;
      const maxHeight = 400;

      const widthScale = maxWidth / videoWidth;
      const heightScale = maxHeight / videoHeight;
      const scaleFactor = Math.min(widthScale, heightScale);

      const newArea: Area = [0, 0, videoWidth * scaleFactor, videoHeight * scaleFactor];
      
      setElement(video);
      setAreaState(newArea);
      
      engineStore.dispatch(setCropState({ 
        scale: scaleFactor, 
        size: { width: videoWidth, height: videoHeight },
      }));
      engineStore.dispatch(setCropArea(newArea));
    });

    video.addEventListener("canplay", () => {
      setStepState(1);
      engineStore.dispatch(setCropState({ fileLoading: false, step: 1 }));
    });

    video.addEventListener("ended", () => {
      video.currentTime = 0;
    });

    video.addEventListener("timeupdate", () => {
      const start = 0;
      const end = video.duration;

      if (video.currentTime > end) {
        video.currentTime = start;
      } else if (video.currentTime < start - 1) {
        video.currentTime = start;
      }
    });

    video.src = src;
  }, []);

  const reset = useCallback(() => {
    if (element instanceof HTMLVideoElement) {
      element.currentTime = 0;
      element.pause();
    }
    const newArea: Area = [0, 0, cropState.cropSize.width * cropState.cropScale, cropState.cropSize.height * cropState.cropScale];
    setAreaState(newArea);
    engineStore.dispatch(setCropArea(newArea));
  }, [element, cropState.cropSize, cropState.cropScale]);

  const clear = useCallback(() => {
    setAreaState([0, 0, 0, 0]);
    setElement(undefined);
    setStepState(0);
    engineStore.dispatch(clearCrop());
  }, []);

  return {
    area,
    setArea,
    loadVideo,
    loadImage,
    element,
    src: cropState.cropSrc,
    fileLoading: cropState.cropFileLoading,
    step: cropState.cropStep,
    setStep,
    reset,
    scale: cropState.cropScale,
    clear,
    size: cropState.cropSize,
  };
}

export default useCropStore;