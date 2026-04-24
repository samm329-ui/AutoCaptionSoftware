# Video Editor

A professional browser-based video editor built with Next.js, React, and Remotion.

## Features

- **Timeline Editing**: Multi-track timeline with drag-and-drop, clip trimming, and snapping
- **Vertical Track Switching**: Drag clips vertically between tracks to move them to different tracks
- **Visual Track Boundaries**: Clear visual separators between track groups (Video, Audio, Text, Subtitle)
- **Engine-First Architecture**: State management using custom engine with commands/reducers
- **Panel Layout**: Resizable panels for source control, preview, timeline, and effects
- **Multi-Track Support**: Separate tracks for Video, Audio, Text, and Subtitle content
- **Media Management**: Upload and manage video, image, and audio files
- **Real-time Preview**: Live video preview with Remotion
- **Caption/Subtitle Support**: Add captions with customizable styles and animations
- **Audio Visualization**: Various audio bar styles (wave, hill, radial, lineal)
- **Text Animations**: In, loop, and out text animations
- **Video Effects**: Brightness, blur, opacity, and more
- **Transitions**: Video transitions between clips

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
pnpm dev
```

Open your browser and visit http://localhost:3000

### Build

```bash
pnpm build
pnpm start
```

## Tech Stack

- **Next.js 16** - Framework
- **React 19** - UI Library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Remotion 4** - Video rendering
- **Engine** - Custom state management (engine-first architecture)
- **Radix UI** - Accessible UI components
- **Framer Motion** - Animations
- **Lucide React** - Icons

## Architecture

### Engine Core

The editor uses a custom engine-first architecture:

```
engine/
├── engine-core.ts        # State management and reducer
├── commands.ts         # Command builders
├── selectors.ts        # State selection functions
├── engine-provider.tsx  # React context provider
├── snap-engine.ts       # Snap-to-grid functionality
└── trim-engine.ts      # Clip trimming logic
```

### Track Groups

- **Video** (V1, V2, V3...): Video and image clips
- **Audio** (A1, A2, A3...): Audio tracks
- **Text** (T1, T2, T3...): Text overlay tracks
- **Subtitle** (S1, S2, S3...): Caption/subtitle tracks

### Timeline Components

- `timeline.tsx` - Main timeline with track lanes, clips, and playhead
- `header.tsx` - Timeline controls (play/pause, zoom)
- `track-headers.tsx` - Track labels and controls (lock, mute, hide)
- `playhead.tsx` - Playhead indicator
- `ruler.tsx` - Time ruler with markers
- `vertical-scrollbar.tsx` - Vertical scroll management
- `decibel-meter.tsx` - Audio level visualization

### Player Components

- `player.tsx` - Main video player using Remotion
- `composition.tsx` - Player composition
- `sequence-item.tsx` - Individual sequence rendering
- `items/` - Media item renderers (video, audio, image, text, caption)

### Control Panels

- `control-list.tsx` - Control panel list
- `control-item/` - Individual controls
  - `basic-video.tsx` - Video controls
  - `basic-audio.tsx` - Audio controls
  - `basic-text.tsx` - Text controls
  - `basic-caption.tsx` - Caption controls
  - `common/` - Shared controls (opacity, volume, speed, etc.)
  - `keyframes/` - Keyframe editing
  - `floating-controls/` - Floating control panels

### Menu Items

- `menu-item/` - Media menu items
  - `videos.tsx` - Video uploads
  - `audios.tsx` - Audio/music uploads
  - `images.tsx` - Image uploads
  - `texts.tsx` - Text overlays
  - `captions.tsx` - Captions/subtitles
  - `transitions.tsx` - Video transitions

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   └── edit/             # Editor page
├── components/            # Shared UI components
│   ├── ui/              # Radix-based UI components
│   └── color-picker/     # Color picker component
├── features/editor/
│   ├── engine/           # Engine state management
│   ├── timeline/         # Timeline components
│   ├── player/          # Video player
│   ├── panels/          # Editor panels
│   ├── scene/           # Preview area
│   ├── control-item/     # Property controls
│   ├── menu-item/       # Media menu items
│   ├── hooks/          # Custom React hooks
│   ├── player/         # Player components
│   │   └── items/     # Media item renderers
│   │   └── animated/  # Text animations
│   └── utils/          # Utility functions
├── store/               # Upload store
├── lib/                 # Utilities
└── hooks/              # Shared hooks
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Space | Play/Pause |
| Delete | Delete selected clip |
| Left Arrow | Previous frame |
| Right Arrow | Next frame |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+A | Select all |
| Ctrl+C | Copy |
| Ctrl+V | Paste |

## Tools

The timeline supports multiple editing tools:

- **Select** - Select and move clips
- **Ripple Edit** - Trim clips with ripple
- **Razor** - Split clips
- **Hand** - Pan timeline
- **Text** - Add text

## Supported Media

- **Video**: MP4, WebM, MOV
- **Audio**: MP3, WAV, AAC
- **Images**: PNG, JPG, WebP, GIF
- **Fonts**: Custom font uploads

## Track Features

- **Lock/Unlock** - Prevent accidental edits
- **Mute/Unmute** - Toggle audio
- **Hide/Show** - Toggle visibility
- **Resize** - Adjust track height

## License

Private - All rights reserved