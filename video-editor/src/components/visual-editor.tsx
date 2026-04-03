"use client";

import { useEffect } from "react";

export function VisualEditor() {
  useEffect(() => {
    // Check if already loaded
    if (typeof window !== "undefined" && (window as any).veInitialized) {
      return;
    }

    // Load the visual editor HTML file
    fetch("/visual-editor.html")
      .then((res) => res.text())
      .then((html) => {
        // Extract styles
        const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
        if (styleMatch) {
          const style = document.createElement("style");
          style.id = "ve-styles";
          style.textContent = styleMatch[1];
          document.head.appendChild(style);
        }

        // Extract script
        const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
        if (scriptMatch) {
          const script = document.createElement("script");
          script.id = "ve-script";
          script.textContent = scriptMatch[1];
          document.body.appendChild(script);
        }

        // Extract body content
        const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
        if (bodyMatch) {
          const container = document.createElement("div");
          container.id = "ve-container";
          container.innerHTML = bodyMatch[1];
          document.body.appendChild(container);
        }

        (window as any).veInitialized = true;
      })
      .catch((err) => {
        console.error("Failed to load visual editor:", err);
      });
  }, []);

  return null;
}
