import useStore from "../store/use-store";
import { useEffect } from "react";
import { filter, subject } from "@designcombo/events";
import {
  PLAYER_PAUSE,
  PLAYER_PLAY,
  PLAYER_PREFIX,
  PLAYER_SEEK,
  PLAYER_SEEK_BY,
  PLAYER_TOGGLE_PLAY
} from "../constants/events";
import { LAYER_PREFIX, LAYER_SELECTION, EDIT_OBJECT } from "@designcombo/state";
import { TIMELINE_SEEK, TIMELINE_PREFIX } from "@designcombo/timeline";
import { getSafeCurrentFrame } from "../utils/time";

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

const useTimelineEvents = () => {
  const { playerRef, fps, timeline, setState } = useStore();

  useEffect(() => {
    const playerEvents = subject.pipe(
      filter(({ key }) => key.startsWith(PLAYER_PREFIX))
    );
    const timelineEvents = subject.pipe(
      filter(({ key }) => key.startsWith(TIMELINE_PREFIX))
    );

    const timelineEventsSubscription = timelineEvents.subscribe((obj) => {
      if (obj.key === TIMELINE_SEEK) {
        const time = obj.value?.payload?.time;
        if (playerRef?.current && typeof time === "number") {
          playerRef.current.seekTo((time / 1000) * fps);
        }
      }
    });

    const playerEventsSubscription = playerEvents.subscribe((obj) => {
      if (obj.key === PLAYER_SEEK) {
        const time = obj.value?.payload?.time;
        if (playerRef?.current && typeof time === "number") {
          playerRef.current.seekTo((time / 1000) * fps);
        }
      } else if (obj.key === PLAYER_PLAY) {
        playerRef?.current?.play();
      } else if (obj.key === PLAYER_PAUSE) {
        playerRef?.current?.pause();
      } else if (obj.key === PLAYER_TOGGLE_PLAY) {
        if (playerRef?.current?.isPlaying()) {
          playerRef.current.pause();
        } else {
          playerRef?.current?.play();
        }
      } else if (obj.key === PLAYER_SEEK_BY) {
        const frames = obj.value?.payload?.frames;
        if (playerRef?.current && typeof frames === "number") {
          const safeCurrentFrame = getSafeCurrentFrame(playerRef);
          playerRef.current.seekTo(Math.round(safeCurrentFrame) + frames);
        }
      }
    });

    return () => {
      playerEventsSubscription.unsubscribe();
      timelineEventsSubscription.unsubscribe();
    };
  }, [playerRef, fps]);

  useEffect(() => {
    const selectionEvents = subject.pipe(
      filter(({ key }) => key.startsWith(LAYER_PREFIX))
    );

    const selectionSubscription = selectionEvents.subscribe((obj) => {
      if (obj.key === LAYER_SELECTION) {
        const activeIds = obj.value?.payload?.activeIds;
        setState({
          activeIds: Array.isArray(activeIds) ? activeIds : []
        });
      }
    });

    return () => selectionSubscription.unsubscribe();
  }, [timeline, setState]);

  useEffect(() => {
    const editSubscription = subject
      .pipe(filter(({ key }) => key === EDIT_OBJECT))
      .subscribe((obj) => {
        const payload = obj.value?.payload;
        if (!isPlainObject(payload)) return;

        setState({
          trackItemsMap: payload as Record<string, any>
        });
      });

    return () => editSubscription.unsubscribe();
  }, [setState]);
};

export default useTimelineEvents;
