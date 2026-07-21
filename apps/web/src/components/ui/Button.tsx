"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "soft" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const variants = {
  primary: "bg-pitch text-white hover:bg-pitch-dark shadow-[0_6px_16px_-6px_rgba(22,163,74,0.5)]",
  accent: "bg-tangerine text-white hover:bg-orange-600 shadow-[0_6px_16px_-6px_rgba(249,115,22,0.5)]",
  soft: "bg-pitch-soft text-pitch-deep hover:bg-green-200",
  ghost: "bg-transparent text-ink-soft border border-line hover:bg-white hover:text-ink",
  danger: "bg-coral-soft text-coral hover:bg-red-200",
};

const sizes = {
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-sm",
};

export function Button({ variant = "primary", size = "md", children, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold rounded-2xl transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
