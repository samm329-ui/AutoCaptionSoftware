import { IDisplay } from "../../types";

interface HelperProps {
  id: string;
  display: IDisplay;
  tScale: number;
  width: number;
  height: number;
  left: number;
  top: number;
  activeGuideFill?: string;
}

class Helper {
  static type = "Helper";

  public id: string;
  public display: IDisplay;
  public tScale: number;
  public width: number;
  public height: number;
  public left: number;
  public top: number;
  public activeGuideFill: string;

  constructor(props: HelperProps) {
    this.id = props.id;
    this.display = props.display;
    this.tScale = props.tScale;
    this.width = props.width;
    this.height = props.height;
    this.left = props.left;
    this.top = props.top;
    this.activeGuideFill = props.activeGuideFill || "#ffffff";
  }
}

export default Helper;