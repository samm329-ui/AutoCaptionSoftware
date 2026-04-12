/**
 * menu-item/videos.tsx — ENGINE-FIRST
 *
 * Pexels video insert creates an UploadedFile and routes through
 * addFileToTimeline → engine ADD_CLIP. No event-bus dispatch.
 */

import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useState, useEffect } from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, PlusIcon } from "lucide-react";
import { usePexelsVideos } from "@/hooks/use-pexels-videos";
import { ImageLoading } from "@/components/ui/image-loading";
import { addFileToTimeline } from "@/store/upload-store";
import { nanoid } from "nanoid";

interface IVideo {
  id?: string;
  type?: string;
  name?: string;
  preview?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export const Videos = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    videos: pexelsVideos,
    loading: pexelsLoading,
    error: pexelsError,
    currentPage,
    hasNextPage,
    searchVideos,
    loadPopularVideos,
    searchVideosAppend,
    loadPopularVideosAppend,
    clearVideos,
  } = usePexelsVideos();

  useEffect(() => {
    loadPopularVideos();
  }, [loadPopularVideos]);

  const handleAddVideo = (payload: Partial<IVideo>) => {
    const src = payload.details?.src as string | undefined;
    if (!src) return;
    addFileToTimeline({
      id: payload.id || nanoid(),
      fileName: payload.name || "Video",
      filePath: src,
      fileSize: 0,
      contentType: "video/mp4",
      type: "video",
      objectUrl: src,
      status: "completed",
      progress: 100,
      createdAt: Date.now(),
      duration: (payload.metadata?.duration as number) ?? 5,
      width: (payload.metadata?.width as number) ?? 1920,
      height: (payload.metadata?.height as number) ?? 1080,
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { await loadPopularVideos(); return; }
    try { await searchVideos(searchQuery); } finally {}
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleLoadMore = async () => {
    if (!searchQuery.trim()) await loadPopularVideosAppend();
    else await searchVideosAppend(searchQuery);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 py-2">
        <div className="flex gap-2">
          <Input
            placeholder="Search videos..."
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
          {pexelsLoading && pexelsVideos.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-video rounded-md bg-muted animate-pulse" />
              ))
            : pexelsVideos.map((video: any) => (
                <Draggable
                  key={video.id}
                  data={{
                    id: String(video.id),
                    type: "video",
                    details: { src: video.video_files?.[0]?.link },
                    metadata: { duration: video.duration, width: video.width, height: video.height, previewUrl: video.image },
                  }}
                  shouldDisplayPreview={!isDraggingOverTimeline}
                  renderCustomPreview={
                    <div className="w-40 h-24 rounded overflow-hidden bg-black">
                      <img src={video.image} alt={video.user?.name || "video"} className="w-full h-full object-cover opacity-80" />
                    </div>
                  }
                >
                  <div
                    className="group relative aspect-video cursor-pointer overflow-hidden rounded-md bg-muted"
                    onClick={() => handleAddVideo({
                      id: String(video.id),
                      type: "video",
                      name: video.user?.name || "Video",
                      details: { src: video.video_files?.[0]?.link },
                      metadata: { duration: video.duration, width: video.width, height: video.height, previewUrl: video.image },
                    })}
                  >
                    <ImageLoading
                      src={video.image}
                      alt={video.user?.name || "video"}
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
