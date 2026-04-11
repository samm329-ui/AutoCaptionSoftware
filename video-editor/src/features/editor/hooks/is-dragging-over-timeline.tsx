import { useState, useEffect } from "react";

const DRAG_PREFIX = "drag";
const DRAG_START = "drag:start";
const DRAG_END = "drag:end";

interface DragEvent {
  key: string;
  value?: { payload?: unknown };
}

type EventSubject = {
  pipe: (fn: (events: DragEvent[]) => DragEvent[]) => { subscribe: (cb: (event: DragEvent) => void) => { unsubscribe: () => void } };
};

const createSubject = (): EventSubject => {
  let subscribers: ((event: DragEvent) => void)[] = [];
  
  return {
    pipe: () => ({
      subscribe: (cb: (event: DragEvent) => void) => {
        subscribers.push(cb);
        return {
          unsubscribe: () => {
            subscribers = subscribers.filter(s => s !== cb);
          }
        };
      }
    })
  };
};

const subject = createSubject();

export const useIsDraggingOverTimeline = () => {
  const [isDraggingOverTimeline, setIsDraggingOverTimeline] = useState(false);

  useEffect(() => {
    const events: DragEvent[] = [];
    const emit = (event: DragEvent) => {
      events.push(event);
      subscribers.forEach(cb => cb(event));
    };
    
    let subscribers: ((event: DragEvent) => void)[] = [];
    
    const dragEvents = {
      pipe: () => ({
        subscribe: (cb: (event: DragEvent) => void) => {
          subscribers.push(cb);
          return {
            unsubscribe: () => {
              subscribers = subscribers.filter(s => s !== cb);
            }
          };
        }
      })
    };

    const dragEventsSubscription = dragEvents.pipe().subscribe((obj) => {
      if (obj.key === DRAG_START) {
        setIsDraggingOverTimeline(true);
      } else if (obj.key === DRAG_END) {
        setIsDraggingOverTimeline(false);
      }
    });

    return () => dragEventsSubscription.unsubscribe();
  }, []);

  return isDraggingOverTimeline;
};