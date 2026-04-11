import { throttle } from "lodash";
import Video from "./video";
import Audio from "./audio";
import { ITimelineScaleState } from "../../types";

interface TimelineOptions {
  scale: ITimelineScaleState;
  duration: number;
  guideLineColor?: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

class Timeline {
  public isShiftKey: boolean = false;
  public viewportTransform: number[] = [1, 0, 0, 1, 0, 0];
  public spacing: { left: number; right: number; top: number; bottom: number } = { left: 0, right: 0, top: 0, bottom: 0 };
  
  private canvasEl: HTMLCanvasElement;
  private options: Partial<TimelineOptions>;
  private _objects: any[] = [];
  private _activeObject: any = null;

  constructor(
    canvasEl: HTMLCanvasElement,
    options: Partial<TimelineOptions> & {
      scale: ITimelineScaleState;
      duration: number;
      guideLineColor?: string;
    }
  ) {
    this.canvasEl = canvasEl;
    this.options = options;

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Shift") {
      this.isShiftKey = true;
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Shift") {
      this.isShiftKey = false;
    }
  };

  public purge(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  public getViewportPos(posX: number, posY: number) {
    return { x: posX, y: posY };
  }

  public getObjects() {
    return this._objects;
  }

  public getActiveObject() {
    return this._activeObject;
  }

  public setActiveTrackItemCoords() {}

  public requestRenderAll() {
    // Stub - the actual rendering would be handled by the timeline component
  }

  public setViewportPos(posX: number, posY: number) {
    const limitedPos = this.getViewportPos(posX, posY);
    const vt = this.viewportTransform;
    vt[4] = limitedPos.x;
    vt[5] = limitedPos.y;
    this.requestRenderAll();
    this.setActiveTrackItemCoords();
    this.onScrollChange();

    this.onScroll?.({
      scrollTop: limitedPos.y,
      scrollLeft: limitedPos.x - this.spacing.left
    });
  }

  public onScroll?: (scrollInfo: { scrollTop: number; scrollLeft: number }) => void;

  public onScrollChange = throttle(async () => {
    const objects = this.getObjects();
    const viewportTransform = this.viewportTransform;
    const scrollLeft = viewportTransform[4];
    for (const object of objects) {
      if (object instanceof Video || object instanceof Audio) {
        object.onScrollChange({ scrollLeft });
      }
    }
  }, 250);

  public scrollTo({
    scrollLeft,
    scrollTop
  }: {
    scrollLeft?: number;
    scrollTop?: number;
  }): void {
    const vt = this.viewportTransform;
    let hasChanged = false;

    if (typeof scrollLeft === "number") {
      vt[4] = -scrollLeft + this.spacing.left;
      hasChanged = true;
    }
    if (typeof scrollTop === "number") {
      vt[5] = -scrollTop;
      hasChanged = true;
    }

    if (hasChanged) {
      this.viewportTransform = vt;
      this.getActiveObject()?.setCoords();
      this.onScrollChange();
      this.requestRenderAll();
    }
  }
}

export default Timeline;