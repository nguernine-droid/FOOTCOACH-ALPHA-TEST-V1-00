'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'cyan' | 'orange' | 'magenta' | 'green';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function NeonButton({
  variant = 'orange',
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

  const darkColors = {
    cyan: 'bg-neon-cyan/10 border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/20',
    orange: 'bg-neon-orange/15 border-neon-orange/50 text-neon-orange hover:bg-neon-orange/25',
    magenta: 'bg-neon-magenta/10 border-neon-magenta/40 text-neon-magenta hover:bg-neon-magenta/20',
    green: 'bg-neon-green/10 border-neon-green/40 text-neon-green hover:bg-neon-green/20',
  };

  const classicColors = {
    cyan: 'bg-teal-50 text-teal-600 border-teal-200 hover:bg-teal-100',
    orange: 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700',
    magenta: 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100',
  };

  const sizes = {
    sm: 'px-4 py-2 text-[11px]',
    md: 'px-6 py-3 text-xs',
    lg: 'px-8 py-4 text-sm',
  };

  return (
    <button
      className={cn(
        "border font-bold uppercase tracking-wide transition-all active:scale-95 rounded-2xl shadow-sm",
        isClassic ? classicColors[variant] : darkColors[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
