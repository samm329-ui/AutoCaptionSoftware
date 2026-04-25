# Video Editor - Complete Feature Documentation

---

## The Story Behind This Project

### How It All Started

This video editor was born from frustration. We needed to add captions to videos - a simple task that should have been easy. But every tool we tried fell short. Either the captions were inaccurate, or the software was too complex, or the output looked amateurish.

So we built our own solution - **Auto Caption Software** with a sophisticated 15-stage AI pipeline that achieved 99% accuracy using Whisper, LLM refinement, and dual scoring systems.

But that remaining 1% - the edge cases where Whisper misrecognized technical terms, where background noise caused errors, where multiple speakers confused the system - that 1% drove us to build something bigger.

### Why We Built This Editor

Because of that 1%, we thought:

> "We need a video editor to fix captions manually."

But once you have an editor, why stop at captions? Why not add graphics, overlays, combine media, create complete videos? Why not build a tool that gives anyone - regardless of skills or budget - the power to create professional videos?

### The Evolution

1. **Caption Engine** - Auto caption software achieving 99% accuracy
2. **Video Editor** - Browser-based timeline editor with professional features
3. **One-Click Video Creation** - The future: AI generates entire videos from audio/script

---

## What If?

> **What if there were no agencies?**
> No more waiting weeks. No more expensive contracts. No more back-and-forth revisions.

> **What if there were no editors?**
> No more learning curves. No more complex software. No more technical skills required.

> **What if there were no designers?**
> No more expensive logo designs. No more template dependencies. No more creative limitations.

> **What if there were no complexity?**
> No more confusing menus. No more overwhelming options. No more steep learning curves.

> **What if everything was just one click?**
> Upload your audio. Done. Captions appear. Graphics generate. Animations apply. Music adds itself. Sound effects sync automatically. Export in seconds.

**That is where this project is heading.**

The video editor you're using today is the foundation for that future. Every feature, every panel, every option - they're all steps toward the ultimate goal:

### *"Create a professional video in 30 seconds. One click. No skills. No agency. No complexity."*

---

## Project Components

This codebase contains multiple interconnected projects:

```
caption-tool-master/
├── caption_engine/      # AI Caption Pipeline (15-stage transcription)
├── backend/            # FastAPI Server (API + WebSocket)
├── web_ui/            # React Frontend (CDN-based)
├── video-editor/      # Next.js Video Editor (this project)
└── data/            # SQLite Database + Uploads
```

### Caption Engine (`caption_engine/`)

The AI brain behind auto-captioning. A 15-stage pipeline featuring:

- **Audio Processing**: Extraction, chunking, quality estimation
- **Whisper Transcription**: With retry logic and adaptive thresholds
- **Language Detection**: Supports English, Hindi, Hinglish
- **LLM Refinement**: Groq GPT contextual correction
- **Dual Scoring**: Semantic + keyword scoring for accuracy
- **Hallucination Guard**: Prevents Whisper errors
- **Word Alignment**: WhisperX forced alignment
- **Drift Clamping**: Prevents timestamp drift
- **Output**: SRT/VTT format generation

### Backend (`backend/`)

FastAPI server handling:

- **Job Management**: Upload, process, export videos
- **Pipeline Runner**: Background thread processing
- **WebSocket Progress**: Real-time updates
- **Database**: SQLite for job history
- **File Serving**: Static file delivery

### Web UI (`web_ui/`)

React frontend for captioning:

- Upload videos
- Track job progress
- View/download captions
- Export with burned subtitles

### Video Editor (`video-editor/`)

The full-featured video editor you're using now. See below for features.

---

## The Ultimate Vision

| Stage | Goal | Timeline |
|-------|------|----------|
| **Phase 1** | Professional editor with all features | ✅ Complete |
| **Phase 2** | AI-powered auto-captions | 🔄 In Progress |
| **Phase 3** | One-click video generation | 🔄 Future |

**The dream**: Upload an audio file, click once, and get a complete video with:
- Auto-generated captions (perfectly synced)
- AI-chosen background music
- Matching sound effects
- Professional animations
- Custom graphics
- Perfect transitions

**No editor. No designer. No agency. No skills. Just one click.**

---

## Table of Contents

