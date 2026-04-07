/**
 * video-transitions.ts
 * ─────────────────────────────────────────────────────────────
 * Complete Video Transitions Registry for AutoCaptionSoftware editor.
 *
 * HOW IT WORKS:
 *  Each transition:
 *   - Has a `kind` that maps to a Remotion presentation (see transition-presentations/)
 *   - Carries `controls[]` for tweakable params (duration, direction, etc.)
 *   - Has a `category` for grouping in the transitions panel
 *
 * To apply a transition between two clips, use the existing
 * dispatch(ADD_TRANSITION, ...) flow and reference the `kind`.
 * The TransitionSeries in the player resolves it to its presentation.
 *
 * NATIVE KINDS (already have Remotion presentations):
 *   fade, slide, wipe, flip, clockWipe, star, circle, rectangle, none
 *
 * FILM IMPACT / EXTENDED KINDS:
 *   These are CSS/SVG animation driven and use the same presentation
 *   slot system — each maps to a presentation component you create in
 *   player/transitions/presentations/.
 */

export type TransitionCategory =
  | "dissolve"
  | "film-impact-animation"
  | "film-impact-distortions"
  | "film-impact-essentials"
  | "film-impact-lights"
  | "film-impact-smart-tools"
  | "film-impact-transformers"
  | "immersive-video"
  | "iris"
  | "page-peel"
  | "slide"
  | "wipe"
  | "zoom";

export type TransitionControlType = "range" | "color" | "select" | "toggle";

export interface TransitionControl {
  key: string;
  label: string;
  type: TransitionControlType;
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { label: string; value: string }[];
}

export interface VideoTransitionDef {
  id: string;
  kind: string;
  name: string;
  category: TransitionCategory;
  description: string;
  defaultDuration: number;
  hasDirection?: boolean;
  controls: TransitionControl[];
  preview?: string;
}

const durationControl: TransitionControl = {
  key: "duration",
  label: "Duration",
  type: "range",
  default: 0.5,
  min: 0.1,
  max: 5,
  step: 0.05,
  unit: "s",
};

const directionControl: TransitionControl = {
  key: "direction",
  label: "Direction",
  type: "select",
  default: "from-right",
  options: [
    { label: "From Left", value: "from-left" },
    { label: "From Right", value: "from-right" },
    { label: "From Top", value: "from-top" },
    { label: "From Bottom", value: "from-bottom" },
  ],
};

const easingControl: TransitionControl = {
  key: "easing",
  label: "Easing",
  type: "select",
  default: "ease-in-out",
  options: [
    { label: "Linear", value: "linear" },
    { label: "Ease In", value: "ease-in" },
    { label: "Ease Out", value: "ease-out" },
    { label: "Ease In Out", value: "ease-in-out" },
    { label: "Spring", value: "spring" },
  ],
};

const softnessFactor: TransitionControl = {
  key: "softness",
  label: "Softness",
  type: "range",
  default: 0,
  min: 0,
  max: 100,
  step: 1,
  unit: "%",
};

// ─────────────────────────────────────────────────────────────────────────────
// DISSOLVE
// ─────────────────────────────────────────────────────────────────────────────

const ADDITIVE_DISSOLVE: VideoTransitionDef = {
  id: "t-additive-dissolve",
  kind: "additive-dissolve",
  name: "Additive Dissolve",
  category: "dissolve",
  description: "Dissolve where overlapping frames are additively brightened.",
  defaultDuration: 0.5,
  controls: [durationControl, { key: "brightness", label: "Peak Brightness", type: "range", default: 1.5, min: 1, max: 3, step: 0.05 }],
};

const CROSS_DISSOLVE: VideoTransitionDef = {
  id: "t-cross-dissolve",
  kind: "fade",
  name: "Cross Dissolve",
  category: "dissolve",
  description: "Classic fade between two clips.",
  defaultDuration: 0.5,
  controls: [durationControl],
  preview: "https://ik.imagekit.io/wombo/transitions-v2/fade.webp",
};

const DIP_TO_BLACK: VideoTransitionDef = {
  id: "t-dip-black",
  kind: "dip-to-black",
  name: "Dip to Black",
  category: "dissolve",
  description: "Both clips fade through black.",
  defaultDuration: 0.5,
  controls: [durationControl],
};

const DIP_TO_WHITE: VideoTransitionDef = {
  id: "t-dip-white",
  kind: "dip-to-white",
  name: "Dip to White",
  category: "dissolve",
  description: "Both clips fade through white.",
  defaultDuration: 0.5,
  controls: [durationControl, { key: "dipColor", label: "Dip Color", type: "color", default: "#ffffff" }],
};

const FILM_DISSOLVE: VideoTransitionDef = {
  id: "t-film-dissolve",
  kind: "film-dissolve",
  name: "Film Dissolve",
  category: "dissolve",
  description: "Organic film-like cross dissolve with slight grain.",
  defaultDuration: 0.5,
  controls: [durationControl, { key: "grainAmount", label: "Grain Amount", type: "range", default: 20, min: 0, max: 100, step: 1, unit: "%" }],
};

const MORPH_CUT: VideoTransitionDef = {
  id: "t-morph-cut",
  kind: "morph-cut",
  name: "Morph Cut",
  category: "dissolve",
  description: "Smooths jump cuts by morphing similar frames.",
  defaultDuration: 0.5,
  controls: [durationControl],
};

