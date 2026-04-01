# FYAP Pro upgrade guide

Replace these files with the versions in this package:

- `ai-server/main.py`
- `frontend/src/app/page.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/types.ts`
- `frontend/src/app/layout.tsx`

What changed:

- Added project-first backend endpoints.
- Kept the caption engine, segmentation, timeline model, preview renderer, and ASS renderer intact.
- Added project creation, media import, caption generation, timeline editing, caption update, split/merge/delete, preview, and export routes.
- Rebuilt the frontend as a Premiere-style editing workspace with source, preview, media bin, timeline, caption, animation, and export panels.

How to run:

1. Start the FastAPI server from `ai-server/`.
2. Start the Next.js app from `frontend/`.
3. Set `NEXT_PUBLIC_AI_SERVER_URL` if the API is not on `http://localhost:8000`.

Notes:

- The caption engine is unchanged.
- The project page is now the starting point.
- Existing `/upload`, `/render`, `/download`, `/themes`, and `/styles` compatibility endpoints are preserved.
