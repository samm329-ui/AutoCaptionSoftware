"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/components/shared/icons";
import { Pencil } from "lucide-react";

declare global {
  interface Window {
    ve?: {
      enabled: boolean;
      toggle: () => void;
      init: () => void;
      loadFromStorage: () => void;
    };
    veInitialized?: boolean;
  }
}

export function VisualEditorToggle() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Load visual editor script once
    if (window.veInitialized) {
      setIsLoaded(true);
      return;
    }

    fetch("/visual-editor.html")
      .then((res) => res.text())
      .then((html) => {
        // Extract and inject styles
        const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
        if (styleMatch) {
          const style = document.createElement("style");
          style.id = "ve-styles";
          style.textContent = styleMatch[1];
          document.head.appendChild(style);
        }

        // Extract and inject script
        const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
        if (scriptMatch) {
          const script = document.createElement("script");
          script.id = "ve-script";
          script.textContent = scriptMatch[1];
          document.body.appendChild(script);
        }

        // Extract and inject body content
        const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
        if (bodyMatch) {
          const container = document.createElement("div");
          container.id = "ve-container";
          container.innerHTML = bodyMatch[1];
          document.body.appendChild(container);
        }

        window.veInitialized = true;
        setIsLoaded(true);

        // Initialize the visual editor
        if (window.ve) {
          window.ve.init();
          window.ve.loadFromStorage();
        }
      })
      .catch((err) => {
        console.error("Failed to load visual editor:", err);
      });
  }, []);

  const handleToggle = () => {
    if (window.ve) {
      window.ve.toggle();
      setIsActive(window.ve.enabled);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center transition-all hover:scale-110 z-[99998]"
      title="Visual Editor - Click to toggle"
      style={{
        boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
      }}
    >
      <Pencil className="w-6 h-6" />
    </button>
  );
}

export default VisualEditorToggle;
