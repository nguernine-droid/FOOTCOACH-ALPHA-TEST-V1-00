'use client';

import React from 'react';
import { MatchRequest } from '@/app/(main)/radar/page';

interface RadarSonarProps {
  signals: MatchRequest[];
  onSignalClick: (id: string) => void;
  isScanning: boolean;
  theme: 'classic' | 'nexus';
}

export function RadarSonar({ signals, onSignalClick, isScanning, theme }: RadarSonarProps) {
  const isPro = theme === 'classic';

  // Couleurs selon le thème
  const accentColor = isPro ? '#2563eb' : '#00F0FF'; // Bleu Pro ou Cyan Néon
  const ringColor = isPro ? 'rgba(37, 99, 235, 0.1)' : 'rgba(0, 240, 255, 0.1)';

  const getAnimationDelay = (x: number, y: number) => {
    const angle = Math.atan2(y - 50, x - 50) * (180 / Math.PI);
    let normalizedAngle = (angle + 450) % 360;
    return (normalizedAngle / 360) * 4;
  };

  return (
    <div className="relative aspect-square w-full flex items-center justify-center mb-10">
      {/* Cercles Concentriques */}
      {[0, 8, 20, 36].map((inset, i) => (
        <div
          key={i}
          className="absolute rounded-full border transition-colors duration-500"
          style={{ inset: `${inset}%`, borderColor: ringColor }}
        />
      ))}

      {/* Scanning Sweep (Laser) */}
      <div
        className={`absolute inset-0 animate-[spin_4s_linear_infinite] pointer-events-none rounded-full z-20 ${isScanning ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: `conic-gradient(from 270deg at 50% 50%, ${accentColor}66 0%, transparent 40%)`
        }}
      >
        <div className="absolute top-0 left-1/2 w-[2px] h-1/2 -translate-x-1/2" style={{ backgroundColor: accentColor, boxShadow: `0 0 15px ${accentColor}` }} />
      </div>

      {/* Points Détectés */}
      {signals.map((sig) => {
        const x = sig.x || 50;
        const y = sig.y || 50;
        const delay = getAnimationDelay(x, y);

        return (
          <div
            key={sig.id}
            onClick={() => onSignalClick(sig.id)}
            className="absolute text-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30 group"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div className={`transition-all duration-500 ${isScanning ? 'animate-radar-hit' : 'scale-100 opacity-80'}`} style={{ animationDelay: `${delay}s` }}>
              <div className="relative flex flex-col items-center">
                <span className="block text-[6px] font-black text-white/40 mb-1 tracking-tighter uppercase truncate max-w-[40px]">
                  {sig.coachClub}
                </span>
                <div
                   className="w-3 h-3 rounded-full border-2 border-white/20 shadow-lg"
                   style={{ backgroundColor: sig.status === 'OPEN' ? accentColor : '#39FF14' }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Point Central (L'utilisateur) */}
      <div className="relative w-6 h-6 rounded-full z-30 border-4 border-black" style={{ backgroundColor: accentColor, boxShadow: `0 0 30px ${accentColor}` }}>
        <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: accentColor }} />
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="w-1 h-1 bg-white rounded-full" />
        </div>
      </div>
    </div>
  );
}
