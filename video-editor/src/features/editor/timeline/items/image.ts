import { IDisplay } from "../../types";
import { createResizeControls } from "../controls";

interface ImageProps {
  id: string;
  display: IDisplay;
  tScale: number;
  src: string;
}

class Image {
  static type = "Image";
  public src: string;
  public hasSrc = true;

  public id: string;
  public display: IDisplay;
  public tScale: number;
  public width: number = 0;
  public height: number = 0;
  public left: number = 0;
  public top: number = 0;
  public fill: any = null;
  public isSelected: boolean = false;
  public canvas: any = null;
  public rx: number = 4;
  public ry: number = 4;

  static createControls(): { controls: Record<string, any> } {
    return { controls: createResizeControls() };
  }

  constructor(props: ImageProps) {
    this.id = props.id;
    this.src = props.src;
    this.display = props.display;
    this.tScale = props.tScale;
    this.loadImage();
  }

  public _render(ctx: CanvasRenderingContext2D) {
    this.updateSelected(ctx);
  }

  public loadImage() {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = this.src;
    img.onload = () => {
      const imgHeight = img.height;
      const rectHeight = this.height || 60;
      const scaleY = rectHeight / imgHeight;
      this.set("fill", {
        source: img,
        repeat: "repeat-x",
        patternTransform: [scaleY, 0, 0, scaleY, 0, 0]
      } as any);
      this.canvas?.requestRenderAll();
    };
  }

  public setSrc(src: string) {
    this.src = src;
    this.loadImage();
    this.canvas?.requestRenderAll();
  }

  public set(key: string, value: any) {
    if (key === "fill") {
      this.fill = value;
    }
  }

  public setCoords() {}

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

export default Image;