1. [How to Access Features](#how-to-access-features)
2. [Panel Layout](#panel-layout)
3. [Menu System](#menu-system)
4. [Timeline Tools](#timeline-tools)
5. [Timeline Features](#timeline-features)
6. [Track Management](#track-management)
7. [Media Rendering](#media-rendering)
8. [Video Effects](#video-effects)
9. [Transitions](#transitions)
10. [Text Animations](#text-animations)
11. [Control Panels](#control-panels)
12. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## How to Access Features

### Getting Started

1. **Open Editor**: Navigate to `http://localhost:3000/edit`
2. **Select Media**: Click on any clip in the timeline to select it
3. **Open Menus**: Click on menu items in the top menu bar (Videos, Audios, Texts, Captions, etc.)
4. **Access Controls**: Control panels appear when you select a clip

---

## Panel Layout

### Top Menu Bar

Located at the top of the editor. Contains all media access menus:

| Menu | Purpose |
|------|---------|
| **Videos** | Stock video search from Pexels |
| **Audios** | Stock music and audio search |
| **Images** | Image search and upload |
| **Texts** | Add text, shapes, and images |
| **Captions** | Auto-generate subtitles |
| **Transitions** | Apply transitions between clips |
| **Elements** | Adjustment layers, color mattes |
| **SFX** | Sound effects library |
| **Voice Over** | Record voice narration |
| **AI Voice** | AI text-to-speech voices |

### Project Panel (Left Side)

**Location**: Left side of the editor interface

**Media Tab**:
- Displays all imported media files
- Grid/List view toggle
- Grouped by type: Videos, Images, Audio
- Folder organization with drag-and-drop
- Double-click to add to timeline
- Right-click for context menu options
- Create new folders
- Create Adjustment Layer
- Create Color Matte

**Effects Tab**:
- Browse video effects library
- Drag effects to clips
- Click to apply

### Source Panel

**Location**: Below or beside Project Panel

**Purpose**: Preview source media before adding to timeline

### Effects Control Panel (Right Side)

**Location**: Right side of the editor interface

**Purpose**: Adjust properties of selected clips

**Appears when**: A clip is selected in the timeline

### Timeline Panel (Bottom)

**Location**: Bottom of the editor interface

**Contains**:
- Track lanes
- Clips
- Playhead
- Time ruler
- Timeline tools

### Preview/Player Panel

**Location**: Top-right or center area

**Purpose**: Real-time video preview with Remotion

---

## Menu System

### Videos Menu

**Access**: Click "Videos" in menu bar

**Features**:
- Search bar with query input
- Video grid display with thumbnails
- Click to add video to timeline
- Load more pagination
- Popular videos auto-load on open
- Videos sourced from Pexels stock library

**How to use**:
1. Click Videos menu
2. Type in search bar to find videos
3. Click on video thumbnail to add to timeline
4. Drag video from project panel to timeline

---

### Audios Menu

**Access**: Click "Audios" in menu bar

**Features**:
- Search stock music with debounced search
- Audio track list with preview playback
- Author/source attribution display
- Play/pause individual tracks
- Load more pagination
- Click to add to timeline

**How to use**:
1. Click Audios menu
2. Search or browse available tracks
3. Click track to preview
4. Click add button to insert into timeline

---

### Images Menu

**Access**: Click "Images" in menu bar

**Features**:
- Image search capability
- Thumbnail grid display
- Upload custom images
- Pexels image integration
- Supports PNG, JPG, WebP, GIF

**How to use**:
1. Click Images menu
2. Search for images or upload your own
3. Click image to add to project
4. Drag from project panel to timeline

---

### Texts Menu

**Access**: Click "Texts" in menu bar

**Features**:
- Add Text button - Creates new text clip
- Add Image/Shape button - Creates shape or image layer
- Quick-add directly to timeline

**How to use**:
1. Click Texts menu
2. Choose "Add Text" to create new text
3. Text clip appears in timeline
4. Click text clip to edit in control panel

---

### Captions Menu

**Access**: Click "Captions" in menu bar

**Features**:
- Media source selector (dropdown of video/audio clips on timeline)
- Generate button for AI caption generation
- Displays generated captions with timestamps
- Click caption to seek to position
- Shows caption text preview
- Transcription API integration for speech-to-text

**How to use**:
1. Select a video or audio clip in timeline
2. Click Captions menu
3. Choose source from dropdown
4. Click "Generate Captions" button
5. Captions appear below source clip
6. Click any caption to seek to that position
7. Edit caption text if needed in control panel

---

### Transitions Menu

**Access**: Click "Transitions" in menu bar

**Features**:
- Visual grid of transition previews
- 15+ transitions available
- Duration settings
- Direction options
- Preview before applying

**How to use**:
1. Click Transitions menu
2. Browse available transitions
3. Drag transition between two clips
4. Or select transition and click to apply

**Available Transitions**:
- None (instant cut)
- Fade (standard fade)
- Flip (3D flip)
- Clock Wipe (circular from center)
- Slide Up/Down/Left/Right
- Wipe Up/Down/Left/Right
- Star, Circle, Rectangle shape wipes

---

### Elements Menu

**Access**: Click "Elements" in menu bar

**Features**:
- Adjustment Layer (transparent overlay)
- Color Matte (solid color background)
- Drag to timeline to add

**Adjustment Layer**:
- Transparent video layer that affects all tracks below it
- Apply effects to entire composition
- Cannot be moved independently
- Used for global adjustments

**Color Matte**:
- Solid color background
- Customizable color
- Perfect for backgrounds

**How to use**:
1. Click Elements menu
2. Drag "Adjustment Layer" or "Color Matte" to Video track
3. Select layer to adjust color or effects

---

### SFX Menu (Sound Effects)

**Access**: Click "SFX" in menu bar

**Features**:
- Sound effects library
- Preview playback
- Click to add to audio track

---

### Voice Over Menu

**Access**: Click "Voice Over" in menu bar

**Features**:
- Record voice narration
- Record button interface
- Preview recorded audio
- Add to timeline

---

### AI Voice Menu

**Access**: Click "AI Voice" in menu bar

**Features**:
- AI text-to-speech generation
- Multiple voice options
- Enter text to convert to speech
- Add to audio track

---

### Uploads Menu

**Access**: Click "Uploads" in menu bar

**Features**:
- Upload local media files
- File picker interface
- Accepts video, image, and audio files

**How to use**:
1. Click Uploads menu
2. Click upload button
3. Select files from computer
4. Files appear in project panel

---

## Timeline Tools

Located in the toolbar above the timeline. Organized in two rows of tools.

### Tool Overview

| Tool | Icon | Shortcut | Purpose |
|------|------|----------|---------|
| **Selection** | Mouse Pointer | V | Select and move clips |
| **Track Select Forward** | List | A | Select clips forward |
| **Ripple Edit** | Arrow Left-Right | B | Move clips, auto-close gaps |
| **Razor** | Scissors | C | Split clips at playhead |
| **Pen** | Pen | P | Draw keyframes/masks |
| **Rectangle** | Square | R | Draw rectangle masks |
| **Hand** | Hand | H | Pan timeline view |
| **Text** | Letter T | T | Add text to canvas |

### Selection Tool (V)

**Purpose**: Default tool for selecting and moving clips

**How to use**:
- Click on clip to select it
- Shift+click to multi-select
- Drag clip to move it
- Drag clip edges to trim

---

### Track Select Forward (A)

**Purpose**: Selects all clips from selected point forward

**How to use**:
1. Select a clip
2. Press A or click Track Select tool
3. All clips to the right are selected

---

### Ripple Edit Tool (B)

**Purpose**: Moving clips automatically closes gaps (ripple delete)

**How to use**:
1. Select Ripple Edit tool (B)
2. Move a clip
3. Adjacent clips shift to fill gaps automatically

---

### Razor Tool (C)

**Purpose**: Splits clips at the playhead position

**How to use**:
1. Select clip(s) in timeline
2. Move playhead to split position
3. Press C or click with Razor tool
4. Clip splits at playhead

**Note**: Requires at least one clip selected

---

### Pen Tool (P)

**Purpose**: Draw keyframe Bezier curves and masks

**How to use**:
1. Select Pen tool (P)
2. Draw on clip to create mask path
3. Use keyframes to animate mask

---

### Rectangle Tool (R)

**Purpose**: Draw rectangular masks and shapes

**How to use**:
1. Select Rectangle tool (R)
2. Click and drag on clip
3. Creates rectangular selection

---

### Hand Tool (H)

**Purpose**: Pan/scroll the timeline view

**How to use**:
1. Select Hand tool (H)
2. Click and drag to pan timeline
3. Or hold Space + drag with any tool

---

### Text Tool (T)

**Purpose**: Add text directly to canvas

**How to use**:
1. Select Text tool (T)
2. Click on canvas where you want text
3. New text clip appears at that position
4. Type to enter text content

---

## Timeline Features

### Snap

**Location**: Timeline toolbar (magnet icon)

**Purpose**: Clips snap to each other for precise alignment

**Features**:
- Toggle on/off
- Snap to other clip edges
- Snap to playhead
- Threshold: 100ms sensitivity

**How to use**:
1. Click magnet icon to toggle
2. Drag clips near other clips
3. Clips snap to align edges

---

### Zoom

**Location**: Timeline header

**Purpose**: Zoom in/out of timeline

**How to use**:
- Scroll wheel on timeline
- Zoom slider in header
- +/- buttons

---

### Playhead

**Location**: Vertical line across timeline

**Purpose**: Shows current playback position

**How to use**:
- Click on ruler to seek
- Drag playhead to scrub
- Shows current time in header

---

### Time Ruler

**Location**: Top of timeline

**Features**:
- Time markers
- Click to seek
- Shows current time

---

## Track Management

### Track Types

| Track Type | Prefix | Contains |
|------------|--------|-----------|
| Video | V1, V2, V3... | Video, Image, Adjustment, Color Matte |
| Audio | A1, A2, A3... | Audio files |
| Text | T1, T2, T3... | Text overlays |
| Subtitle | S1, S2, S3... | Captions/Subtitles |

### Track Controls (per track)

**Location**: Track headers on left side of timeline

| Control | Icon | Purpose |
|---------|------|---------|
| **Lock** | Padlock | Prevents editing |
| **Hide** | Eye | Shows/hides in preview |
| **Mute** | Speaker | Mutes audio |
| **Resize** | Drag handle | Adjust track height |

### Adding Tracks

**How to add**:
1. Right-click on track header
2. Select "Add Track"
3. Choose track type and placement
4. Tracks auto-number (V1, V2, V3...)

### Deleting Tracks

**How to delete**:
1. Right-click on track header
2. Select "Delete Track"
3. Confirm deletion
4. Remaining tracks renumber

**Note**: V1 and A1 cannot be deleted (protected)

### Track Type Validation

The editor validates clip types when adding to tracks:

| Clip Type | Valid Tracks |
|-----------|-------------|
| Video | Video tracks only |
| Image | Video tracks only |
| Audio | Audio tracks only |
| Text | Text tracks only |
| Caption | Subtitle tracks only |
| Adjustment | Video tracks only |
| Color Matte | Video tracks only |

---

## Media Rendering

### Video Renderer

**Purpose**: Renders video clips

**Features**:
- HTML5 video playback
- Effect application
- Transform support
- Opacity control

---

### Audio Renderer

**Purpose**: Renders audio clips

**Features**:
- HTML5 audio playback
- Volume control
- Playback rate

---

### Image Renderer

**Purpose**: Renders image clips

**Features**:
- Static image display
- PNG, JPG, WebP, GIF support
- Border radius
- Opacity

---

### Text Renderer

**Purpose**: Renders text with full styling

**Features**:
- Custom font rendering
- Font size, color, alignment
- Background color
- Stroke and shadow effects
- Animation support (in/out/loop)
- Multi-line text with wrapping

---

### Caption Renderer

**Purpose**: Renders subtitle tracks

**Features**:
- Word-by-word highlighting
- Multiple style variants
- Animation support per word
- Sync with video/audio

---

### Shape Renderer

**Purpose**: Renders geometric shapes

---

### Audio Visualizations

**Styles available**:

| Style | Description |
|-------|-------------|
| **Wave** | Standard waveform with vertical bars |
| **Lineal** | Connected line graph |
| **Radial** | Circular pattern from center |
| **Hill** | Smooth curved peaks with gradient |

---

## Video Effects

Over **50 professional effects** organized into categories. Apply via Effects tab in Project Panel or Effects Control Panel.

### Category 1: Adjust Effects

**Extract**
- Isolates brightness range (luma key style)
- Creates matte masks and stylized isolation
- **Controls**: Threshold (0-255), Softness (0-100), Invert toggle

**Levels**
- Adjusts shadows, midtones, highlights
- **Controls**: Input Black, Input White, Gamma, Output Black, Output White

**Lighting Effects**
- Simulates spot or directional lighting
- **Controls**: Intensity (0-300%), Ambient Light (0-100%), Light Type, Light Color

**ProcAmp**
- Professional adjustments (brightness, contrast, saturation, hue)
- **Controls**: Brightness (-100 to 100), Contrast (-100 to 100), Saturation (-100 to 100), Hue Rotate (-180 to 180)

---

### Category 2: Blur and Sharpen Effects

**Camera Blur**
- Realistic lens blur
- **Controls**: Blur Percent (0-100%)

**Directional Blur**
- Motion blur in single direction
- **Controls**: Angle (0-360), Blur Length (0-200px)

**Gaussian Blur**
- Classic smooth blur
- **Controls**: Bluriness (0-100px), Dimensions (Both/Horizontal/Vertical)

**Sharpen**
- Enhances edge definition
- **Controls**: Sharpen Amount (0-100)

**Unsharp Mask**
- Professional sharpening
- **Controls**: Amount (0-500%), Radius (0.1-64px), Threshold (0-255)

**Reduce Interlace Flicker**
- Reduces flicker on interlaced displays
- **Controls**: Softness (0-1)

---

### Category 3: Color Correction Effects

**ASC CDL**
- Industry-standard color grading
- **Controls**: Slope R/G/B, Offset R/G/B, Power/Gamma, Saturation

**Brightness & Contrast**
- Simple tonal adjustments
- **Controls**: Brightness (-100 to 100), Contrast (-100 to 100), Use Legacy toggle

**Color Balance**
- Channel-by-channel color adjustment
- **Controls**: Red Balance, Green Balance, Blue Balance (-100 to 100 each)

**Lumetri Color**
- Full cinematic color grading suite
- **Controls**: Exposure, Contrast, Highlights, Shadows, Whites, Blacks, Temperature, Tint, Saturation, Vibrance, Sharpness, Noise Reduction

**Tint**
- Maps colors between two tones (duotone)
- **Controls**: Map Black To color, Map White To color, Amount (0-100%)

**Video Limiter**
- Keeps values within broadcast-safe ranges
- **Controls**: Max Luma (50-109%), Min Luma (-7 to 7.5%)

---

### Category 4: Distort Effects

**Lens Distortion**
- Barrel or pincushion distortion
- **Controls**: Curvature (-100 to 100), Vertical Offset, Horizontal Offset

**Magnify**
- Zoom into circular region
- **Controls**: Magnification (10-600%), Center X/Y, Size

**Mirror**
- Reflect image for symmetry
- **Controls**: Reflection Angle (0-360 degrees)

**Offset**
- Shifts image with wrap-around
- **Controls**: Shift Horizontal (-2000 to 2000px), Shift Vertical

**Spherize**
- Bulge onto sphere
- **Controls**: Radius (-100 to 100%), Mode (Normal/Horizontal/Vertical)

**Turbulent Displace**
- Organic warping for heatwave/glitch
- **Controls**: Amount (0-500), Size, Offset, Complexity, Evolution

**Twirl**
- Spiral distortion
- **Controls**: Angle (-999 to 999), Radius, Center X/Y

**Wave Warp**
- Wave distortion
- **Controls**: Wave Type (Sine/Square/Triangle/Noise), Height, Width, Direction, Speed, Phase

---

### Category 5: Film Impact Essential FX

**FI: Alpha FX**
- Transparency effect
- **Controls**: Alpha (0-100%), Softness (0-100)

**FI: Blur FX**
- Film Impact blur
- **Controls**: Blur Amount (0-100%), Quality (Draft/Normal/High)

**FI: Vignette FX**
- Cinematic vignette
- **Controls**: Amount (0-100%), Midpoint, Roundness, Feather, Highlights

**FI: Mosaic FX**
- Pixelation/censoring
- **Controls**: Block Width, Block Height, Sharp Colors toggle

**FI: Rounded Crop FX**
- Rounded corners crop
- **Controls**: Corner Radius (0-50%), Edge Feather (0-100)

**FI: Stroke FX**
- Colored outline
- **Controls**: Stroke Size (0-50px), Stroke Color, Opacity

**FI: Long Shadow FX**
- Stylized flat shadow
- **Controls**: Angle (0-360), Length (0-1000px), Shadow Color, Opacity

---

### Category 6: Film Impact Lights & Blurs FX

**FI: RGB Split FX**
- Chromatic aberration
- **Controls**: Amount (0-50px), Angle (0-360)

**FI: Edge Glow FX**
- Neon glow on edges
- **Controls**: Glow Radius (0-100px), Glow Color, Intensity

**FI: Echo Glow FX**
- Multi-layered glow
- **Controls**: Layers (1-8), Glow Size (0-200px), Color, Falloff

**FI: Bokeh Blur FX**
- Photographic bokeh blur
- **Controls**: Amount (0-100%), Shape (Circle/Hexagon/Star), Highlight Boost

**FI: Focus Blur FX**
- Radial blur keeping center sharp
- **Controls**: Amount (0-100%), Focus X/Y, Focus Size

**FI: Glint FX**
- Star-shaped light glint
- **Controls**: Threshold (0-255), Glint Length (0-300px), Rotation, Color

**FI: Light Leaks FX**
- Organic light leak overlays
- **Controls**: Intensity (0-100%), Warmth (-100 to 100), Style (Warm/Cool/Flare)

**FI: Volumetric Rays FX**
- God rays/volumetric light
- **Controls**: Intensity (0-100%), Ray Length (0-1000px), Source X/Y, Ray Color

**FI: Wonder Glow FX**
- Dreamy soft glow
- **Controls**: Glow Amount (0-100%), Glow Radius (0-100px), Tint, Blend Mode

---

### Category 7: Film Impact Motion FX

**FI: Camera Shake FX**
- Handheld/impact camera shake
- **Controls**: Intensity (0-100), Speed (0.5-30), X/Y Amount, Rotation

---

### Category 8: Stylize Effects

**Posterize**
- Reduces tonal levels
- **Controls**: Levels (2-64)

**Sepia**
- Warm vintage brown tone
- **Controls**: Amount (0-100%)

**Glow**
- Soft diffuse glow
- **Controls**: Amount (0-100%), Radius (0-50px)

---

## Transitions

15+ transitions for smooth scene changes.

### Basic Transitions

| Transition | Duration | Purpose |
|------------|----------|---------|
| **None** | 0s | Instant cut |
| **Fade** | 0.5s | Standard fade in/out |
| **Flip** | 0.5s | 3D flip effect |
| **Clock Wipe** | 0.5s | Circular wipe from center |

### Slide Transitions

| Transition | Direction | Description |
|------------|-----------|-------------|
| **Slide Up** | from-bottom | Slides in from bottom |
| **Slide Down** | from-top | Slides in from top |
| **Slide Left** | from-right | Slides in from right |
| **Slide Right** | from-left | Slides in from left |

### Wipe Transitions

| Transition | Direction | Description |
|------------|-----------|-------------|
| **Wipe Up** | from-bottom | Wipes from bottom |
| **Wipe Down** | from-top | Wipes from top |
| **Wipe Left** | from-right | Wipes from right |
| **Wipe Right** | from-left | Wipes from left |

### Shape Transitions

| Transition | Shape | Description |
|------------|-------|-------------|
| **Star** | Star | Star-shaped wipe |
| **Circle** | Circle | Circular wipe |
| **Rectangle** | Rectangle | Rectangle-shaped wipe |

### Applying Transitions

**How to apply**:
1. Click Transitions menu
2. Browse available transitions
3. Drag transition between two clips on timeline
4. Or select two clips and click transition to apply

---

## Text Animations

38 text animation presets for dynamic typography.

### IN Animations (Entry - 9 presets)

| Animation | Effect |
|-----------|--------|
| **animatedTextIn** | Default entry animation |
| **sunnyMorningsAnimationIn** | Cheerful, bright entry |
| **dominoDreamsIn** | Sequential domino fall |
| **greatThinkersAnimationIn** | Sophisticated entry |
| **beautifulQuestionsAnimationIn** | Flowing entry |
| **madeWithLoveAnimationIn** | Warm, romantic entry |
| **realityIsBrokenAnimationIn** | Dramatic glitch style |
| **dropAnimationIn** | Characters drop from above |
| **descompressAnimationIn** | Expansion from center |

### OUT Animations (Exit - 9 presets)

| Animation | Effect |
|-----------|--------|
| **animatedTextOut** | Default exit animation |
| **sunnyMorningsAnimationOut** | Cheerful exit |
| **dominoDreamsAnimationOut** | Sequential domino exit |
| **beautifulQuestionsAnimationOut** | Flowing exit |
| **madeWithLoveAnimationOut** | Warm, romantic exit |
| **realityIsBrokenAnimationOut** | Glitch-style exit |
| **greatThinkersAnimationOut** | Elegant exit |
| **descompressAnimationOut** | Compression exit |
| **dropAnimationOut** | Characters drop out |

### LOOP Animations (Continuous - 6 presets)

| Animation | Effect |
|-----------|--------|
| **vogueAnimationLoop** | Letter-by-letter wave |
| **dragonFlyAnimationLoop** | Floating butterfly motion |
| **billboardAnimationLoop** | Billboard-style animation |
| **heartbeatAnimationLoop** | Pulsing heartbeat |
| **waveAnimationLoop** | Continuous wave motion |
| **shakyLettersTextAnimationLoop** | Shaky/jittery text |
| **pulseAnimationLoop** | Pulsing scale/opacity |

### Applying Text Animations

**How to apply**:
1. Select text clip in timeline
2. Open Effects Control Panel (right side)
3. Find Animations section
4. Choose IN, LOOP, or OUT animation
5. Click to apply

---

## Control Panels

Appears when a clip is selected. Different panels for different media types.

### Video Controls (basic-video.tsx)

**When**: Video clip is selected

**Controls**:

| Control | Type | Range | Purpose |
|---------|------|-------|---------|
| **Crop** | Button | - | Opens crop modal |
| **Aspect Ratio** | Buttons | - | Common ratio presets |
| **Volume** | Slider | 0-100% | Audio volume |
| **Opacity** | Slider | 0-100% | Clip opacity |
| **Speed** | Slider | 0.1x-4x | Playback rate |
| **Rounded Corners** | Slider | 0-50% | Border radius |
| **Animations** | Button | - | Opens animations panel |
| **Outline Width** | Slider | 0-50px | Border width |
| **Outline Color** | Color Picker | - | Border color |
| **Shadow X Offset** | Slider | - | Shadow position |
| **Shadow Y Offset** | Slider | - | Shadow position |
| **Shadow Blur** | Slider | - | Shadow blur |
| **Shadow Color** | Color Picker | - | Shadow color |

---

### Audio Controls (basic-audio.tsx)

**When**: Audio clip is selected

**Controls**:

| Control | Type | Range | Purpose |
|---------|------|-------|---------|
| **Speed** | Slider | 0.5x-2x | Playback rate |
| **Volume** | Slider | 0-100% | Audio volume |

---

### Text Controls (basic-text.tsx)

**When**: Text clip is selected

**Controls**:

| Control | Type | Options | Purpose |
|---------|------|---------|---------|
| **Text Presets** | Dropdown | Various | Quick style templates |
| **Font Family** | Dropdown | All fonts | Choose font |
| **Font Style** | Buttons | Regular/Bold/Italic | Font variant |
| **Font Size** | Slider | 12-200px | Text size |
| **Color** | Color Picker | - | Text color |
| **Background Color** | Color Picker | - | Text background |
| **Align** | Buttons | Left/Center/Right | Text alignment |
| **Decoration** | Buttons | Underline/Strike | Text decoration |
| **Opacity** | Slider | 0-100% | Text opacity |
| **Animations IN** | Dropdown | 9 options | Entry animation |
| **Animations LOOP** | Dropdown | 6 options | Loop animation |
| **Animations OUT** | Dropdown | 9 options | Exit animation |
| **Stroke Width** | Slider | 0-10px | Outline width |
| **Stroke Color** | Color Picker | - | Outline color |
| **Shadow** | Multiple | - | Shadow effects |

---

### Image Controls (basic-image.tsx)

**When**: Image clip is selected

**Controls**:

| Control | Type | Range | Purpose |
|---------|------|-------|---------|
| **Opacity** | Slider | 0-100% | Image opacity |
| **Border Radius** | Slider | 0-50% | Corner rounding |
| **Aspect Ratio** | Buttons | - | Ratio presets |
| **Outline Width** | Slider | 0-50px | Border width |
| **Outline Color** | Color Picker | - | Border color |
| **Shadow** | Multiple | - | Shadow effects |

---

### Caption Controls (basic-caption.tsx)

**When**: Caption/Subtitle clip is selected

**Controls**:

| Control | Type | Options | Purpose |
|---------|------|---------|---------|
| **Caption Preset** | Dropdown | Various | Style presets |
| **Caption Words** | Checkbox | - | Word-level control |
| **Font Family** | Dropdown | - | Choose font |
| **Font Size** | Slider | - | Text size |
| **Appeared Color** | Color Picker | - | Past caption color |
| **Active Color** | Color Picker | - | Current caption color |
| **Active Fill Color** | Color Picker | - | Current background |
| **Keyword Color** | Color Picker | - | Keyword highlight |
| **Animation** | Dropdown | - | Caption animation |
| **Stroke/Shadow** | Multiple | - | Text effects |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Space | Play/Pause |
| Delete | Delete selected |
| Left Arrow | Previous frame |
| Right Arrow | Next frame |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+A | Select all |
| Ctrl+C | Copy |
| Ctrl+V | Paste |
| Ctrl+X | Cut |
| Ctrl+R | Speed/Duration |
| Ctrl+Alt+N | Nest |
| V | Selection tool |
| A | Track select forward |
| B | Ripple edit tool |
| C | Razor tool |
| P | Pen tool |
| R | Rectangle tool |
| H | Hand tool |
| T | Text tool |

---

## Context Menus

### Track Header Context Menu

**Access**: Right-click on track header

**Options**:
- Add Track - Opens Add Tracks modal
- Delete Track - Opens Delete Track modal
- Toggle Video Output - Enable/disable video
- Toggle Audio Output - Enable/disable audio

### Clip Context Menu

**Access**: Right-click on clip

**Editing**:
- Cut (Ctrl+X)
- Copy (Ctrl+C)
- Paste (Ctrl+V)
- Clear (Delete)
- Ripple Delete

**Selection**:
- Enable (toggle active state)
- Link (link clips)
- Group / Ungroup

**Label**:
- 13 color options

**Clip Options**:
- Speed/Duration (Ctrl+R)
- Scale to Frame
- Fit to Frame

**Advanced**:
- Nest (Ctrl+Alt+N)
- Rename

---

## Creating Content

### Creating Adjustment Layer

1. Click Elements menu
2. Drag "Adjustment Layer" to video track
3. Select layer
4. Apply effects in Effects Control Panel
5. Effects affect all tracks below

### Creating Color Matte

1. Click Elements menu
2. Drag "Color Matte" to video track
3. Select matta
4. Choose color in Effects Control Panel
5. Use as background

### Creating Text

**Method 1 - Menu**:
1. Click Texts menu
2. Click "Add Text"
3. Text clip appears in timeline
4. Double-click to edit

**Method 2 - Tool**:
1. Select Text tool (T)
2. Click on canvas
3. Text clip created at position
4. Type to enter content

### Creating Captions

1. Select video or audio clip
2. Click Captions menu
3. Choose source from dropdown
4. Click "Generate Captions"
5. Captions appear below source
6. Edit timing/text in control panel

---

## Workflow Examples

### Basic Editing Workflow

1. **Import Media**: Use Uploads menu to add files
2. **Add to Timeline**: Drag from project to timeline
3. **Arrange**: Use Selection tool to move clips
4. **Trim**: Drag clip edges to adjust duration
5. **Add Transitions**: Drag transitions between clips
6. **Preview**: Press Space to play
7. **Export**: Click export button

### Text Overlay Workflow

1. Click Texts menu
2. Click "Add Text"
3. Select text in timeline
4. Open Effects Control Panel
5. Choose font, size, color
6. Select animation (IN/LOOP/OUT)
7. Position on canvas if needed

### Caption Workflow

1. Add video to timeline
2. Click Captions menu
3. Select video as source
4. Click "Generate Captions"
5. Review generated captions
6. Click individual captions to edit
7. Adjust timing in control panel
8. Choose caption preset/style

---

*Documentation Version: 1.0.0*
*Last Updated: April 2026*