import { useEffect, useRef } from "react";
import useStore from "../store/use-store";

const ADD_VIDEO = "ADD_VIDEO";
const ADD_IMAGE = "ADD_IMAGE";
const DESIGN_RESIZE = "DESIGN_RESIZE";

interface EventSubject {
  pipe: (fn: (events: { key: string; value?: unknown }) => { key: string; value?: unknown }[]) => { subscribe: (cb: (event: { key: string; value?: unknown }) => void) => { unsubscribe: () => void } };
}

const createSubject = (): EventSubject => {
  return {
    pipe: () => ({
      subscribe: () => ({ unsubscribe: () => {} })
    })
  };
};

const subject = createSubject();

const dispatch = (key: string, payload: { payload?: unknown; options?: unknown }) => {
  console.log("dispatch", key, payload);
};

const useAutoSequenceDetector = () => {
  const { setState, size, fps } = useStore();
  const hasAutoConfigured = useRef(false);

  useEffect(() => {
    const addEvents = subject.pipe(
      (events: { key: string; value?: unknown }[]) => events.filter(
        ({ key }) => key === ADD_VIDEO || key === ADD_IMAGE
      )
    );

    const subscription = addEvents.subscribe((obj) => {
      if (hasAutoConfigured.current) return;

      const payload = (obj as { value?: { payload?: { metadata?: { width?: number; height?: number; fps?: number } } } })?.value?.payload;
      if (!payload) return;

      const metadata = payload as { metadata?: { width?: number; height?: number; fps?: number } };
      if (!metadata?.metadata) return;

      const videoWidth = metadata.metadata.width ?? 0;
      const videoHeight = metadata.metadata.height ?? 0;
      const videoFps = metadata.metadata.fps ?? 0;

      if (!videoWidth || !videoHeight) return;

      const needsResize = size.width !== videoWidth || size.height !== videoHeight;
      const needsFps = videoFps > 0 && fps !== videoFps;

      if (needsResize || needsFps) {
        hasAutoConfigured.current = true;

        if (needsResize) {
          dispatch(DESIGN_RESIZE, {
            payload: { width: videoWidth, height: videoHeight },
          });
          setState({
            size: { width: videoWidth, height: videoHeight },
          });
        }

        if (needsFps) {
          setState({ fps: videoFps });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [size, fps, setState]);
};

export default useAutoSequenceDetector;
