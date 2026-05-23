'use client';

import React, { useEffect, useState } from 'react';

export function ScanlinesOverlay() {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('app_theme');
    setTheme(t || 'classic');
  }, []);

  if (theme === 'classic') return null;

  return (
    <>
      {/* SCANLINES EFFECT */}
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden opacity-[0.03]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>

      {/* CRT VIGNETTE */}
      <div className="fixed inset-0 pointer-events-none z-[9998] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />

      {/* VERY SUBTLE STATIC / GRAIN - FIXED WITH INLINE DATA URI */}
      <div
        className="fixed inset-0 pointer-events-none z-[9997] opacity-[0.015] mix-blend-overlay animate-pulse"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
    </>
  );
}
