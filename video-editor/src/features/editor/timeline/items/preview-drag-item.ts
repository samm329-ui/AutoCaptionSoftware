import { IDisplay } from "../../types";

interface PreviewTrackItemProps {
  id: string;
  display: IDisplay;
  tScale: number;
}

class PreviewTrackItem {
  static type = "PreviewTrackItem";

  public id: string;
  public display: IDisplay;
  public tScale: number;
  public width: number = 0;
  public height: number = 0;
  public left: number = 0;
  public top: number = 0;
  public fill: string = "#808080";
  public isSelected: boolean = false;
  public canvas: any = null;

  constructor(props: PreviewTrackItemProps) {
    this.id = props.id;
    this.display = props.display;
    this.tScale = props.tScale;
  }
}

export default PreviewTrackItem;