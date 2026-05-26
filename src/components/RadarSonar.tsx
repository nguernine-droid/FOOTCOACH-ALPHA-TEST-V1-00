'use client';

import React, { useState, useEffect } from 'react';
import { MatchRequest } from '@/app/(main)/radar/page';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, MapPin, Maximize2, Navigation, Radio, Target, Zap } from 'lucide-react';

interface RadarSonarProps {
  signals: MatchRequest[];
  onSignalClick: (request: MatchRequest) => void;
  isScanning: boolean;
  theme: 'classic' | 'nexus';
}

export function RadarSonar({ signals, onSignalClick, isScanning, theme }: RadarSonarProps) {
  const isPro = theme === 'classic';
  const [rotation, setRotation] = useState(0);

  // Animation de balayage (Sonar)
  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      setRotation(prev => (prev + 2) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isScanning]);

  if (isPro) {
    // ==========================================
    // RENDU MODE CLASSIC : STATION TACTIQUE XXL
    // ==========================================
    return (
      <div className="relative w-full h-[500px] overflow-hidden rounded-[2.5rem] bg-[#e5e7eb] shadow-2xl border-2 border-white/10">

        {/* CARTE FOND (Immersion) */}
        <div className="absolute inset-0 z-0">
           <iframe
             width="100%" height="100%" frameBorder="0" scrolling="no"
             src="https://www.openstreetmap.org/export/embed.html?bbox=3.70,43.35,3.95,43.55&layer=mapnik"
             className="opacity-70 grayscale-[0.3] contrast-[1.2] scale-110"
           />
           {/* Vignettage Sombre */}
           <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.4)] pointer-events-none" />
        </div>

        {/* OVERLAY : MINI RADAR DE BALAYAGE (HAUT DROITE) */}
        <div className="absolute top-6 right-6 z-50 w-20 h-20 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden">
           <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <div className="w-full h-px bg-[#39FF14]" />
              <div className="h-full w-px bg-[#39FF14]" />
           </div>
           {/* Faisceau tournant */}
           <div
             className="absolute inset-0"
             style={{
               transform: `rotate(${rotation}deg)`,
               background: 'conic-gradient(from 0deg at 50% 50%, rgba(57,255,20,0.4) 0%, transparent 25%)'
             }}
           />
           <Radio size={24} className="text-[#39FF14] animate-pulse" />
        </div>

        {/* SIGNAUX BLASONS XXL SUR LA CARTE */}
        <div className="absolute inset-0 z-30">
          {signals.map((sig) => {
            const statusColor = sig.type === 'Match Amical' ? '#16a34a' : sig.type === 'Plateau' ? '#2563eb' : '#dc2626';
            return (
              <div
                key={sig.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${sig.x}%`, top: `${sig.y}%` }}
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="relative cursor-pointer group"
                  onClick={() => onSignalClick(sig)}
                >
                   {/* Halo Pulsant Couleur Match */}
                   <div
                     className="absolute inset-[-10px] rounded-full animate-ping opacity-20"
                     style={{ backgroundColor: statusColor }}
                   />

                   {/* Bulle d'identité flottante */}
                   <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 rounded-xl text-[7px] font-black uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-white/20">
                      {sig.coachClub}
                   </div>

                   {/* Blason XXL Cercle */}
                   <div
                     className="w-14 h-14 rounded-full bg-white border-4 p-1 shadow-2xl transition-transform group-hover:scale-110 active:scale-90"
                     style={{ borderColor: statusColor }}
                   >
                      {sig.coachLogo ? (
                        <img src={sig.coachLogo} className="w-full h-full object-contain" />
                      ) : (
                        <ShieldCheck className="text-gray-300 w-full h-full" />
                      )}
                   </div>

                   {/* Badge Type de Match (Petit) */}
                   <div
                     className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
                     style={{ backgroundColor: statusColor }}
                   >
                      <Zap size={10} className="text-white" fill="currentColor" />
                   </div>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* MA POSITION (QG) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
           <div className="relative">
              <div className="absolute inset-[-20px] rounded-full border border-blue-500/30 animate-ping" />
              <div className="w-10 h-10 bg-blue-600 rounded-full border-4 border-white shadow-[0_0_20px_rgba(37,99,235,0.6)] flex items-center justify-center">
                 <Navigation size={18} className="text-white rotate-45" fill="currentColor" />
              </div>
           </div>
        </div>

        {/* LÉGENDE INFÉRIEURE */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl flex items-center gap-4">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#39FF14] rounded-full animate-pulse shadow-[0_0_8px_#39FF14]" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">{signals.length} UNITÉS ACTIVES</span>
           </div>
           <div className="h-4 w-px bg-white/10" />
           <p className="text-[8px] font-bold text-gray-400 uppercase italic">Secteur Montpellier / Sète</p>
        </div>
      </div>
    );
  }

  // Rendu Nexus (Inchangé pour l'instant)
  return (
    <div className="relative aspect-square w-full flex items-center justify-center bg-black/20 rounded-full border-2 border-white/5">
       <Target size={100} className="text-neon-cyan opacity-5 animate-pulse" />
       <div className="absolute inset-0 rounded-full" style={{ transform: `rotate(${rotation}deg)`, background: 'conic-gradient(from 0deg at 50% 50%, rgba(0,240,255,0.2) 0%, transparent 20%)' }} />
       <p className="text-neon-cyan font-black uppercase text-[10px] tracking-[0.5em] animate-pulse">Scanning...</p>
    </div>
  );
}
