import type { Metadata } from "next";
import "./globals.css";
import DebugPanel from "@/components/DebugPanel";

export const metadata: Metadata = {
  title: "CaptionAI — AI Video Caption Generator",
  description:
    "AI-powered video captioning with WhisperX, Bengali & English support, 4 stunning themes, and frame-by-frame rendering.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-body bg-surface text-on-surface antialiased min-h-screen">
        {/* Ambient glow background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-dim/5 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px]" />
        </div>

        <div className="relative z-10">{children}</div>
        <DebugPanel />
      </body>
    </html>
  );
}
