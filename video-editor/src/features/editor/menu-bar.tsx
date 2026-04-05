"use client";

/**
 * Premiere Pro-style Menu Bar
 * ───────────────────────────
 * File · Edit · Clip · Sequence · Markers · Graphics & Titles · View · Window · Help
 * Each menu shows all features; unavailable ones are greyed out with tooltip.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface MenuItem {
  label?: string;
  shortcut?: string;
  disabled?: boolean;
  tooltip?: string;
  onClick?: () => void;
  submenu?: MenuItem[];
  separator?: boolean;
}

interface MenuDropdownProps {
  label: string;
  items: MenuItem[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const MenuDropdown: React.FC<MenuDropdownProps> = ({ label, items, isOpen, onToggle, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        onMouseEnter={() => isOpen || onToggle()}
        className={cn(
          "px-2.5 py-1 text-[11px] rounded-sm transition-colors select-none",
          isOpen ? "bg-white/15 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
        )}
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-[9999] mt-0.5 min-w-[240px] bg-card border border-border rounded-md shadow-2xl py-1 animate-in fade-in duration-100">
          {items.map((item, i) => (
            <div key={i}>
              {item.separator && <div className="my-1 border-t border-border/40" />}
              <MenuItemRow item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MenuItemRow: React.FC<{ item: MenuItem }> = ({ item }) => {
  const [subOpen, setSubOpen] = useState(false);
  const hasSub = item.submenu && item.submenu.length > 0;
  const ref = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(() => {
    if (!item.disabled && item.onClick) item.onClick();
  }, [item]);

  if (item.disabled) {
    return (
      <div
        className="flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground/40 cursor-not-allowed select-none"
        title={item.tooltip || "Currently not available"}
      >
        <span>{item.label}</span>
        {item.shortcut && <span className="text-[10px] ml-8 font-mono">{item.shortcut}</span>}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer select-none transition-colors",
        subOpen ? "bg-primary text-primary-foreground" : "hover:bg-white/5"
      )}
      onClick={handleClick}
      onMouseEnter={() => hasSub && setSubOpen(true)}
      onMouseLeave={() => setSubOpen(false)}
    >
      <span>{item.label}</span>
      <div className="flex items-center gap-3">
        {item.shortcut && <span className="text-[10px] font-mono opacity-60">{item.shortcut}</span>}
        {hasSub && (
          <>
            <ChevronRight className="w-3 h-3 opacity-60" />
            {subOpen && (
              <div className="absolute left-full top-0 z-[10000] min-w-[220px] bg-card border border-border rounded-md shadow-2xl py-1 animate-in fade-in duration-100">
                {item.submenu!.map((sub, j) => (
                  <div key={j}>
                    {sub.separator && <div className="my-1 border-t border-border/40" />}
                    <MenuItemRow item={sub} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Menu Definitions ─────────────────────────────────────────────────────────

const na = "Currently not available";

function useMenuActions() {
  return {};
}

export function getMenuItems(): Record<string, MenuItem[]> {
  return {
    File: [
      { label: "New", submenu: [
        { label: "Project…", disabled: true, tooltip: na },
        { label: "Production…", disabled: true, tooltip: na },
        { label: "Team Project…", disabled: true, tooltip: na },
        { label: "Sequence…", disabled: true, tooltip: na },
      ]},
      { separator: true },
      { label: "Open Project…", shortcut: "Ctrl+O", disabled: true, tooltip: na },
      { label: "Open Production…", disabled: true, tooltip: na },
      { label: "Open Team Project…", disabled: true, tooltip: na },
      { label: "Open Recent", submenu: [
        { label: "No recent files", disabled: true, tooltip: na },
      ]},
      { separator: true },
      { label: "Close", disabled: true, tooltip: na },
      { label: "Close Project", disabled: true, tooltip: na },
      { label: "Close All Projects", disabled: true, tooltip: na },
      { separator: true },
      { label: "Save", shortcut: "Ctrl+S", disabled: true, tooltip: na },
      { label: "Save As…", disabled: true, tooltip: na },
      { label: "Save a Copy…", disabled: true, tooltip: na },
      { label: "Save as Template…", disabled: true, tooltip: na },
      { label: "Save All", disabled: true, tooltip: na },
      { label: "Revert", disabled: true, tooltip: na },
      { separator: true },
      { label: "Import…", shortcut: "Ctrl+I", disabled: true, tooltip: na },
      { label: "Import Recent File", disabled: true, tooltip: na },
      { label: "Search Adobe Stock", disabled: true, tooltip: na },
      { separator: true },
      { label: "Export", submenu: [
        { label: "Media…", disabled: true, tooltip: na },
        { label: "Send to Adobe Media Encoder", disabled: true, tooltip: na },
        { label: "Captions", disabled: true, tooltip: na },
        { label: "EDL", disabled: true, tooltip: na },
        { label: "OMF", disabled: true, tooltip: na },
        { label: "AAF", disabled: true, tooltip: na },
        { label: "Final Cut Pro XML", disabled: true, tooltip: na },
      ]},
      { separator: true },
      { label: "Get Media File Properties", disabled: true, tooltip: na },
      { label: "Project Settings", disabled: true, tooltip: na },
      { label: "Production Settings", disabled: true, tooltip: na },
      { label: "Project Manager", disabled: true, tooltip: na },
      { separator: true },
      { label: "Exit", disabled: true, tooltip: na },
    ],
    Edit: [
      { label: "Undo", shortcut: "Ctrl+Z", disabled: true, tooltip: na },
      { label: "Redo", shortcut: "Ctrl+Shift+Z", disabled: true, tooltip: na },
      { separator: true },
      { label: "Cut", shortcut: "Ctrl+X", disabled: true, tooltip: na },
      { label: "Copy", shortcut: "Ctrl+C", disabled: true, tooltip: na },
      { label: "Paste", shortcut: "Ctrl+V", disabled: true, tooltip: na },
      { label: "Paste Insert", disabled: true, tooltip: na },
      { label: "Clear", shortcut: "Delete", disabled: true, tooltip: na },
      { separator: true },
      { label: "Duplicate", shortcut: "Ctrl+Shift+/", disabled: true, tooltip: na },
      { label: "Select All", shortcut: "Ctrl+A", disabled: true, tooltip: na },
      { label: "Deselect All", shortcut: "Ctrl+Shift+A", disabled: true, tooltip: na },
      { separator: true },
      { label: "Find", shortcut: "Ctrl+F", disabled: true, tooltip: na },
      { label: "Preferences", submenu: [
        { label: "General", disabled: true, tooltip: na },
        { label: "Audio", disabled: true, tooltip: na },
        { label: "Auto Save", disabled: true, tooltip: na },
        { label: "Captions", disabled: true, tooltip: na },
        { label: "Labels", disabled: true, tooltip: na },
        { label: "Media", disabled: true, tooltip: na },
        { label: "Memory", disabled: true, tooltip: na },
        { label: "Playback", disabled: true, tooltip: na },
        { label: "Timeline", disabled: true, tooltip: na },
        { label: "Trim", disabled: true, tooltip: na },
      ]},
    ],
    Clip: [
      { label: "Rename…", disabled: true, tooltip: na },
      { label: "Make Subclip…", disabled: true, tooltip: na },
      { label: "Unlink", shortcut: "Ctrl+L", disabled: true, tooltip: na },
      { label: "Link", shortcut: "Ctrl+L", disabled: true, tooltip: na },
      { separator: true },
      { label: "Speed/Duration…", shortcut: "Ctrl+R", disabled: true, tooltip: na },
      { label: "Insert", disabled: true, tooltip: na },
      { label: "Overwrite", disabled: true, tooltip: na },
      { label: "Replace With Clip", disabled: true, tooltip: na },
      { separator: true },
      { label: "Nest…", disabled: true, tooltip: na },
      { label: "Render and Replace", disabled: true, tooltip: na },
      { label: "Restore Unrendered", disabled: true, tooltip: na },
      { separator: true },
      { label: "Enable", disabled: true, tooltip: na },
      { label: "Add Markers", submenu: [
        { label: "Clip Marker", shortcut: "Shift+M", disabled: true, tooltip: na },
        { label: "Subclip", disabled: true, tooltip: na },
      ]},
    ],
    Sequence: [
      { label: "Sequence Settings…", disabled: true, tooltip: na },
      { separator: true },
      { label: "Add Tracks…", disabled: true, tooltip: na },
      { label: "Delete Tracks…", disabled: true, tooltip: na },
      { separator: true },
      { label: "Render Audio In to Out", shortcut: "Shift+R", disabled: true, tooltip: na },
      { label: "Render Audio Selection", disabled: true, tooltip: na },
      { label: "Delete Rendered Audio", disabled: true, tooltip: na },
      { label: "Render In to Out", shortcut: "Enter", disabled: true, tooltip: na },
      { label: "Render Selection", disabled: true, tooltip: na },
      { label: "Delete Rendered Files", disabled: true, tooltip: na },
      { separator: true },
      { label: "Delete Work Area", disabled: true, tooltip: na },
      { separator: true },
      { label: "Add Edit", shortcut: "Ctrl+K", disabled: true, tooltip: na },
      { label: "Add All Edits", disabled: true, tooltip: na },
      { label: "Remove Edit", disabled: true, tooltip: na },
      { label: "Remove All Edits", disabled: true, tooltip: na },
    ],
    Markers: [
      { label: "Add Marker", shortcut: "M", disabled: true, tooltip: na },
      { label: "Clear Selected Marker", shortcut: "Alt+M", disabled: true, tooltip: na },
      { label: "Clear All Markers", disabled: true, tooltip: na },
      { separator: true },
      { label: "Go To Next Marker", shortcut: "Shift+M", disabled: true, tooltip: na },
      { label: "Go To Previous Marker", shortcut: "Ctrl+Shift+M", disabled: true, tooltip: na },
      { separator: true },
      { label: "Edit Marker", disabled: true, tooltip: na },
      { label: "Name Marker", disabled: true, tooltip: na },
      { separator: true },
      { label: "Set Clip Marker", shortcut: "Shift+M", disabled: true, tooltip: na },
    ],
    "Graphics & Titles": [
      { label: "New Layer", submenu: [
        { label: "Text", disabled: true, tooltip: na },
        { label: "Rectangle", disabled: true, tooltip: na },
        { label: "Ellipse", disabled: true, tooltip: na },
        { label: "Legacy Titler", disabled: true, tooltip: na },
      ]},
      { separator: true },
      { label: "Track Matte Key", disabled: true, tooltip: na },
      { label: "Essential Graphics", disabled: true, tooltip: na },
      { separator: true },
      { label: "Captions", disabled: true, tooltip: na },
    ],
    View: [
      { label: "Zoom In", shortcut: "=", disabled: true, tooltip: na },
      { label: "Zoom Out", shortcut: "-", disabled: true, tooltip: na },
      { label: "Fit in View", shortcut: "Shift+/", disabled: true, tooltip: na },
      { label: "100%", shortcut: "Ctrl+1", disabled: true, tooltip: na },
      { separator: true },
      { label: "Show/Hide Rulers", shortcut: "Ctrl+R", disabled: true, tooltip: na },
      { label: "Show/Hide Guides", shortcut: "Ctrl+;", disabled: true, tooltip: na },
      { label: "Snap to Guides", disabled: true, tooltip: na },
      { separator: true },
      { label: "Show/Hide Transport Controls", disabled: true, tooltip: na },
      { label: "Full Screen", shortcut: "Ctrl+`", disabled: true, tooltip: na },
    ],
    Window: [
      { label: "Workspace", submenu: [
        { label: "Editing", disabled: true, tooltip: na },
        { label: "Color", disabled: true, tooltip: na },
        { label: "Effects", disabled: true, tooltip: na },
        { label: "Assembly", disabled: true, tooltip: na },
        { label: "Audio", disabled: true, tooltip: na },
        { label: "Learning", disabled: true, tooltip: na },
        { label: "Reset to Saved Layout", disabled: true, tooltip: na },
      ]},
      { separator: true },
      { label: "Project", disabled: true, tooltip: na },
      { label: "Source Monitor", disabled: true, tooltip: na },
      { label: "Program Monitor", disabled: true, tooltip: na },
      { label: "Timeline", disabled: true, tooltip: na },
      { label: "Audio Meters", disabled: true, tooltip: na },
      { label: "Effects", disabled: true, tooltip: na },
      { label: "Effect Controls", disabled: true, tooltip: na },
      { label: "Lumetri Scopes", disabled: true, tooltip: na },
      { label: "Essential Graphics", disabled: true, tooltip: na },
    ],
    Help: [
      { label: "Keyboard Shortcuts", shortcut: "Ctrl+Alt+K", disabled: true, tooltip: na },
      { label: "User Guide", disabled: true, tooltip: na },
      { label: "System Requirements", disabled: true, tooltip: na },
      { separator: true },
      { label: "About", disabled: true, tooltip: na },
    ],
  };
}

export default function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuItems = getMenuItems();
  const menuNames = Object.keys(menuItems);

  return (
    <div className="flex items-center gap-0.5 px-2 select-none">
      {menuNames.map((name) => (
        <MenuDropdown
          key={name}
          label={name}
          items={menuItems[name]}
          isOpen={openMenu === name}
          onToggle={() => setOpenMenu(openMenu === name ? null : name)}
          onClose={() => setOpenMenu(null)}
        />
      ))}
    </div>
  );
}
