const dragDataStore: { current: Record<string, any> | null } = { current: null };

export const getDragData = (): Record<string, any> | null => {
  return dragDataStore.current;
};

export const setDragData = (data: Record<string, any> | null): void => {
  dragDataStore.current = data;
};

export const clearDragData = (): void => {
  dragDataStore.current = null;
};
