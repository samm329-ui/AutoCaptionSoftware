"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="glass-navbar fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-dim to-secondary flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <span className="font-headline text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
            CaptionAI
          </span>
        </Link>

        {/* Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/"
            className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Upload
          </Link>
          <span className="text-sm text-on-surface-variant/50 cursor-default">
            Themes
          </span>
          <span className="text-sm text-on-surface-variant/50 cursor-default">
            Processing
          </span>
          <span className="text-sm text-on-surface-variant/50 cursor-default">
            Result
          </span>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-highest/60 text-xs text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Server Online
          </div>
        </div>
      </div>
    </nav>
  );
}
