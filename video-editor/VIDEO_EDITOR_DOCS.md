# Video Editor GUI Documentation

## Overview

A browser-based video editor built with React, TypeScript, and Remotion. The editor allows users to create and edit videos with text, images, videos, audio, and captions.

---

## Page Structure

### URL Routes
| Route | Description |
|-------|-------------|
| `/` | Main editor page |
| `/edit` | Editor page (same as `/`) |
| `/edit/[...id]` | Editor with project ID |

---

## Main Components

### 1. Navbar (Top Bar)
**File:** `src/features/editor/navbar.tsx`

**Location:** Top of the editor

**Elements:**
- **Logo** - Editor logo (left side)
- **Undo Button** - Revert last action (Ctrl+Z)
- **Redo Button** - Redo action (Ctrl+Shift+Z)
- **Project Title** - Editable project name
- **Keyboard Shortcuts** - Opens shortcuts modal
- **Theme Toggle** - Light/Dark mode switch
- **Download Button** - Export video

**Keyboard Shortcuts Modal** - Shows all available shortcuts

---

### 2. Sidebar (Left Panel)
**File:** `src/features/editor/menu-list.tsx`

**Width:** 320px (large screens) / Full width (mobile)

**Menu Items:**

| Icon | Label | Description |
|------|-------|-------------|
| Upload | Uploads | Upload local media files |
| Text/T | Texts | Add text elements |
| Video | Videos | Browse/search stock videos |
| Captions | Captions | Auto-generate captions |
| Image | Images | Browse/search stock images |
| Audio | Audio | Browse/search music |
| Transitions | Transitions | Add transition effects |
| AI Voice | AI Voice | Generate AI voiceover |
| SFX | SFX | Generate sound effects |

---

### 3. Uploads Panel
**File:** `src/components/uploads/uploads.tsx`

