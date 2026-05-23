'use client';

import React, { useState, useEffect } from 'react';
import { MatchRequest } from '@/app/(main)/radar/page';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, MapPin } from 'lucide-react';

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

  // Simulation de la rotation du rayon
  useEffect(() => {
    if (!isScanning || isPro) return;
    const interval = setInterval(() => {
      setRotation(prev => (prev + 2) % 360);
    }, 20);
    return () => clearInterval(interval);
  }, [isScanning, isPro]);

  // Détection de collision avec persistance temporaire (1.5s)
  useEffect(() => {
    if (isPro) return;
    const hit = signals.find(sig => {
      const angle = (Math.atan2((sig.y || 50) - 50, (sig.x || 50) - 50) * 180) / Math.PI;
      const normalizedAngle = (angle + 450) % 360;
      const diff = Math.abs(normalizedAngle - rotation);
      return diff < 8; // Sensibilité du rayon
    });

    if (hit) {
      setActiveSignalId(hit.id);
      // Auto-hide après passage du rayon
      const timer = setTimeout(() => setActiveSignalId(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [rotation, signals, isPro]);

  return (
    <div className={`relative aspect-square w-full flex items-center justify-center mb-10 overflow-hidden rounded-full ${isPro ? 'bg-gray-100/50 border-4 border-white shadow-inner' : 'bg-black/20'}`}>

      {/* MODE CLASSIC : FOND CARTE RÉALISTE */}
      {isPro && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
           {/* Texture de grille de carte */}
           <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]" />
           {/* Masque de cercle de portée */}
           <div className="w-full h-full border-2 border-gray-200/50 rounded-full scale-95" />
           <div className="w-full h-full border border-gray-200/30 rounded-full scale-75" />
        </div>
      )}

      {/* Cercles Concentriques (Sonar ou Map Rings) */}
      {[0, 10, 25, 45].map((inset, i) => (
        <div
          key={i}
          className="absolute rounded-full border transition-colors duration-500"
          style={{ inset: `${inset}%`, borderColor: ringColor }}
        />
      ))}

      {/* Scanning Sweep (Laser) - Uniquement en Nexus */}
      {!isPro && (
        <div
          className={`absolute inset-0 pointer-events-none rounded-full z-20 ${isScanning ? 'opacity-100' : 'opacity-0'}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            background: `conic-gradient(from 270deg at 50% 50%, ${accentColor}44 0%, transparent 35%)`
          }}
        >
          <div className="absolute top-0 left-1/2 w-[3px] h-1/2 -translate-x-1/2 rounded-full" style={{ backgroundColor: accentColor, boxShadow: `0 0 20px ${accentColor}` }} />
        </div>
      )}

      {/* Points DétectÉS */}
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
            {/* POPUP DE L'ANNONCE (Sur détection Nexus ou Permanent Classic) */}
            <AnimatePresence>
              {(isActive || (isPro && !isScanning)) && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.5 }}
                  animate={{ opacity: 1, y: -50, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onClick={() => onSignalClick(sig)}
                  className={`absolute left-1/2 -translate-x-1/2 p-2 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-2 cursor-pointer flex items-center gap-3 min-w-[140px] ${isPro ? 'bg-white border-orange-500' : 'bg-black border-neon-cyan shadow-[0_0_15px_#00F0FF33]'}`}
                >
                   <div className={`w-9 h-9 rounded-xl overflow-hidden border flex items-center justify-center shrink-0 ${isPro ? 'bg-orange-50 border-orange-100' : 'bg-white/5 border-white/10'}`}>
                      {sig.coachLogo ? (
                        <img src={sig.coachLogo} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <ShieldCheck size={18} className={isPro ? 'text-orange-500' : 'text-neon-cyan'} />
                      )}
                   </div>
                   <div className="text-left flex-1 min-w-0">
                      <p className={`text-[8px] font-black uppercase italic truncate leading-none mb-1 ${isPro ? 'text-gray-900' : 'text-white'}`}>{sig.coachClub}</p>
                      <div className="flex items-center gap-1.5">
                         <span className={`text-[6px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${isPro ? 'bg-orange-500 text-white' : 'bg-neon-cyan text-black'}`}>{sig.type}</span>
                         <span className={`text-[6px] font-black opacity-50 uppercase ${isPro ? 'text-gray-500' : 'text-gray-400'}`}>{sig.category}</span>
                      </div>
                   </div>
                   <div className={`absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] ${isPro ? 'border-t-orange-500' : 'border-t-neon-cyan'}`} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* LE BLIP (Point) */}
            <div
              onClick={() => onSignalClick(sig)}
              className={`w-5 h-5 rounded-full border-2 border-white/60 shadow-xl cursor-pointer transition-all duration-300 flex items-center justify-center ${isActive ? 'scale-125 z-50' : 'scale-100'}`}
              style={{ backgroundColor: sig.status === 'OPEN' ? accentColor : '#39FF14' }}
            >
               {isActive && <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: accentColor }} />}
               {!isPro && sig.coachLogo && <img src={sig.coachLogo} className="w-full h-full object-cover rounded-full opacity-30" />}
            </div>
          </div>
        );
      })}

      {/* Point Central (L'utilisateur) */}
      <div className="relative w-10 h-10 rounded-full z-40 border-4 border-black flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)]" style={{ backgroundColor: accentColor }}>
        <div className="absolute inset-0 rounded-full animate-pulse opacity-40" style={{ backgroundColor: accentColor }} />
        {isPro ? <MapPin size={18} className="text-white" /> : <ShieldCheck size={18} className="text-black" />}
      </div>
    </div>
  );
}
