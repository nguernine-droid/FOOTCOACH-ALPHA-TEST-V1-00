'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'cyan' | 'orange' | 'magenta' | 'green';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function NeonButton({
  variant = 'cyan',
  size = 'md',
  children,
  className,
  ...props
}: NeonButtonProps) {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('app_theme');
    setTheme(t || 'nexus');
  }, []);

  const isClassic = theme === 'classic';

  const nexusColors = {
    cyan: 'border-neon-cyan text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)]',
    orange: 'border-neon-orange text-neon-orange shadow-[0_0_15px_rgba(255,107,0,0.3)] hover:shadow-[0_0_25px_rgba(255,107,0,0.5)]',
    magenta: 'border-neon-magenta text-neon-magenta shadow-[0_0_15px_rgba(255,0,102,0.3)] hover:shadow-[0_0_25px_rgba(255,0,102,0.5)]',
    green: 'border-neon-green text-neon-green shadow-[0_0_15px_rgba(0,255,157,0.3)] hover:shadow-[0_0_25px_rgba(0,255,157,0.5)]',
  };

  const classicColors = {
    cyan: 'bg-white text-black border-white hover:bg-gray-200',
    orange: 'bg-neon-orange text-black border-neon-orange hover:bg-[#e66100]',
    magenta: 'bg-neon-magenta text-white border-neon-magenta hover:bg-[#cc0052]',
    green: 'bg-neon-green text-black border-neon-green hover:bg-[#00e67e]',
  };

  const sizes = {
    sm: 'px-4 py-2 text-[10px]',
    md: 'px-6 py-3 text-xs',
    lg: 'px-8 py-4 text-sm',
  };

  return (
    <button
      className={cn(
        "border-2 font-black uppercase italic tracking-widest transition-all active:scale-95 rounded-xl",
        isClassic ? classicColors[variant] : `bg-black/20 backdrop-blur-md ${nexusColors[variant]}`,
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
