/**
 * menu-item/images.tsx — ENGINE-FIRST
 *
 * Pexels image inserts route through addFileToTimeline → engine ADD_CLIP.
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import Draggable from "@/components/shared/draggable";
import React, { useState, useEffect } from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, PlusIcon } from "lucide-react";
import { usePexelsImages } from "@/hooks/use-pexels-images";
import { ImageLoading } from "@/components/ui/image-loading";
import { addFileToTimeline } from "@/store/upload-store";
import { nanoid } from "nanoid";

interface IImage {
  id?: string;
  type?: string;
  name?: string;
  preview?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export const Images = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    images: pexelsImages,
    loading: pexelsLoading,
    currentPage,
    hasNextPage,
    searchImages,
    loadCuratedImages,
    searchImagesAppend,
    loadCuratedImagesAppend,
  } = usePexelsImages();

  useEffect(() => {
    loadCuratedImages();
  }, [loadCuratedImages]);

  const handleAddImage = (payload: Partial<IImage>) => {
    const src = payload.details?.src as string | undefined;
    if (!src) return;
    addFileToTimeline({
      id: payload.id || nanoid(),
      fileName: payload.name || "Image",
      filePath: src,
      fileSize: 0,
      contentType: "image/jpeg",
      type: "image",
      objectUrl: src,
      status: "completed",
      progress: 100,
      createdAt: Date.now(),
      duration: 5,
      width: (payload.metadata?.width as number) ?? 1920,
      height: (payload.metadata?.height as number) ?? 1080,
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { await loadCuratedImages(); return; }
    try { await searchImages(searchQuery); } finally {}
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleLoadMore = async () => {
    if (!searchQuery.trim()) await loadCuratedImagesAppend();
    else await searchImagesAppend(searchQuery);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 py-2">
        <div className="flex gap-2">
          <Input
            placeholder="Search images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="h-8 text-xs"
          />
          <Button onClick={handleSearch} size="sm" variant="secondary" className="h-8 px-2">
            <Search className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-2 p-4 pt-2">
          {pexelsLoading && pexelsImages.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-video rounded-md bg-muted animate-pulse" />
              ))
            : pexelsImages.map((image: any) => (
                <Draggable
                  key={image.id}
                  data={{
                    id: String(image.id),
                    type: "image",
                    details: { src: image.src?.medium || image.src?.original },
                    metadata: { width: image.width, height: image.height, previewUrl: image.src?.small },
                  }}
                  shouldDisplayPreview={!isDraggingOverTimeline}
                  renderCustomPreview={
                    <div className="w-40 h-24 rounded overflow-hidden bg-black">
                      <img src={image.src?.small} alt={image.alt || "image"} className="w-full h-full object-cover" />
                    </div>
                  }
                >
                  <div
                    className="group relative aspect-video cursor-pointer overflow-hidden rounded-md bg-muted"
                    onClick={() => handleAddImage({
                      id: String(image.id),
                      type: "image",
                      name: image.alt || "Image",
                      details: { src: image.src?.medium || image.src?.original },
                      metadata: { width: image.width, height: image.height },
                    })}
                  >
                    <ImageLoading
                      src={image.src?.small}
                      alt={image.alt || "image"}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <PlusIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </Draggable>
              ))}
        </div>
        {hasNextPage && (
          <div className="flex justify-center p-4">
            <Button onClick={handleLoadMore} variant="secondary" size="sm" disabled={pexelsLoading}>
              {pexelsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
