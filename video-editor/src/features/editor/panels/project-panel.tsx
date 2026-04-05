"use client";

/**
 * Project Panel
 * ─────────────
 * Media asset browser with folders, adjustment layers, and color mattes.
 * Single create button with context menu. Right-click context menus on all items.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Video,
  Image,
  Search,
  List,
  Grid3X3,
  Upload,
  Trash2,
  Plus,
  Film,
  FileAudio,
  FolderPlus,
  Layers,
  Palette,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Pencil,
  FolderInput,
  Folder,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUploadStore, addFileToTimeline, UploadedFile, handleFileUpload, ProjectFolder } from "@/store/upload-store";
import { setDragData } from "@/components/shared/drag-data";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_IMAGE, ADD_AUDIO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  video: <Video className="w-3.5 h-3.5 text-blue-400" />,
  image: <Image className="w-3.5 h-3.5 text-green-400" />,
  audio: <FileAudio className="w-3.5 h-3.5 text-purple-400" />,
  adjustment: <Layers className="w-3.5 h-3.5 text-yellow-400" />,
  colormatte: <Palette className="w-3.5 h-3.5" />,
};

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  items: ContextMenuItem[];
}

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, items }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [onClose]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    menu.style.left = `${Math.min(x, maxX)}px`;
    menu.style.top = `${Math.min(y, maxY)}px`;
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-card border border-border rounded-md shadow-xl py-1 min-w-[160px]"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); item.onClick(); onClose(); }}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-white/5 text-left transition-colors",
            item.danger && "text-red-400"
          )}
        >
          {item.icon && <span className="w-3.5 h-3.5 shrink-0">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
};

// ─── Color Picker Modal ───────────────────────────────────────────────────────

interface ColorPickerModalProps {
  onSelect: (color: string) => void;
  onClose: () => void;
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({ onSelect, onClose }) => {
  const [color, setColor] = useState("#3b82f6");
  const pickerRef = useRef<HTMLDivElement>(null);

  const hsl = hexToHSL(color);

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg p-4 w-72 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xs font-semibold text-foreground mb-3">Color Matte</h3>

        <div
          ref={pickerRef}
          className="w-full rounded-md mb-3 cursor-crosshair relative select-none"
          style={{
            height: 180,
            background: `linear-gradient(to bottom, rgba(0,0,0,0) 0%, #000 100%),
              linear-gradient(to right, #fff 0%, hsl(${hsl.h}, 100%, 50%) 100%)`,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            const update = (clientX: number, clientY: number) => {
              const px = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
              const py = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
              const sat = Math.round(px * 100);
              const light = Math.round((1 - py) * 50 + 10);
              setColor(hslToHex(hsl.h, sat, light));
            };
            update(e.clientX, e.clientY);
            const onMove = (ev: MouseEvent) => { ev.preventDefault(); update(ev.clientX, ev.clientY); };
            const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
          }}
        >
          <div
            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${hsl.s}%`,
              top: `${(1 - (hsl.l - 10) / 50) * 100}%`,
            }}
          />
        </div>

        <input
          type="range"
          min="0"
          max="360"
          value={hsl.h}
          onChange={(e) => setColor(hslToHex(Number(e.target.value), hsl.s, hsl.l))}
          className="w-full h-3 rounded-full mb-3 cursor-pointer"
          style={{
            background: "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
            appearance: "none",
          }}
        />

        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-10 h-10 rounded border border-border shrink-0"
            style={{ backgroundColor: color }}
          />
          <Input
            type="text"
            value={color.toUpperCase()}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(v);
            }}
            className="h-8 text-sm font-mono"
            placeholder="#000000"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onSelect(color)}
            className="flex-1 h-8 text-xs bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
          >
            Create
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-8 text-xs bg-white/5 text-muted-foreground rounded hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

function hexToHSL(hex: string) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16) / 255;
    g = parseInt(hex[2] + hex[2], 16) / 255;
    b = parseInt(hex[3] + hex[3], 16) / 255;
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ─── Drag payload builder ─────────────────────────────────────────────────────

function buildDragPayload(file: UploadedFile) {
  const fileTypeForTimeline = file.type === "adjustment" ? "video" : file.type === "colormatte" ? "image" : file.type;
  return JSON.stringify({
    type: "track-item",
    src: file.objectUrl,
    name: file.fileName,
    fileType: fileTypeForTimeline,
    duration: file.duration,
    width: file.width,
    height: file.height,
    color: file.color,
    isAdjustment: file.type === "adjustment",
    isColorMatte: file.type === "colormatte",
    originalType: file.type,
  });
}

// ─── List Item ────────────────────────────────────────────────────────────────

const AssetListItem: React.FC<{
  file: UploadedFile;
  onAdd: (file: UploadedFile) => void;
  onDelete: (id: string) => void;
  onMoveToFolder: (fileId: string, folderId: string | null) => void;
  selected: boolean;
  onSelect: () => void;
  folders: ProjectFolder[];
  onShowFolderPicker: (x: number, y: number, fileId: string) => void;
}> = ({ file, onAdd, onDelete, onMoveToFolder, selected, onSelect, folders, onShowFolderPicker }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    const jsonStr = buildDragPayload(file);
    setDragData(JSON.parse(jsonStr));
    e.dataTransfer.setData("text/plain", jsonStr);
    e.dataTransfer.effectAllowed = "copy";
  }, [file]);

  const handleDragEnd = useCallback(() => {
    setDragData(null);
  }, []);

  const handleDoubleClick = useCallback(() => {
    onAdd(file);
  }, [onAdd, file]);

  return (
    <>
      <div
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 cursor-grab text-xs group transition-colors active:cursor-grabbing",
          selected ? "bg-white/10" : "hover:bg-white/5"
        )}
      >
        <div className="flex-none">
          {file.type === "colormatte" ? (
            <div className="w-3.5 h-3.5 rounded-sm border border-border/50" style={{ backgroundColor: file.color || "#3b82f6" }} />
          ) : (
            TYPE_ICONS[file.type] ?? <Film className="w-3.5 h-3.5" />
          )}
        </div>
        <span className="flex-1 truncate text-foreground">{file.fileName}</span>
        {file.type === "colormatte" && (
          <span className="text-[9px] text-muted-foreground font-mono">{file.color?.toUpperCase()}</span>
        )}
        {file.type !== "colormatte" && file.type !== "adjustment" && (
          <span className="text-muted-foreground shrink-0">{formatFileSize(file.fileSize)}</span>
        )}
        <div className="relative flex-none">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuPos({ x: e.clientX, y: e.clientY }); setShowMenu(true); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {showMenu && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setShowMenu(false)}
          items={[
            { label: "Add to timeline", icon: <Plus className="w-3 h-3" />, onClick: () => onAdd(file) },
            { label: "Move to folder", icon: <FolderInput className="w-3 h-3" />, onClick: () => onShowFolderPicker(menuPos.x, menuPos.y, file.id) },
            ...(file.folderId ? [{ label: "Remove from folder", icon: <Folder className="w-3 h-3" />, onClick: () => onMoveToFolder(file.id, null) }] : []),
            { label: "Remove", icon: <Trash2 className="w-3 h-3" />, danger: true, onClick: () => onDelete(file.id) },
          ]}
        />
      )}
    </>
  );
};

// ─── Grid Item ────────────────────────────────────────────────────────────────

const AssetGridItem: React.FC<{
  file: UploadedFile;
  onAdd: (file: UploadedFile) => void;
  onDelete: (id: string) => void;
  onMoveToFolder: (fileId: string, folderId: string | null) => void;
  selected: boolean;
  onSelect: () => void;
  folders: ProjectFolder[];
  onShowFolderPicker: (x: number, y: number, fileId: string) => void;
}> = ({ file, onAdd, onDelete, onMoveToFolder, selected, onSelect, folders, onShowFolderPicker }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    const jsonStr = buildDragPayload(file);
    setDragData(JSON.parse(jsonStr));
    e.dataTransfer.setData("text/plain", jsonStr);
    e.dataTransfer.effectAllowed = "copy";
  }, [file]);

  const handleDragEnd = useCallback(() => {
    setDragData(null);
  }, []);

  const handleDoubleClick = useCallback(() => {
    onAdd(file);
  }, [onAdd, file]);

  return (
    <>
      <div
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          "rounded-md overflow-hidden cursor-grab group relative border transition-all active:cursor-grabbing",
          selected ? "border-primary ring-1 ring-primary" : "border-border/40 hover:border-border"
        )}
      >
        <div className="aspect-video flex items-center justify-center relative overflow-hidden">
          {file.type === "video" && (
            <video src={file.objectUrl} className="w-full h-full object-cover" muted preload="metadata" />
          )}
          {file.type === "image" && (
            <img src={file.objectUrl} alt={file.fileName} className="w-full h-full object-cover" />
          )}
          {file.type === "audio" && (
            <div className="flex flex-col items-center gap-1 text-purple-400">
              <FileAudio className="w-8 h-8" />
            </div>
          )}
          {file.type === "adjustment" && (
            <div className="w-full h-full bg-transparent border-2 border-dashed border-yellow-400/40 flex items-center justify-center">
              <Layers className="w-8 h-8 text-yellow-400/60" />
            </div>
          )}
          {file.type === "colormatte" && (
            <div className="w-full h-full" style={{ backgroundColor: file.color || "#3b82f6" }} />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(file); }}
              className="bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded font-medium"
            >
              + Add
            </button>
          </div>
          <div className="absolute bottom-1 left-1">
            {file.type === "colormatte" ? (
              <div className="w-4 h-4 rounded-sm border border-white/30" style={{ backgroundColor: file.color }} />
            ) : (
              TYPE_ICONS[file.type]
            )}
          </div>
        </div>
        <div className="px-1.5 py-1 text-[10px] truncate text-muted-foreground bg-card">
          {file.fileName}
        </div>
      </div>

      {showMenu && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setShowMenu(false)}
          items={[
            { label: "Add to timeline", icon: <Plus className="w-3 h-3" />, onClick: () => onAdd(file) },
            { label: "Move to folder", icon: <FolderInput className="w-3 h-3" />, onClick: () => onShowFolderPicker(menuPos.x, menuPos.y, file.id) },
            ...(file.folderId ? [{ label: "Remove from folder", icon: <Folder className="w-3 h-3" />, onClick: () => onMoveToFolder(file.id, null) }] : []),
            { label: "Remove", icon: <Trash2 className="w-3 h-3" />, danger: true, onClick: () => onDelete(file.id) },
          ]}
        />
      )}
    </>
  );
};

// ─── Folder Item ──────────────────────────────────────────────────────────────

const FolderItem: React.FC<{
  folder: ProjectFolder;
  files: UploadedFile[];
  onAdd: (file: UploadedFile) => void;
  onDelete: (id: string) => void;
  onMoveToFolder: (fileId: string, folderId: string | null) => void;
  onRename: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  view: "list" | "grid";
  folders: ProjectFolder[];
  onShowFolderPicker: (x: number, y: number, fileId: string) => void;
}> = ({ folder, files, onAdd, onDelete, onMoveToFolder, onRename, onDeleteFolder, selectedId, onSelect, view, folders, onShowFolderPicker }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  }, []);

  const handleRename = () => {
    if (name.trim()) onRename(folder.id, name.trim());
    setEditing(false);
  };

  return (
    <div className="mb-1">
      <div
        onContextMenu={handleContextMenu}
        className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-xs group hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
        {open ? <FolderOpen className="w-3.5 h-3.5 text-yellow-400" /> : <Folder className="w-3.5 h-3.5 text-yellow-400" />}
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setEditing(false); setName(folder.name); } }}
            className="bg-transparent text-foreground text-xs border-b border-primary outline-none flex-1"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate text-foreground">{folder.name}</span>
        )}
        <span className="text-[9px] text-muted-foreground">{files.length}</span>
      </div>

      {open && (
        <div className="ml-4 border-l border-border/30 pl-1">
          {files.length === 0 ? (
            <div className="px-3 py-2 text-[10px] text-muted-foreground">Empty folder</div>
          ) : view === "list" ? (
            files.map((f) => (
              <AssetListItem
                key={f.id}
                file={f}
                onAdd={onAdd}
                onDelete={onDelete}
                onMoveToFolder={onMoveToFolder}
                selected={selectedId === f.id}
                onSelect={() => onSelect(f.id)}
                folders={folders}
                onShowFolderPicker={onShowFolderPicker}
              />
            ))
          ) : (
            <div className="grid grid-cols-2 gap-2 px-2 pb-2">
              {files.map((f) => (
                <AssetGridItem
                  key={f.id}
                  file={f}
                  onAdd={onAdd}
                  onDelete={onDelete}
                  onMoveToFolder={onMoveToFolder}
                  selected={selectedId === f.id}
                  onSelect={() => onSelect(f.id)}
                  folders={folders}
                  onShowFolderPicker={onShowFolderPicker}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showMenu && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setShowMenu(false)}
          items={[
            { label: "Rename", icon: <Pencil className="w-3 h-3" />, onClick: () => setEditing(true) },
            { label: "Delete folder", icon: <Trash2 className="w-3 h-3" />, danger: true, onClick: () => onDeleteFolder(folder.id) },
          ]}
        />
      )}
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

const ProjectPanel: React.FC = () => {
  const { uploads, folders, removeUpload, removeFolder, renameFolder, addFolder, moveFileToFolder } = useUploadStore();
  const [view, setView] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [folderPicker, setFolderPicker] = useState<{ x: number; y: number; fileId: string } | null>(null);
  const [createMenu, setCreateMenu] = useState<{ x: number; y: number } | null>(null);

  const filtered = uploads.filter((f) =>
    f.fileName.toLowerCase().includes(search.toLowerCase())
  );

  const unfiled = filtered.filter((f) => !f.folderId);
  const videos = unfiled.filter((f) => f.type === "video");
  const images = unfiled.filter((f) => f.type === "image");
  const audios = unfiled.filter((f) => f.type === "audio");
  const adjustments = unfiled.filter((f) => f.type === "adjustment");
  const colorMattes = unfiled.filter((f) => f.type === "colormatte");

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) await handleFileUpload(files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    []
  );

  const handleAddToTimeline = useCallback((file: UploadedFile) => {
    const id = generateId();
    const dur = (file.duration || 5) * 1000;

    if (file.type === "colormatte") {
      dispatch(ADD_IMAGE, {
        payload: {
          id,
          type: "image",
          details: { src: file.objectUrl },
          metadata: { previewUrl: file.objectUrl, duration: dur, color: file.color, isColorMatte: true },
          display: { from: 0, to: dur },
        },
        options: {},
      });
    } else if (file.type === "adjustment") {
      dispatch(ADD_VIDEO, {
        payload: {
          id,
          details: { src: file.objectUrl },
          metadata: { previewUrl: file.objectUrl, duration: dur, isAdjustment: true },
          display: { from: 0, to: dur },
        },
        options: { resourceId: "main", scaleMode: "fit" },
      });
    } else {
      addFileToTimeline(file);
    }
  }, []);

  const handleCreateFolder = useCallback(() => {
    const name = prompt("Folder name:");
    if (name?.trim()) {
      addFolder({ id: generateId(), name: name.trim(), createdAt: Date.now() });
    }
    setCreateMenu(null);
  }, [addFolder]);

  const handleCreateAdjustment = useCallback(() => {
    const dur = 5;
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(255, 255, 255, 0)";
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.strokeRect(20, 20, 1880, 1040);

    const blobUrl = canvas.toDataURL("image/png");
    const id = generateId();
    const count = uploads.filter((u) => u.type === "adjustment").length + 1;
    const upload: UploadedFile = {
      id,
      fileName: `Adjustment Layer ${count}`,
      filePath: `adjustment/${id}`,
      fileSize: 0,
      contentType: "image/png",
      type: "adjustment",
      objectUrl: blobUrl,
      status: "completed",
      progress: 100,
      createdAt: Date.now(),
      duration: dur,
      width: 1920,
      height: 1080,
    };
    useUploadStore.getState().addUpload(upload);
    setCreateMenu(null);
  }, [uploads]);

  const handleCreateColorMatte = useCallback((color: string) => {
    const dur = 5;
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1920, 1080);

    const blobUrl = canvas.toDataURL("image/png");
    const id = generateId();
    const count = uploads.filter((u) => u.type === "colormatte").length + 1;
    const upload: UploadedFile = {
      id,
      fileName: `Color Matte ${count}`,
      filePath: `colormatte/${id}`,
      fileSize: 0,
      contentType: "image/png",
      type: "colormatte",
      objectUrl: blobUrl,
      color,
      status: "completed",
      progress: 100,
      createdAt: Date.now(),
      duration: dur,
      width: 1920,
      height: 1080,
    };
    useUploadStore.getState().addUpload(upload);
    setShowColorPicker(false);
    setCreateMenu(null);
  }, [uploads]);

  const handleShowFolderPicker = useCallback((x: number, y: number, fileId: string) => {
    setFolderPicker({ x, y, fileId });
  }, []);

  const handleMoveToFolder = useCallback((fileId: string, folderId: string | null) => {
    moveFileToFolder(fileId, folderId);
  }, [moveFileToFolder]);

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
                onMoveToFolder={handleMoveToFolder}
                selected={selectedId === f.id}
                onSelect={() => setSelectedId(f.id)}
                folders={folders}
                onShowFolderPicker={handleShowFolderPicker}
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
                onDelete={removeUpload}
                onMoveToFolder={handleMoveToFolder}
                selected={selectedId === f.id}
                onSelect={() => setSelectedId(f.id)}
                folders={folders}
                onShowFolderPicker={handleShowFolderPicker}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <input type="file" ref={fileInputRef} multiple accept="video/*,image/*,audio/*" onChange={handleFileSelect} className="hidden" />

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-border/40">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="h-6 pl-6 text-xs bg-transparent border-border/40"
          />
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
          title="Import media"
        >
          <Upload className="w-3 h-3" />
          Import
        </button>
        <div className="flex rounded overflow-hidden border border-border/40">
          <button onClick={() => setView("list")} className={cn("p-1 transition-colors", view === "list" ? "bg-white/10" : "hover:bg-white/5")} title="List view">
            <List className="w-3 h-3" />
          </button>
          <button onClick={() => setView("grid")} className={cn("p-1 transition-colors", view === "grid" ? "bg-white/10" : "hover:bg-white/5")} title="Grid view">
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
              <button onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline mt-1">
                Click to import
              </button>
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            No assets match &quot;{search}&quot;
          </div>
        ) : (
          <div className="py-1">
            {folders.map((folder) => {
              const folderFiles = filtered.filter((f) => f.folderId === folder.id);
              return (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  files={folderFiles}
                  onAdd={handleAddToTimeline}
                  onDelete={removeUpload}
                  onMoveToFolder={handleMoveToFolder}
                  onRename={renameFolder}
                  onDeleteFolder={removeFolder}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  view={view}
                  folders={folders}
                  onShowFolderPicker={handleShowFolderPicker}
                />
              );
            })}
            {renderGroup("Videos", videos, <Video className="w-3 h-3" />)}
            {renderGroup("Images", images, <Image className="w-3 h-3" />)}
            {renderGroup("Audio", audios, <FileAudio className="w-3 h-3" />)}
            {renderGroup("Adjustment Layers", adjustments, <Layers className="w-3 h-3" />)}
            {renderGroup("Color Mattes", colorMattes, <Palette className="w-3 h-3" />)}
          </div>
        )}
      </div>

      {/* Footer: single create button */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border/40">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCreateMenu({ x: e.clientX, y: e.clientY - 140 });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] bg-primary/20 hover:bg-primary/30 text-primary transition-colors w-full justify-center"
          title="Create new item"
        >
          <Plus className="w-3.5 h-3.5" />
          Create New
        </button>
      </div>

      {/* Create context menu */}
      {createMenu && (
        <ContextMenu
          x={createMenu.x}
          y={createMenu.y}
          onClose={() => setCreateMenu(null)}
          items={[
            { label: "Folder", icon: <FolderPlus className="w-3.5 h-3.5" />, onClick: handleCreateFolder },
            { label: "Adjustment Layer", icon: <Layers className="w-3.5 h-3.5 text-yellow-400" />, onClick: handleCreateAdjustment },
            { label: "Color Matte", icon: <Palette className="w-3.5 h-3.5" />, onClick: () => { setCreateMenu(null); setShowColorPicker(true); } },
          ]}
        />
      )}

      {/* Color picker modal */}
      {showColorPicker && <ColorPickerModal onSelect={handleCreateColorMatte} onClose={() => setShowColorPicker(false)} />}

      {/* Folder picker context menu */}
      {folderPicker && (
        <ContextMenu
          x={folderPicker.x}
          y={folderPicker.y}
          onClose={() => setFolderPicker(null)}
          items={[
            { label: "None (root)", icon: <Folder className="w-3 h-3" />, onClick: () => { moveFileToFolder(folderPicker.fileId, null); setFolderPicker(null); } },
            ...folders.map((f) => ({
              label: f.name,
              icon: <FolderOpen className="w-3 h-3" />,
              onClick: () => { moveFileToFolder(folderPicker.fileId, f.id); setFolderPicker(null); },
            })),
          ]}
        />
      )}
    </div>
  );
};

export default ProjectPanel;
