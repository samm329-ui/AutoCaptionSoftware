import useStore from "../store/use-store";
import { useEffect } from "react";
import { filter, subject } from "@designcombo/events";
import {
  PLAYER_PAUSE,
  PLAYER_PLAY,
  PLAYER_PREFIX,
  PLAYER_SEEK,
  PLAYER_SEEK_BY,
  PLAYER_TOGGLE_PLAY,
} from "../constants/events";
import { LAYER_PREFIX, LAYER_SELECTION, EDIT_OBJECT } from "@designcombo/state";
import { TIMELINE_SEEK, TIMELINE_PREFIX } from "@designcombo/timeline";
import { getSafeCurrentFrame } from "../utils/time";

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// ─── useTimelineEvents ─────────────────────────────────────────────────────────
// FIXED: Each subscription block has its own useEffect with the correct dependency
// array. Previously all three were in one effect, causing subscriptions to be
// recreated on every state change and leaking stale closures.
const useTimelineEvents = () => {
  const { playerRef, fps, timeline, setState } = useStore();

  // Player + Timeline seek/play/pause events
  useEffect(() => {
    const playerEvents = subject.pipe(
      filter(({ key }) => key.startsWith(PLAYER_PREFIX))
    );
    const timelineEvents = subject.pipe(
      filter(({ key }) => key.startsWith(TIMELINE_PREFIX))
    );

    const timelineSub = timelineEvents.subscribe((obj) => {
      if (obj.key === TIMELINE_SEEK) {
        const time = obj.value?.payload?.time;
        if (playerRef?.current && typeof time === "number") {
          playerRef.current.seekTo((time / 1000) * fps);
        }
      }
    });

    const playerSub = playerEvents.subscribe((obj) => {
      switch (obj.key) {
        case PLAYER_SEEK: {
          const time = obj.value?.payload?.time;
          if (playerRef?.current && typeof time === "number") {
            playerRef.current.seekTo((time / 1000) * fps);
          }
          break;
        }
        case PLAYER_PLAY:
          playerRef?.current?.play();
          break;
        case PLAYER_PAUSE:
          playerRef?.current?.pause();
          break;
        case PLAYER_TOGGLE_PLAY:
          if (playerRef?.current?.isPlaying()) {
            playerRef.current.pause();
          } else {
            playerRef?.current?.play();
          }
          break;
        case PLAYER_SEEK_BY: {
          const frames = obj.value?.payload?.frames;
          if (playerRef?.current && typeof frames === "number") {
            const current = getSafeCurrentFrame(playerRef);
            playerRef.current.seekTo(Math.round(current) + frames);
          }
          break;
        }
      }
    });

    return () => {
      playerSub.unsubscribe();
      timelineSub.unsubscribe();
    };
  }, [playerRef, fps]);

  // Layer selection events — keep Zustand activeIds in sync with stateManager
  // FIXED: Previously this only ran when `timeline` changed, missing initial load.
  useEffect(() => {
    const selectionSub = subject
      .pipe(filter(({ key }) => key.startsWith(LAYER_PREFIX)))
      .subscribe((obj) => {
        if (obj.key === LAYER_SELECTION) {
          const activeIds = obj.value?.payload?.activeIds;
          setState({
            activeIds: Array.isArray(activeIds) ? activeIds : [],
          });
        }
      });

    return () => selectionSub.unsubscribe();
  }, [setState]);

  // EDIT_OBJECT events — patch Zustand trackItemsMap
  // FIXED: This subscription is now isolated. Previously it was inside the
  // player effect, which meant it was torn down and re-created every time
  // playerRef or fps changed — causing brief gaps where edits were missed.
  useEffect(() => {
    const editSub = subject
      .pipe(filter(({ key }) => key === EDIT_OBJECT))
      .subscribe((obj) => {
        const payload = obj.value?.payload;
        if (!isPlainObject(payload)) return;
        // FIXED: Use getState() + setState() instead of the closure `setState`
        // to guarantee we always merge against the freshest state, not a stale
        // closure snapshot captured at subscription creation time.
        const current = useStore.getState().trackItemsMap;
        const merged: Record<string, any> = { ...current };
        for (const [id, patch] of Object.entries(payload)) {
          if (!isPlainObject(patch)) continue;
          merged[id] = {
            ...(current[id] ?? {}),
            ...patch,
            details: {
              ...((current[id] as any)?.details ?? {}),
              ...((patch as any).details ?? {}),
            },
          };
        }
        useStore.getState().setState({ trackItemsMap: merged as any });
      });

    return () => editSub.unsubscribe();
  }, []);
};

export default useTimelineEvents;
