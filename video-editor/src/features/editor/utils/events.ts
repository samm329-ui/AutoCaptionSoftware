import useStore, { EDIT_OBJECT, ADD_ANIMATION, ADD_ITEMS, LAYER_DELETE, ADD_TRACK } from "../store/use-store";

type EventCallback = (data: any) => void;
const listeners: Map<string, EventCallback[]> = new Map();

export const dispatch = (event: string, data?: any) => {
  const store = useStore.getState();
  
  if (event === EDIT_OBJECT) {
    store.editObject(data.payload);
    return;
  }
  
  if (event === ADD_ANIMATION) {
    store.addAnimation(data.payload);
    return;
  }

  if (event === ADD_ITEMS) {
    store.addItems(data.payload);
    return;
  }

  if (event === LAYER_DELETE) {
    store.layerDelete(data.payload);
    return;
  }

  if (event === ADD_TRACK) {
    store.addTrack(data.payload);
    return;
  }

  const cbs = listeners.get(event) || [];
  cbs.forEach(cb => cb(data));
};

export const subscribe = (event: string, callback: EventCallback) => {
  const cbs = listeners.get(event) || [];
  cbs.push(callback);
  listeners.set(event, cbs);
  return () => {
    const cbs = listeners.get(event) || [];
    listeners.set(event, cbs.filter(cb => cb !== callback));
  };
};