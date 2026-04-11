import { IDisplay } from "../../types";

interface RadialAudioBarsProps {
  id: string;
  display: IDisplay;
  tScale: number;
  src: string;
}

class RadialAudioBars {
  static type = "RadialAudioBars";
  public src: string;
  public backgroundColorDiv: string = "#808080";
  public hasSrc = true;

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
  public rx: number = 4;
  public ry: number = 4;

  constructor(props: RadialAudioBarsProps) {
    this.id = props.id;
    this.display = props.display;
    this.tScale = props.tScale;
    this.src = props.src;
  }

  public _render(ctx: CanvasRenderingContext2D) {
    this.updateSelected(ctx);
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = this.isSelected
      ? "rgba(255, 255, 255,1.0)"
      : "rgba(255, 255, 255,0.1)";
    const borderWidth = 2;
    const innerRadius = 4;

    ctx.save();
    ctx.fillStyle = borderColor;

    ctx.beginPath();
    ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);

    ctx.roundRect(
      -this.width / 2 + borderWidth,
      -this.height / 2 + borderWidth,
      this.width - borderWidth * 2,
      this.height - borderWidth * 2,
      innerRadius
    );

    ctx.fill("evenodd");
    ctx.restore();
  }
}

export default RadialAudioBars;