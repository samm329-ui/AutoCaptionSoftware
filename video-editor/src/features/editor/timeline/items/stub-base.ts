import { IDisplay, IMetadata, ITrim } from "../types";

interface BaseItemProps {
  id: string;
  display: IDisplay;
  trim: ITrim;
  duration: number;
  tScale: number;
}

class TrimmableStub {
  public id: string;
  public display: IDisplay;
  public trim: ITrim;
  public duration: number;
  public tScale: number;
  public fill: string = "#2D1625";
  public src: string = "";
  public objectCaching: boolean = false;
  public width: number = 0;
  public height: number = 0;
  public left: number = 0;
  public top: number = 0;
  public rx: number = 4;
  public ry: number = 4;
  public isSelected: boolean = false;
  public canvas: any = null;
  public playbackRate: number = 1;

  constructor(props: BaseItemProps) {
    this.id = props.id;
    this.display = props.display;
    this.trim = props.trim;
    this.duration = props.duration;
    this.tScale = props.tScale;
  }

  setCoords() {}
  set(key: string, value: any) {}
  canvas?: any;
  requestRenderAll() {}
  _render(ctx: CanvasRenderingContext2D) {}
}

export { TrimmableStub };