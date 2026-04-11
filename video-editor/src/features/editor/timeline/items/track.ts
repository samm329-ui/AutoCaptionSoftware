import { IDisplay } from "../../types";

interface TrackItemProps {
  id: string;
  display: IDisplay;
  tScale: number;
  width: number;
  height: number;
  left: number;
  top: number;
  fill: string;
  items: any[];
  magnetic: boolean;
}

class Track {
  static type = "Track";
  private _lastTheme: string = "";

  public id: string;
  public display: IDisplay;
  public tScale: number;
  public width: number;
  public height: number;
  public left: number;
  public top: number;
  public fill: string;
  public items: any[];
  public magnetic: boolean;
  public canvas: any = null;
  public rx: number = 0;
  public ry: number = 0;

  constructor(props: TrackItemProps) {
    this.id = props.id;
    this.display = props.display;
    this.tScale = props.tScale;
    this.width = props.width;
    this.height = props.height;
    this.left = props.left;
    this.top = props.top;
    this.fill = props.fill;
    this.items = props.items;
    this.magnetic = props.magnetic;
    this._updateThemeColor();
  }

  private _updateThemeColor() {
    const isDark = document.documentElement.classList.contains("dark");
    const currentTheme = isDark ? "dark" : "light";

    if (this._lastTheme !== currentTheme) {
      this._lastTheme = currentTheme;
      try {
        const cardColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--card-track")
          .trim();
        this.fill = cardColor || "#27272a";
      } catch (e) {
        this.fill = "#27272a";
      }
    }
  }

  public _render(ctx: CanvasRenderingContext2D) {
    this._updateThemeColor();
    
    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);
    ctx.fillStyle = this.fill;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();

    const textPath = new Path2D(
      "M14.4444 13.3263H11.0667C12.5384 12.3991 13.6259 10.9716 14.1289 9.30644C14.632 7.64131 14.5169 5.85051 13.8048 4.26348C13.0927 2.67645 11.8314 1.39993 10.2531 0.668736C8.67478 -0.0624548 6.8855 -0.199136 5.21442 0.283835C3.54334 0.766806 2.10285 1.83695 1.15794 3.2974C0.213035 4.75785 -0.172743 6.51038 0.0715766 8.23261C0.315896 9.95484 1.17388 11.5309 2.4877 12.671C3.80151 13.811 5.4828 14.4383 7.22227 14.4374H14.4444C14.5918 14.4374 14.7331 14.3789 14.8373 14.2747C14.9415 14.1705 15 14.0292 15 13.8819C15 13.7345 14.9415 13.5932 14.8373 13.489C14.7331 13.3848 14.5918 13.3263 14.4444 13.3263ZM1.1112 7.21523C1.1112 6.00658 1.46961 4.82506 2.14111 3.8201C2.8126 2.81514 3.76702 2.03187 4.88367 1.56934C6.00032 1.10681 7.22905 0.985789 8.41449 1.22159C9.59992 1.45738 10.6888 2.03941 11.5435 2.89405C12.3981 3.7487 12.9801 4.83759 13.2159 6.02302C13.4517 7.20845 13.3307 8.43719 12.8682 9.55384C12.4056 10.6705 11.6224 11.6249 10.6174 12.2964C9.61244 12.9679 8.43093 13.3263 7.22227 13.3263C5.60208 13.3245 4.04878 12.68 2.90313 11.5344C1.75748 10.3887 1.11304 8.83542 1.1112 7.21523ZM7.22227 5.54858C7.55191 5.54858 7.87414 5.45083 8.14822 5.2677C8.4223 5.08456 8.63592 4.82426 8.76206 4.51972C8.88821 4.21518 8.92121 3.88007 8.85691 3.55677C8.7926 3.23347 8.63386 2.9365 8.40078 2.70342C8.16769 2.47033 7.87072 2.3116 7.54742 2.24729C7.22412 2.18298 6.88901 2.21599 6.58447 2.34213C6.27993 2.46828 6.01964 2.6819 5.8365 2.95598C5.65337 3.23006 5.55562 3.55229 5.55562 3.88192C5.55562 4.32395 5.73121 4.74787 6.04377 5.06043C6.35633 5.37298 6.78025 5.54858 7.22227 5.54858ZM7.22227 3.32637C7.33215 3.32637 7.43956 3.35895 7.53092 3.42C7.62228 3.48104 7.69349 3.56781 7.73554 3.66932C7.77759 3.77084 7.78859 3.88254 7.76715 3.9903C7.74572 4.09807 7.6928 4.19706 7.61511 4.27476C7.53741 4.35245 7.43842 4.40536 7.33066 4.4268C7.22289 4.44824 7.11119 4.43723 7.00967 4.39519C6.90816 4.35314 6.82139 4.28193 6.76035 4.19057C6.69931 4.09921 6.66672 3.9918 6.66672 3.88192C6.66672 3.73458 6.70047 3.59235 6.79604 3.49678C6.89161 3.40121 7.03384 3.36746 7.18107 3.36746C7.32831 3.36746 7.47053 3.40121 7.5661 3.49678C7.66167 3.59235 7.69543 3.73458 7.69543 3.88192C7.69543 4.15199 7.47267 4.37475 7.2026 4.37475C6.93253 4.37475 6.70977 4.15199 6.70977 3.88192C6.70977 3.77416 6.72078 3.66246 6.76283 3.56094C6.80489 3.45943 6.87609 3.37266 6.96745 3.31161C7.05881 3.25057 7.16622 3.218 7.2761 3.218C7.38598 3.218 7.49339 3.25057 7.58475 3.31161C7.67611 3.37266 7.74732 3.45943 7.78937 3.56094C7.83143 3.66246 7.84243 3.77416 7.84243 3.88192C7.84243 4.15199 7.61967 4.37475 7.3496 4.37475C7.07953 4.37475 6.85677 4.15199 6.85677 3.88192Z"
    );
    if (!this.items.length && this.magnetic) {
      ctx.save();
      ctx.translate(-this.width / 2, -this.height / 2);
      ctx.translate(0, 12);
      ctx.font = "600 12px ' variable'";
      ctx.fillStyle = "#A0A4A2";
      ctx.textAlign = "left";
      ctx.clip();
      ctx.fillText("Drag and drop media here", 32, 12);

      ctx.translate(8, 1);

      ctx.fillStyle = "#A0A4A2";
      ctx.fill(textPath);
      ctx.restore();
    }
  }
}

export default Track;