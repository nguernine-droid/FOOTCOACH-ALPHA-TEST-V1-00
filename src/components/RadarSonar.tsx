'use client';

import React, { useState, useEffect } from 'react';
import { MatchRequest } from '@/app/(main)/radar/page';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, MapPin, Maximize2, Navigation } from 'lucide-react';

interface RadarSonarProps {
  signals: MatchRequest[];
  onSignalClick: (request: MatchRequest) => void;
  isScanning: boolean;
  theme: 'classic' | 'nexus';
}

export function RadarSonar({ signals, onSignalClick, isScanning, theme }: RadarSonarProps) {
  const isPro = theme === 'classic';
  const [activeSignalId, setActiveSignalId] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  // Couleurs selon le thème
  const accentColor = isPro ? '#F97316' : '#00F0FF';
  const ringColor = isPro ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 240, 255, 0.1)';

  // Simulation de la rotation du rayon (Nexus uniquement)
  useEffect(() => {
    if (!isScanning || isPro) return;
    const interval = setInterval(() => {
      setRotation(prev => (prev + 2) % 360);
    }, 20);
    return () => clearInterval(interval);
  }, [isScanning, isPro]);

  // Détection de collision pour le Sonar Nexus
  useEffect(() => {
    if (isPro) return;
    const hit = signals.find(sig => {
      const angle = (Math.atan2((sig.y || 50) - 50, (sig.x || 50) - 50) * 180) / Math.PI;
      const normalizedAngle = (angle + 450) % 360;
      const diff = Math.abs(normalizedAngle - rotation);
      return diff < 8;
    });

    if (hit) {
      setActiveSignalId(hit.id);
      const timer = setTimeout(() => setActiveSignalId(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [rotation, signals, isPro]);

  if (isPro) {
    // ==========================================
    // RENDU MODE CLASSIC : VRAIE CARTE INTERACTIVE (Style Pro)
    // ==========================================
    return (
      <div className="relative aspect-square w-full mb-10 overflow-hidden rounded-[2.5rem] border-4 border-white shadow-2xl bg-[#e5e7eb]">
        {/* COUCHE CARTE RÉELLE (OpenStreetMap) */}
        <div className="absolute inset-0 z-0">
           <iframe
             width="100%"
             height="100%"
             frameBorder="0"
             scrolling="no"
             marginHeight={0}
             marginWidth={0}
             src="https://www.openstreetmap.org/export/embed.html?bbox=3.65,43.40,3.85,43.50&layer=mapnik"
             className="opacity-60 grayscale-[0.5] contrast-[1.1]"
           />
        </div>

        {/* OVERLAY TACTIQUE (Grille légère) */}
        <div className="absolute inset-0 z-10 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]" />

        {/* BOUTON FULLSCREEN & GEOLOC */}
        <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
           <button className="bg-white p-2 rounded-xl shadow-md border border-gray-100 active:scale-90 transition-transform">
              <Maximize2 size={16} className="text-gray-600" />
           </button>
           <button className="bg-white p-2 rounded-xl shadow-md border border-gray-100 active:scale-90 transition-transform">
              <Navigation size={16} className="text-blue-600" />
           </button>
        </div>

        {/* PINS DES CLUBS SUR LA CARTE */}
        <div className="absolute inset-0 z-30">
          {signals.map((sig) => (
            <div
              key={sig.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${sig.x}%`, top: `${sig.y}%` }}
            >
              <div className="relative cursor-pointer" onClick={() => onSignalClick(sig)}>
                 {/* Bulle d'info au survol ou par défaut */}
                 <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-2xl shadow-xl border-2 border-orange-500 whitespace-nowrap flex items-center gap-2 animate-in slide-in-from-bottom-1">
                    <div className="w-6 h-6 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                      {sig.coachLogo ? <img src={sig.coachLogo} className="w-full h-full object-contain" /> : <ShieldCheck size={14} className="text-gray-400 m-auto" />}
                    </div>
                    <div className="text-left">
                       <p className="text-[8px] font-black uppercase text-gray-900 leading-none mb-0.5">{sig.coachClub}</p>
                       <p className="text-[7px] font-bold text-orange-600 uppercase tracking-tighter">{sig.type}</p>
                    </div>
                 </div>
                 {/* L'ombre du pin */}
                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-2 bg-black/20 rounded-full blur-sm" />
                 {/* Le Pin Orange Pro */}
                 <div className="text-orange-600 animate-bounce duration-1000">
                    <MapPin size={36} fill="#F97316" className="text-white" strokeWidth={1.5} />
                 </div>
              </div>
            </div>
          ))}
        </div>

        {/* MA POSITION (Centre GPS) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
           <div className="w-12 h-12 bg-blue-600/10 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center animate-pulse">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
           </div>
        </div>

        {/* LÉGENDE SECTEUR */}
        <div className="absolute bottom-6 left-6 z-40 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-gray-100 shadow-lg">
           <p className="text-[8px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-2 bg-[#39FF14] rounded-full shadow-[0_0_5px_#39FF14]" /> {signals.length} UNITÉS ACTIVES
           </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDU MODE NEXUS : SONAR TACTIQUE BALAYAGE
  // ==========================================
  return (
    <div className="relative aspect-square w-full flex items-center justify-center mb-10 overflow-hidden rounded-full bg-black/20 border-2 border-white/5 shadow-inner">

      {/* Cercles Concentriques Sonar */}
      {[0, 10, 25, 45].map((inset, i) => (
        <div
          key={i}
          className="absolute rounded-full border transition-colors duration-500"
          style={{ inset: `${inset}%`, borderColor: ringColor }}
        />
      ))}

      {/* Rayon Laser Scanning Sweep */}
      <div
        className={`absolute inset-0 pointer-events-none rounded-full z-20 ${isScanning ? 'opacity-100' : 'opacity-0'}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          background: `conic-gradient(from 270deg at 50% 50%, ${accentColor}44 0%, transparent 35%)`
        }}
      >
        <div className="absolute top-0 left-1/2 w-[3px] h-1/2 -translate-x-1/2 rounded-full" style={{ backgroundColor: accentColor, boxShadow: `0 0 20px ${accentColor}` }} />
      </div>

      {/* Signaux Détectés Nexus */}
      {signals.map((sig) => {
        const x = sig.x || 50;
        const y = sig.y || 50;
        const isActive = activeSignalId === sig.id;

        return (
          <div
            key={sig.id}
            className="absolute text-center transform -translate-x-1/2 -translate-y-1/2 z-30"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {/* Pop-up Info au passage du rayon */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.5 }}
                  animate={{ opacity: 1, y: -50, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onClick={() => onSignalClick(sig)}
                  className="absolute left-1/2 -translate-x-1/2 p-2 rounded-2xl bg-black border-2 border-neon-cyan shadow-[0_0_15px_#00F0FF33] cursor-pointer flex items-center gap-3 min-w-[140px]"
                >
                   <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center shrink-0">
                      {sig.coachLogo ? <img src={sig.coachLogo} className="w-full h-full object-contain p-1" /> : <ShieldCheck size={18} className="text-neon-cyan" />}
                   </div>
                   <div className="text-left flex-1 min-w-0">
                      <p className="text-[8px] font-black uppercase italic truncate text-white leading-none mb-1">{sig.coachClub}</p>
                      <p className="text-[6px] font-bold bg-neon-cyan text-black px-1.5 py-0.5 rounded-full uppercase w-fit">{sig.type}</p>
                   </div>
                   <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-neon-cyan" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Le Blip Sonar */}
            <div
              onClick={() => onSignalClick(sig)}
              className={`w-5 h-5 rounded-full border-2 border-white/60 shadow-xl cursor-pointer transition-all duration-300 flex items-center justify-center ${isActive ? 'scale-125 z-50 shadow-[0_0_20px_currentColor]' : 'scale-100 opacity-60'}`}
              style={{ backgroundColor: sig.status === 'OPEN' ? accentColor : '#39FF14', color: accentColor }}
            >
               {isActive && <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: accentColor }} />}
               {sig.coachLogo && <img src={sig.coachLogo} className="w-full h-full object-cover rounded-full opacity-40" />}
            </div>
          </div>
        );
      })}

      {/* Centre Nexus */}
      <div className="relative w-10 h-10 rounded-full z-40 border-4 border-black flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.4)]" style={{ backgroundColor: accentColor }}>
        <div className="absolute inset-0 rounded-full animate-pulse opacity-40" style={{ backgroundColor: accentColor }} />
        <ShieldCheck size={18} className="text-black" />
      </div>
    </div>
  );
}