const NON_ADDITIVE_DISSOLVE: VideoTransitionDef = {
  id: "t-non-additive-dissolve",
  kind: "non-additive-dissolve",
  name: "Non-Additive Dissolve",
  category: "dissolve",
  description: "Maximum channel dissolve — keeps highest luminance pixel.",
  defaultDuration: 0.5,
  controls: [durationControl],
};

// ─────────────────────────────────────────────────────────────────────────────
// IRIS
// ─────────────────────────────────────────────────────────────────────────────

const IRIS_BOX: VideoTransitionDef = {
  id: "t-iris-box",
  kind: "iris-box",
  name: "Iris Box",
  category: "iris",
  description: "Rectangular iris reveal from center.",
  defaultDuration: 0.5,
  controls: [durationControl, easingControl],
};

const IRIS_CROSS: VideoTransitionDef = {
  id: "t-iris-cross",
  kind: "iris-cross",
  name: "Iris Cross",
  category: "iris",
  description: "Cross-shaped iris reveal.",
  defaultDuration: 0.5,
  controls: [durationControl, easingControl],
};

const IRIS_DIAMOND: VideoTransitionDef = {
  id: "t-iris-diamond",
  kind: "iris-diamond",
  name: "Iris Diamond",
  category: "iris",
  description: "Diamond-shaped iris reveal.",
  defaultDuration: 0.5,
  controls: [durationControl, easingControl],
};

