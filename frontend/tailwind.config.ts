import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neon Darkroom — Surface System
        "surface": "#0e0e0e",
        "surface-container-lowest": "#000000",
        "surface-container-low": "#131313",
        "surface-container": "#1a1a1a",
        "surface-container-high": "#20201f",
        "surface-container-highest": "#262626",

        // Accent Colors
        "primary": "#b6a0ff",
        "primary-dim": "#7e51ff",
        "primary-deep": "#5a2dcc",
        "secondary": "#00e3fd",
        "secondary-dim": "#00b8cc",
        "accent-fire": "#ff6432",
        "accent-gold": "#ffd700",
        "accent-green": "#00ff88",

        // Text Colors
        "on-surface": "#e6e1e5",
        "on-surface-variant": "#9e9e9e",
        "on-primary": "#1a1a2e",

        // State Colors
        "error": "#ff5252",
        "success": "#00e676",
        "warning": "#ffab40",
      },
      fontFamily: {
        headline: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Manrope"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "glow-primary": "0 0 20px rgba(182, 160, 255, 0.3)",
        "glow-secondary": "0 0 20px rgba(0, 227, 253, 0.3)",
        "glow-fire": "0 0 20px rgba(255, 100, 50, 0.3)",
        "ambient": "0 8px 32px rgba(0, 0, 0, 0.4)",
        "glass": "0 4px 30px rgba(0, 0, 0, 0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-in-up": "fadeInUp 0.6s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        "progress-bar": "progressBar 2s ease-in-out infinite",
        "shimmer": "shimmer 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(182, 160, 255, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(182, 160, 255, 0.5)" },
        },
        progressBar: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
