"use client";

/**
 * Project Panel
 * ─────────────
 * Media asset browser: shows all uploaded files organized into bins (folders).
 * Supports list and grid views, search, and drag-to-timeline.
 * Works with the existing useUploadStore.
 */

import React, { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Video,
  Image,
  Music,
  Folder,
  FolderOpen,
  Search,
  List,
  Grid3X3,
  Upload,
  MoreVertical,
  Trash2,
  Plus,
  ChevronRight,
  ChevronDown,
  Film,
  FileAudio,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUploadStore, addFileToTimeline, UploadedFile } from "@/store/upload-store";

// ─── Bin ──────────────────────────────────────────────────────────────────────

interface Bin {
  id: string;
  name: string;
  fileIds: string[];
  open: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  video: <Video className="w-3.5 h-3.5 text-blue-400" />,
  image: <Image className="w-3.5 h-3.5 text-green-400" />,
  audio: <FileAudio className="w-3.5 h-3.5 text-purple-400" />,
};

// ─── List Item ────────────────────────────────────────────────────────────────

const AssetListItem: React.FC<{
  file: UploadedFile;
  onAdd: (file: UploadedFile) => void;
  onDelete: (id: string) => void;
  selected: boolean;
  onSelect: () => void;
}> = ({ file, onAdd, onDelete, selected, onSelect }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onClick={onSelect}
      onDoubleClick={() => onAdd(file)}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs group transition-colors",
        selected ? "bg-white/10" : "hover:bg-white/5"
      )}
    >
      <div className="flex-none">{TYPE_ICONS[file.type] ?? <Film className="w-3.5 h-3.5" />}</div>
      <span className="flex-1 truncate text-foreground">{file.fileName}</span>
      <span className="text-muted-foreground shrink-0">{formatFileSize(file.fileSize)}</span>
      <div className="relative flex-none">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition"
        >
          <MoreVertical className="w-3 h-3" />
        </button>
        {showMenu && (
          <div
            className="absolute right-0 top-5 z-50 bg-card border border-border rounded-md shadow-xl py-1 w-36"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { onAdd(file); setShowMenu(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-white/5 text-left"
            >
              <Plus className="w-3 h-3" /> Add to timeline
            </button>
            <button
              onClick={() => { onDelete(file.id); setShowMenu(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-white/5 text-left text-red-400"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Grid Item ────────────────────────────────────────────────────────────────

const AssetGridItem: React.FC<{
  file: UploadedFile;
  onAdd: (file: UploadedFile) => void;
  selected: boolean;
  onSelect: () => void;
}> = ({ file, onAdd, selected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={() => onAdd(file)}
      className={cn(
        "rounded-md overflow-hidden cursor-pointer group relative border transition-all",
        selected ? "border-primary ring-1 ring-primary" : "border-border/40 hover:border-border"
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
        {file.type === "video" && (
          <video
            src={file.objectUrl}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        )}
        {file.type === "image" && (
          <img src={file.objectUrl} alt={file.fileName} className="w-full h-full object-cover" />
        )}
        {file.type === "audio" && (
          <div className="flex flex-col items-center gap-1 text-purple-400">
            <FileAudio className="w-8 h-8" />
          </div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(file); }}
            className="bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded font-medium"
          >
            + Add
          </button>
        </div>
        {/* Type badge */}
        <div className="absolute bottom-1 left-1">
          {TYPE_ICONS[file.type]}
        </div>
      </div>
      {/* Name */}
      <div className="px-1.5 py-1 text-[10px] truncate text-muted-foreground bg-card">
        {file.fileName}
      </div>
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

const ProjectPanel: React.FC = () => {
  const { uploads, addUpload, removeUpload } = useUploadStore();
  const [view, setView] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bins, setBins] = useState<Bin[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter by search
  const filtered = uploads.filter((f) =>
    f.fileName.toLowerCase().includes(search.toLowerCase())
  );

  const videos = filtered.filter((f) => f.type === "video");
  const images = filtered.filter((f) => f.type === "image");
  const audios = filtered.filter((f) => f.type === "audio");

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      for (const file of Array.from(e.target.files)) {
        const id = crypto.randomUUID();
        const objectUrl = URL.createObjectURL(file);
        let type: "video" | "image" | "audio" = "video";
        if (file.type.startsWith("image/")) type = "image";
        else if (file.type.startsWith("audio/")) type = "audio";
        addUpload({
          id, fileName: file.name, filePath: `local/${file.name}`,
          fileSize: file.size, contentType: file.type, type, objectUrl,
          status: "completed", progress: 100, createdAt: Date.now(),
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addUpload]
  );

  const handleAddToTimeline = useCallback((file: UploadedFile) => {
    addFileToTimeline(file);
  }, []);

  const renderGroup = (label: string, items: UploadedFile[], icon: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-1">
        <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {icon}
          {label} ({items.length})
        </div>
        {view === "list" ? (
          <div>
            {items.map((f) => (
              <AssetListItem
                key={f.id}
                file={f}
                onAdd={handleAddToTimeline}
                onDelete={removeUpload}
                selected={selectedId === f.id}
                onSelect={() => setSelectedId(f.id)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 px-3 pb-2">
            {items.map((f) => (
              <AssetGridItem
                key={f.id}
                file={f}
                onAdd={handleAddToTimeline}
                selected={selectedId === f.id}
                onSelect={() => setSelectedId(f.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="video/*,image/*,audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-border/40">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="h-6 pl-6 text-xs bg-transparent border-border/40"
          />
        </div>

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
          title="Import media"
        >
          <Upload className="w-3 h-3" />
          Import
        </button>

        {/* View toggle */}
        <div className="flex rounded overflow-hidden border border-border/40">
          <button
            onClick={() => setView("list")}
            className={cn(
              "p-1 transition-colors",
              view === "list" ? "bg-white/10" : "hover:bg-white/5"
            )}
            title="List view"
          >
            <List className="w-3 h-3" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={cn(
              "p-1 transition-colors",
              view === "grid" ? "bg-white/10" : "hover:bg-white/5"
            )}
            title="Grid view"
          >
            <Grid3X3 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Asset list */}
      <div className="flex-1 overflow-y-auto">
        {uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground px-4">
            <Upload className="w-8 h-8 opacity-30" />
            <p className="text-xs text-center">
              Import videos, images, and audio to get started.
              <br />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-primary hover:underline mt-1"
              >
                Click to import
              </button>
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            No assets match "{search}"
          </div>
        ) : (
          <div className="py-1">
            {renderGroup("Videos", videos, <Video className="w-3 h-3" />)}
            {renderGroup("Images", images, <Image className="w-3 h-3" />)}
            {renderGroup("Audio", audios, <FileAudio className="w-3 h-3" />)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border/40 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {uploads.length} asset{uploads.length !== 1 ? "s" : ""}
        </span>
        {selectedId && (
          <button
            onClick={() => {
              const f = uploads.find((u) => u.id === selectedId);
              if (f) handleAddToTimeline(f);
            }}
            className="text-[10px] text-primary hover:underline"
          >
            + Add to timeline
          </button>
        )}
      </div>
    </div>
  );
};

export default ProjectPanel;
