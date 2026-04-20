# Video Editor

A professional browser-based video editor built with Next.js, React, and Remotion.

## Features

- **Timeline Editing**: Multi-track timeline with drag-and-drop, clip trimming, and snapping
- **Engine-First Architecture**: State management using custom engine with commands/reducers
- **Panel Layout**: Resizable panels for source control, preview, timeline, and effects
- **Multi-Track Support**: Separate tracks for Video, Audio, Text, and Subtitle content
- **Media Management**: Upload and manage video, image, and audio files
- **Real-time Preview**: Live video preview with Remotion

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
- **Tailwind CSS** - Styling
- **Remotion** - Video rendering
- **Engine** - Custom state management (engine-first architecture)

## Architecture

### Engine Core

The editor uses a custom engine-first architecture:

```
engine/
├── engine-core.ts    # State management and reducer
├── commands.ts       # Command builders
├── selectors.ts     # State selection functions
└── engine-provider.tsx # React context provider
```

### Track Groups

- **Video** (V1, V2...): Video and image tracks
- **Audio** (A1, A2...): Audio tracks
- **Text** (T1, T2...): Text overlay tracks
- **Subtitle** (S1, S2...): Caption/subtitle tracks

### Timeline Components

- `timeline.tsx` - Main timeline with track lanes and clips
- `header.tsx` - Timeline controls (play/pause, zoom)
- `track-headers.tsx` - Track labels and controls
- `playhead.tsx` - Playhead indicator

## Project Structure

```
src/
├── app/                 # Next.js app router
├── components/          # Shared UI components
├── features/editor/
│   ├── engine/         # Engine state management
│   ├── timeline/       # Timeline components
│   ├── panels/         # Editor panels
│   ├── player/         # Video player
│   └── scene/          # Preview area
├── store/              # Upload store
└── lib/                # Utilities
```

## Keyboard Shortcuts

| Shortcut | Action |
|---------|--------|
| Space | Play/Pause |
| Delete | Delete selected |
| Left/Right Arrow | Previous/Next frame |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |