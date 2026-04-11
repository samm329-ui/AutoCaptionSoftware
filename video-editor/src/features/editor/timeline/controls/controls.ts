import {
  drawVerticalLeftIcon,
  drawVerticalLine,
  drawVerticalRightIcon
} from "./draw";

interface ControlOptions {
  x: number;
  y: number;
  render?: (
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    styleOverride: any,
    fabricObject: any
  ) => void;
  actionHandler?: (
    event: MouseEvent,
    transform: any,
    x: number,
    y: number
  ) => void;
  cursorStyleHandler?: (nearestCorner: any, nearestPoint: any) => string;
  actionName?: string;
  sizeX?: number;
  sizeY?: number;
  offsetX?: number;
}

class Control {
  constructor(options: ControlOptions) {
    this.x = options.x;
    this.y = options.y;
    this.render = options.render;
    this.actionHandler = options.actionHandler;
    this.cursorStyleHandler = options.cursorStyleHandler;
    this.actionName = options.actionName;
    this.sizeX = options.sizeX;
    this.sizeY = options.sizeY;
    this.offsetX = options.offsetX;
  }
  x: number;
  y: number;
  render?: (
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    styleOverride: any,
    fabricObject: any
  ) => void;
  actionHandler?: (
    event: MouseEvent,
    transform: any,
    x: number,
    y: number
  ) => void;
  cursorStyleHandler?: (nearestCorner: any, nearestPoint: any) => string;
  actionName?: string;
  sizeX?: number;
  sizeY?: number;
  offsetX?: number;
}

const resize = {
  common: function (
    event: MouseEvent,
    transform: any,
    x: number,
    y: number
  ) {
    transform.setActionHandler(transform, "resizing", true);
  },
  audio: function (
    event: MouseEvent,
    transform: any,
    x: number,
    y: number
  ) {
    transform.setActionHandler(transform, "resizing", true);
  },
  media: function (
    event: MouseEvent,
    transform: any,
    x: number,
    y: number
  ) {
    transform.setActionHandler(transform, "resizing", true);
  },
  transition: function (
    event: MouseEvent,
    transform: any,
    x: number,
    y: number
  ) {
    transform.setActionHandler(transform, "resizing", true);
  }
};

const controlsUtils = {
  scaleSkewCursorStyleHandler: function (nearestCorner: any, nearestPoint: any) {
    return "nwse-resize";
  }
};

const { scaleSkewCursorStyleHandler } = controlsUtils;

export const createResizeControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    render: drawVerticalRightIcon,
    actionHandler: resize.common,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    sizeX: 20,
    sizeY: 32,
    offsetX: 10
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    actionHandler: resize.common,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    render: drawVerticalLeftIcon,
    sizeX: 20,
    sizeY: 32,
    offsetX: -10
  })
});

export const createAudioControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    render: drawVerticalRightIcon,
    actionHandler: resize.audio,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    sizeX: 20,
    sizeY: 32,
    offsetX: 10
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    render: drawVerticalLeftIcon,
    actionHandler: resize.audio,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    sizeX: 20,
    sizeY: 32,
    offsetX: -10
  })
});

export const createMediaControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    actionHandler: resize.media,
    render: drawVerticalRightIcon,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    sizeX: 20,
    sizeY: 32,
    offsetX: 10
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    render: drawVerticalLeftIcon,

    actionHandler: resize.media,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    sizeX: 20,
    sizeY: 32,
    offsetX: -10
  })
});

export const createTransitionControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    actionHandler: resize.transition,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    render: drawVerticalLine
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    actionHandler: resize.transition,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    render: drawVerticalLine
  })
});
