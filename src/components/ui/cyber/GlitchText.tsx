'use client';

import React, { useEffect, useState } from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
}

export function GlitchText({ text, className = "" }: GlitchTextProps) {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('app_theme');
    setTheme(t || 'nexus');
  }, []);

  if (theme === 'classic') {
    return <div className={className}>{text}</div>;
  }

  return (
    <div className={`relative inline-block group ${className}`}>
      <span className="relative z-10">{text}</span>
      <span className="absolute top-0 left-0 -z-10 text-neon-cyan opacity-0 group-hover:opacity-70 group-hover:animate-glitch translate-x-[2px]">{text}</span>
      <span className="absolute top-0 left-0 -z-10 text-neon-magenta opacity-0 group-hover:opacity-70 group-hover:animate-glitch -translate-x-[2px]">{text}</span>
    </div>
  );
}