**Features:**
- **Upload Media Button** - Opens file picker
- **File Selection** - Supports video/*, image/*, audio/*
- **Upload Modal** - Shows selected files with size
- **Preview Generation** - Auto-generates thumbnails for videos
- **Grid Display** - Shows uploads by type (Videos/Images/Audio)
- **Add to Timeline** - Click any upload to add to editor

**States:**
- Empty state with upload prompt
- Loading state during upload
- Grid view of uploaded files

---

### 4. Scene/Preview Area (Center)
**File:** `src/features/editor/scene/scene.tsx`

**Features:**
- **Video Preview** - Shows current video frame
- **Canvas Size:** 1080x1920 (default, adjustable)
- **Zoom Controls** - Zoom in/out on preview
- **Interactive Elements** - Drag, resize, edit elements directly
- **Background** - Video preview with shadow frame

**Interactions:**
- Click element to select
- Drag to reposition
- Resize handles on corners
- Double-click text to edit

---

### 5. Control Panel (Right Side)
**File:** `src/features/editor/control-item/control-item.tsx`

**Width:** 320px (large screens only)

**Appears when:** An element is selected on the canvas

**Panels by Element Type:**

#### Text Controls
- Text content editor
- Font family picker
- Font size slider
- Font weight
- Text alignment
- Line height
- Letter spacing
- Text color picker
- Background color
- Opacity slider
- Animations (in/out)

#### Image Controls
- Opacity slider
- Blur slider
- Brightness slider
- Flip horizontal/vertical
- Border controls
- Shadow controls
- Position X/Y
- Size width/height

#### Video Controls
- Opacity slider
- Volume slider
- Playback speed
- Trim start/end
- Border controls
- Shadow controls
- Position X/Y
- Size width/height

#### Audio Controls
- Volume slider
- Playback speed
- Trim start/end

#### Caption Controls
- Caption text display
- Word timing display
- Caption preset picker (48 presets)
- Font family
- Font size
- Colors (appeared, active, background)
- Position
- Text alignment
- Animations

---

### 6. Timeline (Bottom)
**File:** `src/features/editor/timeline/timeline.tsx`

**Features:**
- **Timeline Ruler** - Shows time markers
- **Playhead** - Current position indicator
- **Track Items** - Visual representation of elements
- **Zoom Controls** - Adjust timeline scale
- **Play/Pause** - Control video playback
- **Time Display** - Current time / Total duration

**Tracks:**
| Track | Content |
|-------|---------|
| Video | Video and image elements |
| Audio | Audio, voiceover, SFX |
| Caption | Caption elements |

**Interactions:**
- Click to seek
- Drag elements to reposition
- Drag edges to trim
- Multi-select with Shift+click

---

## Menu Items Detail

### Texts Panel
- Add text button
- Drag-and-drop to timeline
- Click to add directly

### Videos Panel
- Search bar for stock videos
- Pexels API integration
- Grid display of results
- Add to timeline functionality

### Captions Panel
- Auto-generate captions from video audio
- Speech-to-text transcription
- Manual caption editing
- Caption presets selection
- Font customization

### Images Panel
- Search bar for stock images
- Pexels API integration
- Grid display
- Add to timeline

### Audio Panel
- Music library browser
- Search functionality
- Audio preview
- Add to timeline

### Transitions Panel
- Transition effects library
- Preview animations
- Drag to apply between clips

### AI Voice Panel
- Text-to-speech generation
- Voice selection
- Language selection
- Preview and generate

### SFX Panel
- Sound effects search
- Generate from text prompt
- Preview and add

---

## Editor States

### Empty State
- Prompt to upload or add elements
- Instructions text

### Loading State
- Loading indicators
- Progress bars for uploads

### Editing State
- Selected element highlighted
- Control panel visible
- Timeline active

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Space | Play/Pause |
| Delete | Delete selected element |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+C | Copy element |
| Ctrl+V | Paste element |
| Ctrl+D | Duplicate element |
| Ctrl+A | Select all |
| Escape | Deselect |

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| Next.js | Framework |
| React | UI Library |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Remotion | Video rendering |
| Zustand | State management |
| TanStack Query | Data fetching |
| @designcombo/* | Core editor engine |

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── edit/
│       └── page.tsx       # Editor page
├── components/
│   ├── ui/                 # Shadcn UI components
│   ├── uploads/            # Upload component
│   └── shared/             # Icons, logos
├── features/
│   └── editor/
│       ├── navbar.tsx      # Top navigation
│       ├── menu-list.tsx   # Sidebar menu
│       ├── menu-item/      # Menu panels
│       │   ├── uploads.tsx
│       │   ├── texts.tsx
│       │   ├── videos.tsx
│       │   ├── captions.tsx
│       │   ├── images.tsx
│       │   ├── audios.tsx
│       │   ├── transitions.tsx
│       │   ├── ai-voice.tsx
│       │   └── sfx.tsx
│       ├── scene/          # Preview area
│       ├── timeline/       # Timeline
│       ├── player/        # Video player
│       ├── control-item/  # Property panels
│       └── store/         # State management
├── hooks/                  # Custom hooks
├── lib/                    # Utilities
└── store/                 # Global stores
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pexels` | GET | Search Pexels images |
| `/api/pexels-videos` | GET | Search Pexels videos |
| `/api/transcribe` | POST | Transcribe audio to text |
| `/api/render` | POST | Start video render |
| `/api/render/[id]` | GET | Check render status |
| `/api/uploads/presign` | POST | Get upload URLs |
| `/api/uploads/url` | POST | Download from URL |
| `/api/voices` | GET | Get AI voices list |

---

## State Management

### Editor Store (`useStore`)
- Current design/project data
- Timeline state
- Selected elements
- Playback state

### Layout Store (`useLayoutStore`)
- Sidebar visibility
- Active menu item
- Modal states

### Upload Store (`useUploadStore`)
- Uploaded files list
- Upload progress
- Upload modal state

---

## How to Run

```bash
cd video-editor
npm install
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

Create `.env.local`:

```env
PEXELS_API_KEY=your_pexels_api_key
```
