'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Zap, Activity, Cpu, ArrowLeft, Crosshair } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VolleySandbox() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'classic' | 'bionic'>('classic');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showImpact, setShowImpact] = useState(false);
  const [showOnomatopoeia, setShowOnomatopoeia] = useState<string | null>(null);
  const router = useRouter();

  const COLORS = {
    cyan: '#00F0FF',
    orange: '#FF6B00',
    magenta: '#FF0066',
    green: '#39FF14'
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMode(prev => {
        const next = prev === 'classic' ? 'bionic' : 'classic';
        triggerMangaTransition(next);
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  function triggerMangaTransition(nextMode: 'classic' | 'bionic') {
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 500);

    if (nextMode === 'bionic') {
      setShowImpact(true);
      setShowOnomatopoeia('DON!!');
      setTimeout(() => setShowImpact(false), 800);
    } else {
      setShowOnomatopoeia('WHOOSH!');
    }
    setTimeout(() => setShowOnomatopoeia(null), 700);
  }

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 font-mono overflow-hidden">

      {/* FLASH TRANSITION */}
      <div className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-150 ${isTransitioning ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: mode === 'bionic' ? `${COLORS.cyan}22` : `${COLORS.orange}11` }}
      />

      {/* ZONE DE L'ANIMATION */}
      <div className={`relative w-full max-w-5xl aspect-video bg-[#050505] rounded-[3rem] border-2 overflow-hidden shadow-2xl ${mode === 'bionic' ? 'border-[#00F0FF]/40' : 'border-white/10'}`}>

        {/* IMAGE DU BUTEUR MANGA (SAUVEGARDÉE DANS /PUBLIC) */}
        <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${mode === 'bionic' ? 'grayscale brightness-[0.4] contrast-[1.5] scale-105' : 'filter-none scale-100'}`}>
          <img
            src="/manga-striker.png"
            className="w-full h-full object-cover object-center"
            alt="Manga Striker"
          />
        </div>

        {/* ANALYSE BIONIQUE (Mode Bionic) */}
        <div className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${mode === 'bionic' ? 'opacity-100' : 'opacity-0'}`}>

          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />

          {/* Squelette calé sur la pose Manga */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600">
            <g className="fill-none stroke-[2.5]" style={{ stroke: COLORS.cyan }}>
               {/* Articulations du corps en extension */}
               <path d="M715,245 L600,280 L550,420" /> {/* Tête -> Buste -> Hanche */}
               <path d="M600,280 L480,310 L440,320" strokeDasharray="5 5" /> {/* Bras */}

               {/* Jambe de frappe (Impact à gauche) */}
               <path d="M550,420 L400,380 L280,240" style={{ stroke: COLORS.orange, strokeWidth: 5, filter: `drop-shadow(0 0 10px ${COLORS.orange})` }} />

               {/* Croix de précision (Steve Austin style) */}
               <g style={{ stroke: COLORS.orange }}>
                  <path d="M270,240 L290,240 M280,230 L280,250" strokeWidth="4" />
                  <circle cx="280" cy="240" r="15" className="animate-ping" />
               </g>
            </g>

            {/* Trajectoire Balistique Néon */}
            <path d="M280,240 L50,80" stroke={COLORS.green} strokeWidth="2" strokeDasharray="10 5" style={{ animation: 'dash 1s linear infinite' }} />
          </svg>

          {/* HUD DATA LATÉRAL */}
          <div className="absolute top-20 right-10 space-y-4">
             <div className="bg-black/80 border-r-4 p-4 text-right backdrop-blur-xl" style={{ borderRightColor: COLORS.cyan }}>
                <p className="text-[8px] text-gray-500 font-black tracking-widest uppercase">Target_Lock</p>
                <p className="text-xl font-black text-white italic">POTEAU_DROIT</p>
             </div>
             <div className="bg-black/80 border-r-4 p-4 text-right backdrop-blur-xl" style={{ borderRightColor: COLORS.magenta }}>
                <p className="text-[8px] text-gray-500 font-black tracking-widest uppercase">Impact_Force</p>
                <p className="text-xl font-black text-white italic">140 <span className="text-xs" style={{ color: COLORS.magenta }}>G_FORCE</span></p>
             </div>
          </div>

          {/* Viseur bionique sur le ballon */}
          <div className="absolute top-[28%] left-[23%] -translate-x-1/2 -translate-y-1/2">
             <div className="w-40 h-40 border-2 rounded-full animate-spin-slow opacity-20" style={{ borderColor: COLORS.cyan }} />
             <Crosshair size={60} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: COLORS.orange }} />
          </div>
        </div>

        {/* ONOMATOPÉES MANGA */}
        <div className={`absolute inset-0 pointer-events-none z-30 flex items-center justify-center transition-opacity duration-300 ${showOnomatopoeia ? 'opacity-100' : 'opacity-0'}`}>
           <span className="text-9xl font-black italic tracking-tighter"
             style={{
               color: 'white',
               WebkitTextStroke: `4px ${mode === 'bionic' ? COLORS.cyan : COLORS.orange}`,
               filter: `drop-shadow(0 0 30px ${mode === 'bionic' ? COLORS.cyan : COLORS.orange}66)`
             }}>
             {showOnomatopoeia}
           </span>
        </div>

        {/* TEXTE EXPLICATIF */}
        <div className="absolute bottom-12 left-12 text-left z-20">
           <h3 className="text-5xl font-black italic uppercase tracking-tighter leading-none mb-3 text-white">
             {mode === 'classic' ? "L'Instinct" : <span style={{ color: COLORS.cyan }}>La Donn\u00E9e</span>}
             <br/>
             <span style={{ color: mode === 'classic' ? COLORS.orange : 'white' }}>
               {mode === 'classic' ? 'HUMAIN' : 'BIONIQUE'}
             </span>
           </h3>
        </div>
      </div>

      <style jsx>{`
        @keyframes dash { to { stroke-dashoffset: -100; } }
        .animate-spin-slow { animation: spin 6s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