const IRIS_ROUND: VideoTransitionDef = {
  id: "t-iris-round",
  kind: "circle",
  name: "Iris Round",
  category: "iris",
  description: "Circular iris reveal — classic projector look.",
  defaultDuration: 0.5,
  controls: [durationControl, easingControl],
  preview: "https://ik.imagekit.io/wombo/transitions-v2/circle.webp",
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PEEL
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_PEEL: VideoTransitionDef = {
  id: "t-page-peel",
  kind: "page-peel",
  name: "Page Peel",
  category: "page-peel",
  description: "Peels the clip back like a page to reveal the next.",
  defaultDuration: 0.75,
  controls: [
    durationControl,
    directionControl,
    { key: "shadow", label: "Shadow", type: "toggle", default: true },
  ],
};

const PAGE_TURN: VideoTransitionDef = {
  id: "t-page-turn",
  kind: "page-turn",
  name: "Page Turn",
  category: "page-peel",
  description: "Full page turn showing the underside.",
  defaultDuration: 0.75,
  controls: [
    durationControl,
    directionControl,
    { key: "backContent", label: "Back Content", type: "select", default: "black", options: [{ label: "Black", value: "black" }, { label: "Matte", value: "matte" }, { label: "Transparent", value: "transparent" }] },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE
// ─────────────────────────────────────────────────────────────────────────────

const BAND_SLIDE: VideoTransitionDef = {
  id: "t-band-slide",
  kind: "band-slide",
  name: "Band Slide",
  category: "slide",
  description: "Multiple strips slide in opposite directions.",
  defaultDuration: 0.5,
  controls: [durationControl, { key: "bands", label: "Bands", type: "range", default: 4, min: 2, max: 20, step: 1 }, directionControl, easingControl],
};

const CENTER_SPLIT: VideoTransitionDef = {
  id: "t-center-split",
  kind: "center-split",
  name: "Center Split",
  category: "slide",
  description: "Clip splits from the center and slides out both ways.",
  defaultDuration: 0.5,
  controls: [durationControl, { key: "splitDirection", label: "Split", type: "select", default: "horizontal", options: [{ label: "Horizontal", value: "horizontal" }, { label: "Vertical", value: "vertical" }] }, easingControl],
};

const PUSH: VideoTransitionDef = {
  id: "t-push",
  kind: "push",
  name: "Push",
  category: "slide",
  description: "New clip pushes old clip off the edge.",
  defaultDuration: 0.5,
  controls: [durationControl, directionControl, easingControl],
};

const SLIDE: VideoTransitionDef = {
  id: "t-slide",
  kind: "slide",
  name: "Slide",
  category: "slide",
  description: "New clip slides over the old clip.",
  defaultDuration: 0.5,
  hasDirection: true,
  controls: [durationControl, directionControl, easingControl],
  preview: "https://ik.imagekit.io/wombo/transitions-v2/slide-right.webp",
};

const WHIP: VideoTransitionDef = {
  id: "t-whip",
  kind: "whip",
  name: "Whip",
  category: "slide",
  description: "High-speed whip pan between clips.",
  defaultDuration: 0.3,
  controls: [
    durationControl,
    directionControl,
    { key: "blurAmount", label: "Blur Amount", type: "range", default: 30, min: 0, max: 100, step: 1, unit: "%" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// WIPE
// ─────────────────────────────────────────────────────────────────────────────

const BAND_WIPE: VideoTransitionDef = {
  id: "t-band-wipe",
  kind: "band-wipe",
  name: "Band Wipe",
  category: "wipe",
  description: "Multiple horizontal or vertical bands wipe across.",
  defaultDuration: 0.5,
  controls: [durationControl, { key: "bands", label: "Bands", type: "range", default: 4, min: 2, max: 20, step: 1 }, softnessFactor],
};

const BARN_DOORS: VideoTransitionDef = {
  id: "t-barn-doors",
  kind: "barn-doors",
  name: "Barn Doors",
  category: "wipe",
  description: "Two panels open or close like barn doors.",
  defaultDuration: 0.5,
  controls: [
    durationControl,
    { key: "orientation", label: "Orientation", type: "select", default: "horizontal", options: [{ label: "Horizontal", value: "horizontal" }, { label: "Vertical", value: "vertical" }] },
    easingControl,
  ],
};

const CHECKER_WIPE: VideoTransitionDef = {
  id: "t-checker-wipe",
  kind: "checker-wipe",
  name: "Checker Wipe",
  category: "wipe",
  description: "Checkerboard grid wipe reveal.",
  defaultDuration: 0.5,
  controls: [durationControl, { key: "blocks", label: "Blocks", type: "range", default: 4, min: 2, max: 12, step: 1 }],
};

const CHECKERBOARD: VideoTransitionDef = {
  id: "t-checkerboard",
  kind: "checkerboard",
  name: "CheckerBoard",
  category: "wipe",
  description: "Checkerboard pattern transition.",
  defaultDuration: 0.5,
  controls: [durationControl, { key: "width", label: "Block Width", type: "range", default: 50, min: 5, max: 200, step: 1, unit: "px" }, { key: "height", label: "Block Height", type: "range", default: 50, min: 5, max: 200, step: 1, unit: "px" }],
};

const CLOCK_WIPE: VideoTransitionDef = {
  id: "t-clock-wipe",
  kind: "clockWipe",
  name: "Clock Wipe",
  category: "wipe",
  description: "Radial sweep like a clock hand.",
  defaultDuration: 0.5,
  controls: [durationControl, { key: "startAngle", label: "Start Angle", type: "range", default: -90, min: -180, max: 180, step: 1, unit: "°" }],
  preview: "https://ik.imagekit.io/wombo/transitions-v2/clock-wipe.webp",
};

const INSET: VideoTransitionDef = {
  id: "t-inset",
  kind: "inset",
  name: "Inset",
  category: "wipe",
  description: "New clip appears in a small box that expands to fill frame.",
  defaultDuration: 0.5,
  controls: [durationControl, easingControl],
};

const PAINT_SPLATTER: VideoTransitionDef = {
  id: "t-paint-splatter",
  kind: "paint-splatter",
  name: "Paint Splatter",
  category: "wipe",
  description: "Organic paint-splatter reveal.",
  defaultDuration: 0.75,
  controls: [durationControl, { key: "splatColor", label: "Splat Color", type: "color", default: "#000000" }],
};

const PINWHEEL: VideoTransitionDef = {
  id: "t-pinwheel",
  kind: "pinwheel",
  name: "Pinwheel",
  category: "wipe",
  description: "Spinning pinwheel sectors reveal the next clip.",
  defaultDuration: 0.5,
  controls: [durationControl, { key: "blades", label: "Blades", type: "range", default: 4, min: 2, max: 12, step: 1 }],
};

const RADIAL_WIPE: VideoTransitionDef = {
  id: "t-radial-wipe",
  kind: "radial-wipe",
  name: "Radial Wipe",
  category: "wipe",
  description: "Radial sweep wipe from any start angle.",
  defaultDuration: 0.5,
  controls: [durationControl, { key: "angle", label: "Sweep Angle", type: "range", default: 0, min: 0, max: 360, step: 1, unit: "°" }],
};

const RANDOM_BLOCKS: VideoTransitionDef = {
  id: "t-random-blocks",
  kind: "random-blocks",
  name: "Random Blocks",
  category: "wipe",
  description: "Blocks randomly dissolve to reveal the next clip.",
  defaultDuration: 0.5,
  controls: [durationControl, { key: "blockSize", label: "Block Size", type: "range", default: 30, min: 5, max: 200, step: 5, unit: "px" }],
};

const RANDOM_WIPE: VideoTransitionDef = {
  id: "t-random-wipe",
  kind: "random-wipe",
  name: "Random Wipe",
  category: "wipe",
  description: "Random pixel or line wipe.",
  defaultDuration: 0.5,
  controls: [durationControl],
};

const SPIRAL_BOXES: VideoTransitionDef = {
  id: "t-spiral-boxes",
  kind: "spiral-boxes",
  name: "Spiral Boxes",
  category: "wipe",
  description: "Boxes spiral inward to reveal the next clip.",
  defaultDuration: 0.75,
  controls: [durationControl],
};

const VENETIAN_BLINDS: VideoTransitionDef = {
  id: "t-venetian-blinds",
  kind: "venetian-blinds",
  name: "Venetian Blinds",
  category: "wipe",
  description: "Classic horizontal strip wipe like window blinds.",
  defaultDuration: 0.5,
  controls: [
    durationControl,
    { key: "bands", label: "Bands", type: "range", default: 8, min: 2, max: 32, step: 1 },
    { key: "orientation", label: "Orientation", type: "select", default: "horizontal", options: [{ label: "Horizontal", value: "horizontal" }, { label: "Vertical", value: "vertical" }] },
  ],
};

const WEDGE_WIPE: VideoTransitionDef = {
  id: "t-wedge-wipe",
  kind: "wedge-wipe",
  name: "Wedge Wipe",
  category: "wipe",
  description: "Wedge-shaped radial wipe.",
  defaultDuration: 0.5,
  controls: [durationControl],
};

const WIPE: VideoTransitionDef = {
  id: "t-wipe",
  kind: "wipe",
  name: "Wipe",
  category: "wipe",
  description: "Clean directional wipe.",
  defaultDuration: 0.5,
  hasDirection: true,
  controls: [durationControl, directionControl, softnessFactor],
  preview: "https://ik.imagekit.io/wombo/transitions-v2/wipe-right.webp",
};

const ZIG_ZAG_BLOCKS: VideoTransitionDef = {
  id: "t-zig-zag-blocks",
  kind: "zig-zag-blocks",
  name: "Zig-Zag Blocks",
  category: "wipe",
  description: "Alternating zig-zag block reveal.",
  defaultDuration: 0.5,
  controls: [durationControl, { key: "columns", label: "Columns", type: "range", default: 6, min: 2, max: 20, step: 1 }],
};

// ─────────────────────────────────────────────────────────────────────────────
// ZOOM
// ─────────────────────────────────────────────────────────────────────────────

const CROSS_ZOOM: VideoTransitionDef = {
  id: "t-cross-zoom",
  kind: "cross-zoom",
  name: "Cross Zoom",
  category: "zoom",
  description: "Energetic zoom through the transition point.",
  defaultDuration: 0.4,
  controls: [
    durationControl,
    { key: "zoomAmount", label: "Zoom Amount", type: "range", default: 200, min: 100, max: 500, step: 10, unit: "%" },
    easingControl,
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// FILM IMPACT — ANIMATION
// ─────────────────────────────────────────────────────────────────────────────

const makeFilmImpactAnimation = (id: string, kind: string, name: string, description: string): VideoTransitionDef => ({
  id,
  kind,
  name,
  category: "film-impact-animation",
  description,
  defaultDuration: 0.5,
  controls: [
    durationControl,
    easingControl,
    { key: "intensity", label: "Intensity", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%" },
  ],
});

const FI_BLOCK_MOTION: VideoTransitionDef = makeFilmImpactAnimation("t-fi-block-motion", "fi-block-motion", "FI: Block Motion Impacts", "Blocks animate across the cut point.");
const FI_FLIP_MOTION: VideoTransitionDef = makeFilmImpactAnimation("t-fi-flip-motion", "fi-flip-motion", "FI: Flip Motion Impacts", "Clip flips over like a card.");
const FI_FOLD_MOTION: VideoTransitionDef = makeFilmImpactAnimation("t-fi-fold-motion", "fi-fold-motion", "FI: Fold Motion Impacts", "Accordion fold between clips.");
const FI_POP_MOTION: VideoTransitionDef = makeFilmImpactAnimation("t-fi-pop-motion", "fi-pop-motion", "FI: Pop Motion Impacts", "Scale pop impact transition.");
const FI_PULL_MOTION: VideoTransitionDef = makeFilmImpactAnimation("t-fi-pull-motion", "fi-pull-motion", "FI: Pull Motion Impacts", "Pulls the clip away from canvas.");
const FI_SPIN_MOTION: VideoTransitionDef = makeFilmImpactAnimation("t-fi-spin-motion", "fi-spin-motion", "FI: Spin Motion Impacts", "Spinning enter/exit.");
const FI_SPRING_MOTION: VideoTransitionDef = makeFilmImpactAnimation("t-fi-spring-motion", "fi-spring-motion", "FI: Spring Motion Impacts", "Springy overshoot motion.");
const FI_TRAVEL_MOTION: VideoTransitionDef = makeFilmImpactAnimation("t-fi-travel-motion", "fi-travel-motion", "FI: Travel Motion Impacts", "Camera travel feel.");
const FI_TYPEWRITER: VideoTransitionDef = makeFilmImpactAnimation("t-fi-typewriter", "fi-typewriter-impact", "FI: Typewriter Impacts", "Text typewriter reveal transition.");

// ─────────────────────────────────────────────────────────────────────────────
// FILM IMPACT — DISTORTIONS
// ─────────────────────────────────────────────────────────────────────────────

const makeFilmImpactDistortion = (id: string, kind: string, name: string, description: string, extraControls: TransitionControl[] = []): VideoTransitionDef => ({
  id,
  kind,
  name,
  category: "film-impact-distortions",
  description,
  defaultDuration: 0.5,
  controls: [
    durationControl,
    { key: "intensity", label: "Intensity", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%" },
    ...extraControls,
  ],
});

const FI_EARTHQUAKE: VideoTransitionDef = makeFilmImpactDistortion("t-fi-earthquake", "fi-earthquake", "FI: Earthquake Impacts", "Screen shake earthquake at cut.");
const FI_FLICKER: VideoTransitionDef = makeFilmImpactDistortion("t-fi-flicker", "fi-flicker", "FI: Flicker Impacts", "Random exposure flicker through the cut.", [{ key: "flickerSpeed", label: "Speed", type: "range", default: 5, min: 1, max: 30, step: 1 }]);
const FI_GLASS: VideoTransitionDef = makeFilmImpactDistortion("t-fi-glass", "fi-glass", "FI: Glass Impacts", "Shattering glass distortion.");
const FI_GLITCH_2: VideoTransitionDef = makeFilmImpactDistortion("t-fi-glitch-2", "fi-glitch-2", "FI: Glitch 2.0 Impacts", "Advanced digital glitch corruption.", [{ key: "blockSize", label: "Block Size", type: "range", default: 20, min: 1, max: 200, step: 1, unit: "px" }]);
const FI_GRUNGE: VideoTransitionDef = makeFilmImpactDistortion("t-fi-grunge", "fi-grunge", "FI: Grunge Impacts", "Organic worn/damaged film look.");
const FI_KALEIDOSCOPE: VideoTransitionDef = makeFilmImpactDistortion("t-fi-kaleidoscope", "fi-kaleidoscope", "FI: Kaleidoscope Impacts", "Kaleidoscope mirror transition.", [{ key: "segments", label: "Segments", type: "range", default: 6, min: 3, max: 12, step: 1 }]);
const FI_LIQUID_DISTORTION: VideoTransitionDef = makeFilmImpactDistortion("t-fi-liquid", "fi-liquid-distortion", "FI: Liquid Distortion Impacts", "Fluid liquid wave between clips.");
const FI_TV_POWER: VideoTransitionDef = makeFilmImpactDistortion("t-fi-tv-power", "fi-tv-power", "FI: TV Power Impacts", "CRT TV power on/off effect.");
const FI_VHS_DAMAGE: VideoTransitionDef = makeFilmImpactDistortion("t-fi-vhs-damage", "fi-vhs-damage", "FI: VHS Damage Impacts", "VHS tape damage and dropout effect.");

// ─────────────────────────────────────────────────────────────────────────────
// FILM IMPACT — ESSENTIALS
// ─────────────────────────────────────────────────────────────────────────────

const makeFilmImpactEssential = (id: string, kind: string, name: string, description: string, extras: TransitionControl[] = []): VideoTransitionDef => ({
  id,
  kind,
  name,
  category: "film-impact-essentials",
  description,
  defaultDuration: 0.5,
  controls: [durationControl, easingControl, ...extras],
});

const FI_BLUR_DISSOLVE: VideoTransitionDef = makeFilmImpactEssential("t-fi-blur-dissolve", "fi-blur-dissolve", "FI: Blur Dissolve Impacts", "Blur-into-dissolve transition.", [{ key: "blurAmount", label: "Blur Amount", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%" }]);
const FI_BLUR_TO_COLOR: VideoTransitionDef = makeFilmImpactEssential("t-fi-blur-color", "fi-blur-to-color", "FI: Blur to Color Impacts", "Blur out to a solid color, then in.", [{ key: "color", label: "Dip Color", type: "color", default: "#000000" }]);
const FI_BURN_ALPHA: VideoTransitionDef = makeFilmImpactEssential("t-fi-burn-alpha", "fi-burn-alpha", "FI: Burn Alpha Impacts", "Alpha channel burns/dissolves away.");
const FI_BURN_CHROMA: VideoTransitionDef = makeFilmImpactEssential("t-fi-burn-chroma", "fi-burn-chroma", "FI: Burn Chroma Impacts", "Chromatic burn through transition.");
const FI_CHAOS: VideoTransitionDef = makeFilmImpactEssential("t-fi-chaos", "fi-chaos", "FI: Chaos Impacts", "Random chaotic pixel scatter.");
const FI_CLOCK_WIPE_IMPACT: VideoTransitionDef = makeFilmImpactEssential("t-fi-clock-wipe", "fi-clock-wipe-impact", "FI: Clock Wipe Impacts", "Animated clock wipe with motion blur.");
const FI_DISSOLVE_IMPACT: VideoTransitionDef = makeFilmImpactEssential("t-fi-dissolve", "fi-dissolve-impact", "FI: Dissolve Impacts", "Enhanced film dissolve.", [{ key: "grain", label: "Grain", type: "range", default: 20, min: 0, max: 100, step: 1, unit: "%" }]);
const FI_FLASH: VideoTransitionDef = makeFilmImpactEssential("t-fi-flash", "fi-flash-impact", "FI: Flash Impacts", "White/color flash at the cut point.", [{ key: "flashColor", label: "Flash Color", type: "color", default: "#ffffff" }]);
const FI_FRAME: VideoTransitionDef = makeFilmImpactEssential("t-fi-frame", "fi-frame-impact", "FI: Frame Impacts", "Framed border transition.");
const FI_LINEAR_WIPE_IMPACT: VideoTransitionDef = makeFilmImpactEssential("t-fi-linear-wipe", "fi-linear-wipe-impact", "FI: Linear Wipe Impacts", "Precision linear wipe with feather.", [{ key: "angle", label: "Angle", type: "range", default: 0, min: 0, max: 360, step: 1, unit: "°" }]);
const FI_LUMA_FADE: VideoTransitionDef = makeFilmImpactEssential("t-fi-luma-fade", "fi-luma-fade", "FI: Luma Fade Impacts", "Fade driven by luminance key.");
const FI_MOSAIC_IMPACT: VideoTransitionDef = makeFilmImpactEssential("t-fi-mosaic", "fi-mosaic-impact", "FI: Mosaic Impacts", "Pixelation builds and dissolves.", [{ key: "blockSize", label: "Block Size", type: "range", default: 30, min: 1, max: 200, step: 1, unit: "px" }]);
const FI_NEON_WIPE: VideoTransitionDef = makeFilmImpactEssential("t-fi-neon-wipe", "fi-neon-wipe", "FI: Neon Wipe Impacts", "Glowing neon line wipe.", [{ key: "neonColor", label: "Neon Color", type: "color", default: "#00ffff" }]);
const FI_PUSH_IMPACT: VideoTransitionDef = makeFilmImpactEssential("t-fi-push", "fi-push-impact", "FI: Push Impacts", "Dynamic push with motion blur.", [{ key: "direction", label: "Direction", type: "select", default: "from-right", options: [{ label: "From Left", value: "from-left" }, { label: "From Right", value: "from-right" }, { label: "From Top", value: "from-top" }, { label: "From Bottom", value: "from-bottom" }] }]);
const FI_ROLL: VideoTransitionDef = makeFilmImpactEssential("t-fi-roll", "fi-roll-impact", "FI: Roll Impacts", "Horizontal or vertical roll.");
const FI_STAR_WIPE: VideoTransitionDef = makeFilmImpactEssential("t-fi-star-wipe", "fi-star-wipe-impact", "FI: Star Wipe Impacts", "Star-shaped wipe.", [{ key: "points", label: "Points", type: "range", default: 5, min: 3, max: 12, step: 1 }]);
const FI_STRETCH: VideoTransitionDef = makeFilmImpactEssential("t-fi-stretch", "fi-stretch-impact", "FI: Stretch Impacts", "Elastic stretch transition.");

// ─────────────────────────────────────────────────────────────────────────────
// FILM IMPACT — LIGHTS & BLURS
// ─────────────────────────────────────────────────────────────────────────────

const makeFilmImpactLight = (id: string, kind: string, name: string, description: string, extras: TransitionControl[] = []): VideoTransitionDef => ({
  id, kind, name, category: "film-impact-lights", description, defaultDuration: 0.5,
  controls: [durationControl, { key: "intensity", label: "Intensity", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%" }, easingControl, ...extras],
});

const FI_CHROMA_LEAK: VideoTransitionDef = makeFilmImpactLight("t-fi-chroma-leak", "fi-chroma-leak", "FI: Chroma Leak Impacts", "RGB channel separation leak.");
const FI_DIRECTIONAL_BLUR_IMPACT: VideoTransitionDef = makeFilmImpactLight("t-fi-dir-blur", "fi-directional-blur-impact", "FI: Directional Blur Impacts", "Directional motion blur through cut.", [{ key: "angle", label: "Angle", type: "range", default: 0, min: 0, max: 360, step: 1, unit: "°" }]);
const FI_FLARE_IMPACT: VideoTransitionDef = makeFilmImpactLight("t-fi-flare", "fi-flare-impact", "FI: Flare Impacts", "Lens flare burst at the cut.");
const FI_GLOW_IMPACT: VideoTransitionDef = makeFilmImpactLight("t-fi-glow", "fi-glow-impact", "FI: Glow Impacts", "Soft glow bloom transition.");
const FI_LENS_BLUR: VideoTransitionDef = makeFilmImpactLight("t-fi-lens-blur", "fi-lens-blur-impact", "FI: Lens Blur Impacts", "Camera rack-focus blur through cut.");
const FI_LIGHT_LEAK_IMPACT: VideoTransitionDef = makeFilmImpactLight("t-fi-light-leak", "fi-light-leak-impact", "FI: Light Leak Impacts", "Organic light leak in the transition.");
const FI_LIGHT_SWEEP: VideoTransitionDef = makeFilmImpactLight("t-fi-light-sweep", "fi-light-sweep", "FI: Light Sweep Impacts", "Sweeping highlight wipe.", [{ key: "angle", label: "Angle", type: "range", default: 30, min: 0, max: 360, step: 1, unit: "°" }]);
const FI_SOFT_WIPE: VideoTransitionDef = makeFilmImpactLight("t-fi-soft-wipe", "fi-soft-wipe", "FI: Soft Wipe Impacts", "Feathered, glowing wipe.");
const FI_SOLARIZE: VideoTransitionDef = makeFilmImpactLight("t-fi-solarize", "fi-solarize", "FI: Solarize Impacts", "Solarize inversion peak at cut.");
const FI_STRIPE: VideoTransitionDef = makeFilmImpactLight("t-fi-stripe", "fi-stripe", "FI: Stripe Impacts", "Glowing stripe wipe.");
const FI_ZOOM_BLUR: VideoTransitionDef = makeFilmImpactLight("t-fi-zoom-blur", "fi-zoom-blur", "FI: Zoom Blur Impacts", "Zoom into blur through cut.", [{ key: "zoomAmount", label: "Zoom Amount", type: "range", default: 150, min: 100, max: 500, step: 10, unit: "%" }]);

// ─────────────────────────────────────────────────────────────────────────────
// FILM IMPACT — SMART TOOLS
// ─────────────────────────────────────────────────────────────────────────────

const FI_MOTION_CAMERA: VideoTransitionDef = {
  id: "t-fi-motion-camera",
  kind: "fi-motion-camera",
  name: "FI: Motion Camera",
  category: "film-impact-smart-tools",
  description: "Simulates a real camera movement to join two clips.",
  defaultDuration: 0.75,
  controls: [
    durationControl,
    { key: "cameraMove", label: "Camera Move", type: "select", default: "dolly-in", options: [{ label: "Dolly In", value: "dolly-in" }, { label: "Dolly Out", value: "dolly-out" }, { label: "Pan Left", value: "pan-left" }, { label: "Pan Right", value: "pan-right" }, { label: "Tilt Up", value: "tilt-up" }, { label: "Tilt Down", value: "tilt-down" }] },
    easingControl,
  ],
};

const FI_MOTION_TWEEN: VideoTransitionDef = {
  id: "t-fi-motion-tween",
  kind: "fi-motion-tween",
  name: "FI: Motion Tween",
  category: "film-impact-smart-tools",
  description: "Morphs between two clip positions/scales using tween curves.",
  defaultDuration: 0.5,
  controls: [durationControl, easingControl],
};

const FI_SHAPE_FLOW: VideoTransitionDef = {
  id: "t-fi-shape-flow",
  kind: "fi-shape-flow",
  name: "FI: Shape Flow",
  category: "film-impact-smart-tools",
  description: "Custom shape matte wipe between clips.",
  defaultDuration: 0.5,
  controls: [
    durationControl,
    { key: "shape", label: "Shape", type: "select", default: "circle", options: [{ label: "Circle", value: "circle" }, { label: "Star", value: "star" }, { label: "Diamond", value: "diamond" }, { label: "Heart", value: "heart" }] },
    easingControl,
  ],
};

const FI_TEXT_ANIMATOR: VideoTransitionDef = {
  id: "t-fi-text-animator",
  kind: "fi-text-animator",
  name: "FI: Text Animator",
  category: "film-impact-smart-tools",
  description: "Animated text reveal as a transition bridge.",
  defaultDuration: 0.75,
  controls: [
    durationControl,
    { key: "animationType", label: "Animation", type: "select", default: "slide-in", options: [{ label: "Slide In", value: "slide-in" }, { label: "Fade In", value: "fade-in" }, { label: "Bounce", value: "bounce" }] },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// FILM IMPACT — TRANSFORMERS
// ─────────────────────────────────────────────────────────────────────────────

const makeFilmImpactTransformer = (id: string, kind: string, name: string, description: string, extras: TransitionControl[] = []): VideoTransitionDef => ({
  id, kind, name, category: "film-impact-transformers", description, defaultDuration: 0.5,
  controls: [durationControl, easingControl, { key: "intensity", label: "Intensity", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%" }, ...extras],
});

const FI_3D_ROLL: VideoTransitionDef = makeFilmImpactTransformer("t-fi-3d-roll", "fi-3d-roll", "FI: 3D Roll Impacts", "3D cylinder roll between clips.");
const FI_3D_SPIN: VideoTransitionDef = makeFilmImpactTransformer("t-fi-3d-spin", "fi-3d-spin", "FI: 3D Spin Impacts", "3D cube spin transition.");
const FI_FILM_ROLL: VideoTransitionDef = makeFilmImpactTransformer("t-fi-film-roll", "fi-film-roll", "FI: Film Roll Impacts", "Classic film roll wind-on effect.");
const FI_LOUVER: VideoTransitionDef = makeFilmImpactTransformer("t-fi-louver", "fi-louver", "FI: Louver Impacts", "Venetian blind flip panels.", [{ key: "panels", label: "Panels", type: "range", default: 8, min: 2, max: 24, step: 1 }]);
const FI_MIRROR_IMPACT: VideoTransitionDef = makeFilmImpactTransformer("t-fi-mirror", "fi-mirror-impact", "FI: Mirror Impacts", "Mirror reflection transition.");
const FI_PAGE_PEEL_IMPACT: VideoTransitionDef = makeFilmImpactTransformer("t-fi-page-peel", "fi-page-peel-impact", "FI: Page Peel Impacts", "Animated page peel with shadow.");
const FI_PANEL_WIPE: VideoTransitionDef = makeFilmImpactTransformer("t-fi-panel-wipe", "fi-panel-wipe", "FI: Panel Wipe Impacts", "Multi-panel wipe across the frame.", [{ key: "panels", label: "Panels", type: "range", default: 4, min: 2, max: 12, step: 1 }]);
const FI_PLATEAU_WIPE: VideoTransitionDef = makeFilmImpactTransformer("t-fi-plateau-wipe", "fi-plateau-wipe", "FI: Plateau Wipe Impacts", "Plateau-shaped reveal wipe.");
const FI_SLICE: VideoTransitionDef = makeFilmImpactTransformer("t-fi-slice", "fi-slice", "FI: Slice Impacts", "Slices clip into strips that slide apart.", [{ key: "slices", label: "Slices", type: "range", default: 8, min: 2, max: 32, step: 1 }]);
const FI_SPLIT_IMPACT: VideoTransitionDef = makeFilmImpactTransformer("t-fi-split", "fi-split-impact", "FI: Split Impacts", "Splits the frame into sections.", [{ key: "orientation", label: "Orientation", type: "select", default: "horizontal", options: [{ label: "Horizontal", value: "horizontal" }, { label: "Vertical", value: "vertical" }] }]);
const FI_STRETCH_WIPE: VideoTransitionDef = makeFilmImpactTransformer("t-fi-stretch-wipe", "fi-stretch-wipe", "FI: Stretch Wipe Impacts", "Elastic stretch wipe transition.");
const FI_WAVE: VideoTransitionDef = makeFilmImpactTransformer("t-fi-wave", "fi-wave-impact", "FI: Wave Impacts", "Wave distortion wipe.", [{ key: "amplitude", label: "Amplitude", type: "range", default: 50, min: 0, max: 200, step: 1, unit: "px" }]);

// ─────────────────────────────────────────────────────────────────────────────
// IMMERSIVE VIDEO (360 transitions)
// ─────────────────────────────────────────────────────────────────────────────

const makeImmersive = (id: string, kind: string, name: string, description: string): VideoTransitionDef => ({
  id, kind, name, category: "immersive-video", description, defaultDuration: 0.75,
  controls: [durationControl, { key: "intensity", label: "Intensity", type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%" }],
});

const FI_VR_CHROMA_LEAKS: VideoTransitionDef = makeImmersive("t-vr-chroma", "vr-chroma-leaks", "FI: Chroma Leaks", "360° chromatic leak transition.");
const FI_VR_GRADIENT_WIPE: VideoTransitionDef = makeImmersive("t-vr-gradient", "vr-gradient-wipe", "FI: Gradient Wipe", "Gradient wipe for 360° content.");
const FI_VR_IRIS_WIPE: VideoTransitionDef = makeImmersive("t-vr-iris", "vr-iris-wipe", "FI: Iris Wipe", "Iris wipe adapted for 360° projection.");
const FI_VR_LIGHT_LEAKS: VideoTransitionDef = makeImmersive("t-vr-light-leaks", "vr-light-leaks", "FI: Light Leaks", "Light leak transition for 360° footage.");
const FI_VR_LIGHT_RAYS: VideoTransitionDef = makeImmersive("t-vr-light-rays", "vr-light-rays", "FI: Light Rays", "God rays burst between 360° clips.");
const FI_VR_MOBIUS_ZOOM: VideoTransitionDef = makeImmersive("t-vr-mobius", "vr-mobius-zoom", "FI: Mobius Zoom", "Möbius strip zoom through 360° space.");
const FI_VR_RANDOM_BLOCKS: VideoTransitionDef = makeImmersive("t-vr-random-blocks", "vr-random-blocks", "FI: Random Blocks", "Random block dissolve for 360°.");
const FI_VR_SPHERICAL_BLUR: VideoTransitionDef = makeImmersive("t-vr-spherical-blur", "vr-spherical-blur", "FI: Spherical Blur", "Spherical blur transition for VR.");

// ─────────────────────────────────────────────────────────────────────────────
// MASTER REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const VIDEO_TRANSITIONS: VideoTransitionDef[] = [
  ADDITIVE_DISSOLVE, CROSS_DISSOLVE, DIP_TO_BLACK, DIP_TO_WHITE, FILM_DISSOLVE, MORPH_CUT, NON_ADDITIVE_DISSOLVE,
  FI_BLOCK_MOTION, FI_FLIP_MOTION, FI_FOLD_MOTION, FI_POP_MOTION, FI_PULL_MOTION, FI_SPIN_MOTION, FI_SPRING_MOTION, FI_TRAVEL_MOTION, FI_TYPEWRITER,
  FI_EARTHQUAKE, FI_FLICKER, FI_GLASS, FI_GLITCH_2, FI_GRUNGE, FI_KALEIDOSCOPE, FI_LIQUID_DISTORTION, FI_TV_POWER, FI_VHS_DAMAGE,
  FI_BLUR_DISSOLVE, FI_BLUR_TO_COLOR, FI_BURN_ALPHA, FI_BURN_CHROMA, FI_CHAOS, FI_CLOCK_WIPE_IMPACT,
  FI_DISSOLVE_IMPACT, FI_FLASH, FI_FRAME, FI_LINEAR_WIPE_IMPACT, FI_LUMA_FADE, FI_MOSAIC_IMPACT,
  FI_NEON_WIPE, FI_PUSH_IMPACT, FI_ROLL, FI_STAR_WIPE, FI_STRETCH,
  FI_CHROMA_LEAK, FI_DIRECTIONAL_BLUR_IMPACT, FI_FLARE_IMPACT, FI_GLOW_IMPACT, FI_LENS_BLUR,
  FI_LIGHT_LEAK_IMPACT, FI_LIGHT_SWEEP, FI_SOFT_WIPE, FI_SOLARIZE, FI_STRIPE, FI_ZOOM_BLUR,
  FI_MOTION_CAMERA, FI_MOTION_TWEEN, FI_SHAPE_FLOW, FI_TEXT_ANIMATOR,
  FI_3D_ROLL, FI_3D_SPIN, FI_FILM_ROLL, FI_LOUVER, FI_MIRROR_IMPACT, FI_PAGE_PEEL_IMPACT,
  FI_PANEL_WIPE, FI_PLATEAU_WIPE, FI_SLICE, FI_SPLIT_IMPACT, FI_STRETCH_WIPE, FI_WAVE,
  FI_VR_CHROMA_LEAKS, FI_VR_GRADIENT_WIPE, FI_VR_IRIS_WIPE, FI_VR_LIGHT_LEAKS,
  FI_VR_LIGHT_RAYS, FI_VR_MOBIUS_ZOOM, FI_VR_RANDOM_BLOCKS, FI_VR_SPHERICAL_BLUR,
  IRIS_BOX, IRIS_CROSS, IRIS_DIAMOND, IRIS_ROUND,
  PAGE_PEEL, PAGE_TURN,
  BAND_SLIDE, CENTER_SPLIT, PUSH, SLIDE, WHIP,
  BAND_WIPE, BARN_DOORS, CHECKER_WIPE, CHECKERBOARD, CLOCK_WIPE, INSET, PAINT_SPLATTER,
  PINWHEEL, RADIAL_WIPE, RANDOM_BLOCKS, RANDOM_WIPE, SPIRAL_BOXES, VENETIAN_BLINDS,
  WEDGE_WIPE, WIPE, ZIG_ZAG_BLOCKS,
  CROSS_ZOOM,
];

export function getTransitionDef(kind: string): VideoTransitionDef | undefined {
  return VIDEO_TRANSITIONS.find((t) => t.kind === kind);
}

export function getTransitionsByCategory(category: TransitionCategory): VideoTransitionDef[] {
  return VIDEO_TRANSITIONS.filter((t) => t.category === category);
}

export const TRANSITION_CATEGORY_LABELS: Record<TransitionCategory, string> = {
  "dissolve": "Dissolve",
  "film-impact-animation": "Film Impact Animation",
  "film-impact-distortions": "Film Impact Distortions",
  "film-impact-essentials": "Film Impact Essentials",
  "film-impact-lights": "Film Impact Lights & Blurs",
  "film-impact-smart-tools": "Film Impact Smart Tools",
  "film-impact-transformers": "Film Impact Transformers",
  "immersive-video": "Immersive Video",
  "iris": "Iris",
  "page-peel": "Page Peel",
  "slide": "Slide",
  "wipe": "Wipe",
  "zoom": "Zoom",
};

export const TRANSITION_CATEGORY_ORDER: TransitionCategory[] = [
  "dissolve", "film-impact-animation", "film-impact-distortions", "film-impact-essentials",
  "film-impact-lights", "film-impact-smart-tools", "film-impact-transformers",
  "immersive-video", "iris", "page-peel", "slide", "wipe", "zoom",
];