'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MatchRequest } from '@/app/(main)/radar/page';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Radio, Target, Zap, Layers, Trophy } from 'lucide-react';

interface RadarSonarProps {
  signals: MatchRequest[];
  onSignalClick: (request: MatchRequest) => void;
  isScanning: boolean;
  theme: 'classic' | 'nexus';
}

/**
 * RADAR_SONAR (v26.0 - UNIFIED NEXUS SONAR)
 * Unification du design pour tout le monde : Balayage tactique et Blips Blasons.
 */
export function RadarSonar({ signals, onSignalClick, isScanning, theme }: RadarSonarProps) {
  const [rotation, setRotation] = useState(0);
  const isPro = theme === 'classic';

  // Animation de balayage laser (Rotation 360°)
  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      setRotation(prev => (prev + 2) % 360);
    }, 25);
    return () => clearInterval(interval);
  }, [isScanning]);

  // Détection de "collision" pour faire briller les blasons au passage du laser
  const getActiveState = (x: number = 50, y: number = 50) => {
    const angle = (Math.atan2(y - 50, x - 50) * 180) / Math.PI;
    const normalizedAngle = (angle + 450) % 360;
    const diff = Math.abs(normalizedAngle - rotation);
    return diff < 15;
  };

  const accentColor = isPro ? '#F97316' : '#2DD4BF';

  return (
    <div className="relative w-full aspect-square flex items-center justify-center bg-[#15171C] rounded-[3rem] overflow-hidden border-4 border-white/5 shadow-xl">

      {/* 1. GRILLE TACTIQUE DE FOND */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]" />

      {/* 2. CERCLES CONCENTRIQUES (RÉSEAU) */}
      {[15, 30, 45, 60, 75].map((size, i) => (
        <div
          key={i}
          className="absolute rounded-full border border-white/5"
          style={{ width: `${size * 1.3}%`, height: `${size * 1.3}%` }}
        />
      ))}

      {/* 3. LE RAYON LASER (SCANNER) */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          transform: `rotate(${rotation}deg)`,
          background: `conic-gradient(from 270deg at 50% 50%, ${accentColor}33 0%, transparent 25%)`
        }}
      >
        <div
          className="absolute top-0 left-1/2 w-[2px] h-1/2 -translate-x-1/2"
          style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}80` }}
        />
      </div>

      {/* 4. LES BLIPS (SIGNAUX DÉTECTÉS) */}
      {signals.map((sig) => {
        const x = sig.x || 50;
        const y = sig.y || 50;
        const isHit = getActiveState(x, y);
        const statusColor = sig.type === 'Match Amical' ? '#16a34a' : sig.type === 'Plateau' ? '#2563eb' : '#dc2626';

        return (
          <div
            key={sig.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-300"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <motion.div
              animate={{
                scale: isHit ? 1.2 : 1,
                opacity: isHit ? 1 : 0.4
              }}
              className="relative cursor-pointer group"
              onClick={() => onSignalClick(sig)}
            >
               {/* Halo de détection */}
               <AnimatePresence>
                 {isHit && (
                   <motion.div
                     initial={{ scale: 0.5, opacity: 0 }}
                     animate={{ scale: 2, opacity: 0 }}
                     exit={{ opacity: 0 }}
                     className="absolute inset-0 rounded-full"
                     style={{ backgroundColor: statusColor }}
                   />
                 )}
               </AnimatePresence>

               {/* Blason XXL */}
               <div
                 className={`w-14 h-14 rounded-full bg-white border-4 p-1 shadow-lg transition-all ${isHit ? 'shadow-[0_0_14px_rgba(249,115,22,0.4)]' : ''}`}
                 style={{ borderColor: isHit ? 'white' : statusColor }}
               >
                  {sig.coachLogo ? (
                    <img src={sig.coachLogo} className="w-full h-full object-contain" alt="Logo" />
                  ) : (
                    <ShieldCheck className="text-gray-200 w-full h-full" />
                  )}
               </div>

               {/* Icône Type de Match */}
               <div
                 className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
                 style={{ backgroundColor: statusColor }}
               >
                  {sig.type === 'Match Amical' ? <Zap size={10} className="text-white" fill="currentColor" /> :
                   sig.type === 'Plateau' ? <Layers size={10} className="text-white" fill="currentColor" /> :
                   <Trophy size={10} className="text-white" fill="currentColor" />}
               </div>

               {/* Nom du Club (Affiché au passage du scan) */}
               <div className={`absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg whitespace-nowrap transition-opacity duration-500 ${isHit ? 'opacity-100' : 'opacity-0'}`}>
                  <p className="text-[7px] font-black uppercase text-white tracking-widest">{sig.coachClub}</p>
               </div>
            </motion.div>
          </div>
        );
      })}

      {/* 5. CENTRE DU SYSTÈME (QG) */}
      <div className="relative z-40">
         <div className={`w-12 h-12 rounded-full border-4 border-black flex items-center justify-center shadow-[0_0_16px_rgba(249,115,22,0.25)] bg-white`}>
            <Target size={24} className={isPro ? 'text-orange-600' : 'text-neon-cyan'} />
         </div>
         <div className="absolute inset-[-10px] rounded-full border border-white/10 animate-ping" />
      </div>

      {/* 6. LÉGENDE SECTEUR */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
         <div className="bg-black/60 backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/10 shadow-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            <span className="text-[9px] font-black text-white uppercase tracking-[0.3em]">{signals.length} SIGNAUX DÉTECTÉS</span>
         </div>
      </div>

    </div>
  );
}
