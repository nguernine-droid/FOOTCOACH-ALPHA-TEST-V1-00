"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "cyan" | "orange" | "magenta" | "green";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const colors = {
  cyan: "bg-neon-cyan/10 border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/20",
  orange: "bg-neon-orange/15 border-neon-orange/50 text-neon-orange hover:bg-neon-orange/25",
  magenta: "bg-neon-magenta/10 border-neon-magenta/40 text-neon-magenta hover:bg-neon-magenta/20",
  green: "bg-neon-green/10 border-neon-green/40 text-neon-green hover:bg-neon-green/20",
};

const sizes = {
  sm: "px-4 py-2 text-[11px]",
  md: "px-6 py-3 text-xs",
  lg: "px-8 py-4 text-sm",
};

export function NeonButton({ variant = "orange", size = "md", children, className, ...props }: NeonButtonProps) {
  return (
    <button
      className={cn(
        "border font-bold uppercase tracking-wide transition-all active:scale-95 rounded-2xl shadow-sm disabled:opacity-40 disabled:pointer-events-none",
        colors[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
