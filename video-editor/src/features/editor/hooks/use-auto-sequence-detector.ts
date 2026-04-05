import { useEffect, useRef } from "react";
import { filter, subject, dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_IMAGE, DESIGN_RESIZE } from "@designcombo/state";
import useStore from "../store/use-store";

const useAutoSequenceDetector = () => {
  const { setState, size, fps } = useStore();
  const hasAutoConfigured = useRef(false);

  useEffect(() => {
    const addEvents = subject.pipe(
      filter(({ key }) => key === ADD_VIDEO || key === ADD_IMAGE)
    );

    const subscription = addEvents.subscribe((obj) => {
      if (hasAutoConfigured.current) return;

      const payload = obj.value?.payload;
      if (!payload) return;

      const metadata = payload.metadata;
      if (!metadata) return;

      const videoWidth = metadata.width ?? 0;
      const videoHeight = metadata.height ?? 0;
      const videoFps = metadata.fps ?? 0;

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
