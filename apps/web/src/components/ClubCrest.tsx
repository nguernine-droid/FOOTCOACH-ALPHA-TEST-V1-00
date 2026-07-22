"use client";

import { useId } from "react";

/** Blason "FootCoach" : écusson navy liseré or, bandes bleues, étoile dorée. */
export function ClubCrest({ size = 34 }: { size?: number }) {
  const clipId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path d="M24 3 L42 9 V24 C42 35 34 42.5 24 45.5 C14 42.5 6 35 6 24 V9 Z" fill="#F5B301" />
      <path
        d="M24 6.2 L39 11.2 V24 C39 33.3 32.4 39.8 24 42.4 C15.6 39.8 9 33.3 9 24 V11.2 Z"
        fill="#0C2E6B"
      />
      <defs>
        <clipPath id={clipId}>
          <path d="M24 6.2 L39 11.2 V24 C39 33.3 32.4 39.8 24 42.4 C15.6 39.8 9 33.3 9 24 V11.2 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} opacity={0.85}>
        <rect x="13.5" y="0" width="5" height="48" fill="#1D6FE0" />
        <rect x="29.5" y="0" width="5" height="48" fill="#1D6FE0" />
      </g>
      <polygon
        points="24,15 26.2,19.6 31.3,20.2 27.5,23.7 28.6,28.7 24,26.1 19.4,28.7 20.5,23.7 16.7,20.2 21.8,19.6"
        fill="#F5B301"
      />
    </svg>
  );
}
