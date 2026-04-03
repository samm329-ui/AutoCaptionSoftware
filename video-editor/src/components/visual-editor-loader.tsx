"use client";

import { useEffect } from "react";

export function VisualEditorLoader() {
  useEffect(() => {
    // Check if already loaded
    if (typeof window !== "undefined" && !(window as any).ve) {
      const script = document.createElement("script");
      script.src = "/visual-editor.html";
      script.onload = () => {
        console.log("Visual Editor loaded");
      };
      document.body.appendChild(script);
    }
  }, []);

  return null;
}
