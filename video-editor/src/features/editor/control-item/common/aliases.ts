export const EDIT_OBJECT = "EDIT_OBJECT";
export const ADD_ANIMATION = "ADD_ANIMATION";
export const ADD_ITEMS = "ADD_ITEMS";
export const LAYER_DELETE = "LAYER_DELETE";
export const ADD_TRACK = "ADD_TRACK";

export interface ICaption {
  id: string;
  type: string;
  display: { from: number; to: number };
  details: {
    words?: Array<{
      word: string;
      start: number;
      end: number;
    }>;
    [key: string]: any;
  };
}

export interface ITrackItem {
  id: string;
  type: string;
  display: { from: number; to: number };
  details: Record<string, any>;
}

let idCounter = 0;
export const generateId = () => `id-${Date.now()}-${++idCounter}`;