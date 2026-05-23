'use client';

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Users,
  Target,
  Activity,
  Shield,
  ArrowRight,
  Cpu,
  Wifi,
  Zap,
  Plus,
  Star,
  Brain,
  Flame,
  Layout,
  Gamepad2,
  Crosshair
} from "lucide-react";
import { GlitchText } from "@/components/ui/cyber/GlitchText";
import { NeonButton } from "@/components/ui/cyber/NeonButton";
import { ScanlinesOverlay } from "@/components/ui/cyber/ScanlinesOverlay";

const features = [
  {
    title: "Gestion_Unité",
    desc: "Synchronisez votre team, profilez vos joueurs, définissez vos tactiques Nexus. Données biométriques en temps réel.",
    icon: (color: string) => <Users size={24} className={color} />,
    runnerColor: "border-neon-cyan/30",
    classicColor: "border-neon-orange/30"
  },
  {
    title: "Scan_Secteur",
    desc: "Détectez des adversaires via le Radar Sonar. Filtrez par périmètre, niveau de menace et disponibilité immédiate.",
    icon: (color: string) => <Target size={24} className={color} />,
    runnerColor: "border-neon-magenta/30",
    classicColor: "border-neon-orange/30"
  },
  {
    title: "Briefing_Mission",
    desc: "Restez informé : flux de données secteur, interceptions radio et logs de mission de la communauté.",
    icon: (color: string) => <Activity size={24} className={color} />,
    runnerColor: "border-neon-cyan/30",
    classicColor: "border-neon-orange/30"
  },
  {
    title: "Analyses_Avancées",
    desc: "Suivez l'évolution : Buts, Passes, Synchronisation d'unité. Visualisez le potentiel avant l'Upload Sync.",
    icon: (color: string) => <Cpu size={24} className={color} />,
    runnerColor: "border-neon-green/30",
    classicColor: "border-neon-orange/30"
  },
];

const stats = [
  { value: "10K+", label: "Unités_Liées" },
  { value: "50K+", label: "Missions_Logs" },
  { value: "100K+", label: "Agents_Actifs" },
  { value: "200+", label: "Secteurs_Cartographiés" },
];

const testimonials = [
  {
    text: "FOOTCOACH ALPHA a totalement transformé ma gestion d'équipe. La synchronisation d'unité est un vrai game-changer.",
    author: "Coach Marc",
    role: "U17 District",
    avatar: "M"
  },
  {
    text: "L'interface Nexus est incroyable, mes joueurs adorent voir leurs stats monter comme dans un RPG.",
    author: "Coach Sarah",
    role: "Seniors R1",
    avatar: "S"
  },
  {
    text: "Simple, rapide et gratuit. C'est l'outil que j'attendais pour mon club depuis des années.",
    author: "Coach Thomas",
    role: "U13 Elite",
    avatar: "T"
  }
];

export default function ShowcasePage() {
  const router = useRouter();
  const [activeTheme, setActiveTheme] = useState<'classic' | 'nexus'>('classic');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // CAPTURE DU CODE COACH (Lien Nexus)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');
      if (refCode) {
        localStorage.setItem('pending_coach_code', refCode.toUpperCase());
        console.log('--- NEXUS_SIGNAL_CAPTURED : ' + refCode.toUpperCase() + ' ---');
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const interval = setInterval(() => {
      setActiveTheme(prev => prev === 'nexus' ? 'classic' : 'nexus');
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearInterval(interval);
    };
  }, []);

  const handleDownloadAction = async () => {
    // 1. Vérification de l'état de l'utilisateur
    const hasRole = localStorage.getItem('user_role');

    if (hasRole) {
      // Utilisateur connu -> Direction le Dashboard
      router.push('/dashboard');
    } else {
      // Nouvel utilisateur -> Direction le Login/Register
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      }
      router.push('/login');
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-neon-cyan selection:text-black relative overflow-x-hidden transition-colors duration-1000">
      {activeTheme === 'nexus' && <ScanlinesOverlay />}
      <StadiumNeon theme={activeTheme} />

      {/* ── HEADER ── */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-black/50 backdrop-blur-md border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button onClick={() => router.push('/onboarding')} className={`flex items-center gap-2 font-black uppercase text-[10px] tracking-widest group transition-colors duration-700 ${activeTheme === 'nexus' ? 'text-neon-cyan' : 'text-neon-orange'}`}>
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            ANNULER_MISSION
          </button>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <span className={`text-[8px] font-black uppercase tracking-widest ${activeTheme === 'classic' ? 'text-neon-orange' : 'text-gray-500'}`}>CLASSIQUE</span>
                <div className="w-8 h-4 bg-gray-800 rounded-full relative p-1 cursor-pointer" onClick={() => setActiveTheme(activeTheme === 'nexus' ? 'classic' : 'nexus')}>
                   <div className={`absolute top-1 w-2 h-2 rounded-full transition-all duration-500 ${activeTheme === 'nexus' ? 'left-5 bg-neon-cyan shadow-[0_0_8px_#00F0FF]' : 'left-1 bg-neon-orange'}`} />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest ${activeTheme === 'nexus' ? 'text-neon-cyan' : 'text-gray-500'}`}>NEXUS</span>
             </div>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[100vh] lg:min-h-[90vh] flex items-center pt-20 lg:pt-0 overflow-hidden">
        <div className="absolute inset-0 z-0 transition-opacity duration-1000">
          <img
            src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000&auto=format&fit=crop"
            className={`w-full h-full object-cover transition-all duration-1000 ${activeTheme === 'nexus' ? 'opacity-20 grayscale contrast-125' : 'opacity-30 grayscale sepia-[0.3]'}`}
            alt="Stadium"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black to-black lg:bg-gradient-to-r lg:from-black lg:via-black/80 lg:to-transparent" />
        </div>

        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10 w-full">
           <div className="space-y-6 lg:space-y-8 text-center lg:text-left pt-10 lg:pt-0">
              <div className="space-y-4">
                 <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] lg:text-[10px] font-black tracking-[0.3em] uppercase transition-all duration-700 ${activeTheme === 'nexus' ? 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan' : 'bg-neon-orange/10 border-neon-orange/30 text-neon-orange'}`}>
                    {activeTheme === 'nexus' ? <Zap size={12} fill="currentColor" /> : <Shield size={12} fill="currentColor" />}
                    {activeTheme === 'nexus' ? 'MODE_NEXUS_ACTIF' : 'MODE_CLASSIQUE_ACTIF'}
                 </div>

                 <h1 className="text-6xl md:text-6xl lg:text-8xl font-black italic uppercase tracking-tighter leading-[0.9] text-white transition-all duration-1000">
                   <span className="block text-white">COMMUNIQUEZ.</span>
                   <span className={`block drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-colors duration-1000 ${activeTheme === 'nexus' ? 'text-neon-cyan' : 'text-neon-orange'}`}>MANAGEZ.</span>
                   <span className="block text-white">ÉQUIPEZ.</span>
                 </h1>

                 <div className={`max-w-md mx-auto lg:mx-0 p-4 border-l-4 bg-white/5 backdrop-blur-md transition-all duration-700 ${activeTheme === 'nexus' ? 'border-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.1)]' : 'border-neon-orange'}`}>
                    <p className="text-gray-300 text-xs lg:text-base font-medium leading-relaxed uppercase tracking-wider">
                      L'outil tactique ultime <span className={`font-black transition-colors duration-700 ${activeTheme === 'nexus' ? 'text-neon-cyan' : 'text-neon-orange'}`}>100% GRATUIT</span>.
                    </p>
                 </div>
              </div>

              <div className="flex flex-col gap-6 pt-6 justify-center lg:justify-start">
                 <div className="relative group">
                    <div className={`absolute -inset-1 rounded-xl blur opacity-30 group-hover:opacity-100 animate-pulse transition duration-1000 ${activeTheme === 'nexus' ? 'bg-neon-cyan' : 'bg-neon-orange'}`}></div>
                    <button onClick={handleDownloadAction} className={`relative w-full sm:w-auto flex items-center justify-center gap-3 py-6 px-12 text-base font-black uppercase italic rounded-xl transition-all shadow-xl ${activeTheme === 'nexus' ? 'bg-neon-cyan text-black' : 'bg-neon-orange text-black'}`}>
                       <Users size={20} fill="black" /> SE CONNECTER / COMMENCER
                    </button>
                 </div>
              </div>
           </div>

           {/* ── BIONIC VOLLEY ANIMATION INTEGRATION ── */}
           <div className="relative hidden lg:block">
              <div className={`absolute inset-0 blur-[120px] rounded-full animate-pulse transition-colors duration-1000 ${activeTheme === 'nexus' ? 'bg-neon-cyan/20' : 'bg-neon-orange/10'}`} />
              <div className="relative transform hover:scale-[1.02] transition-transform duration-700">
                <BionicVolleyAnimation theme={activeTheme} />
              </div>
           </div>
        </div>
      </section>

      {/* ── STATS GRID ── */}
      <section className="py-12 lg:py-20 px-6 relative z-10 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <StatCard key={i} {...s} theme={activeTheme} />
          ))}
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section className="py-20 lg:py-32 px-6 relative z-10" id="features">
        <div className="max-w-4xl mx-auto space-y-12 lg:space-y-20">
          <div className="text-center lg:text-left space-y-4">
             <h2 className={`text-2xl lg:text-3xl font-black uppercase italic tracking-tighter transition-colors duration-700 ${activeTheme === 'nexus' ? 'text-white' : 'text-neon-orange'}`}>Capacités_Système</h2>
             <div className={`w-20 h-1 mx-auto lg:mx-0 transition-all duration-700 ${activeTheme === 'nexus' ? 'bg-neon-cyan shadow-[0_0_10px_#00F0FF]' : 'bg-neon-orange shadow-[0_0_10px_#FF6B00]'}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
            {features.map((f, i) => (
              <div key={i} className={`p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2.5rem] bg-[#050505] border-2 shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-700 ${activeTheme === 'nexus' ? f.runnerColor : f.classicColor}`}>
                <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform text-white">
                   {f.icon(activeTheme === 'nexus' ? 'text-white' : 'text-neon-orange')}
                </div>
                <div className="relative z-10 space-y-4">
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 bg-white/5 rounded-xl lg:rounded-2xl flex items-center justify-center border border-white/10 transition-colors duration-700 ${activeTheme === 'nexus' ? 'text-neon-cyan' : 'text-neon-orange'}`}>
                    {f.icon("")}
                  </div>
                  <h3 className="text-lg lg:text-xl font-black text-white uppercase italic tracking-tight">{f.title}</h3>
                  <p className="text-[10px] lg:text-xs text-gray-500 font-medium leading-relaxed uppercase tracking-wider">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TUTORIEL INSTALLATION ── */}
      <section className="py-20 lg:py-32 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="flex flex-col items-center gap-6">
             <div className="flex justify-center gap-20">
                <ArrowRight size={80} className="text-neon-orange rotate-90 animate-bounce" strokeWidth={3} />
                <ArrowRight size={80} className="text-neon-orange rotate-90 animate-bounce" strokeWidth={3} />
             </div>
             <div className="space-y-2">
                <h2 className={`text-3xl lg:text-5xl font-black uppercase italic tracking-tighter ${activeTheme === 'nexus' ? 'text-white' : 'text-neon-orange'}`}>
                   Télécharge l'application
                </h2>
                <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-xs">Protocole d'installation Nexus</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10">
             {/* APPLE TUTO */}
             <div className="bg-white/5 border-2 border-white/10 p-8 rounded-[2.5rem] space-y-6 text-left relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                   <Gamepad2 size={80} />
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-white text-black rounded-xl flex items-center justify-center shadow-xl">
                      <Plus size={24} strokeWidth={3} />
                   </div>
                   <h3 className="text-xl font-black uppercase italic text-white">Sur Apple / iOS</h3>
                </div>
                <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                   <li className="flex items-start gap-3"><span className="text-neon-orange">01.</span> Ouvre Safari sur teamnexus.fr</li>
                   <li className="flex items-start gap-3"><span className="text-neon-orange">02.</span> Appuie sur le bouton "Partager" (carré avec flèche)</li>
                   <li className="flex items-start gap-3"><span className="text-neon-orange">03.</span> Sélectionne "Sur l'écran d'accueil"</li>
                </ul>
             </div>

             {/* ANDROID TUTO */}
             <div className="bg-white/5 border-2 border-white/10 p-8 rounded-[2.5rem] space-y-6 text-left relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                   <Layout size={80} />
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-[#39FF14] text-black rounded-xl flex items-center justify-center shadow-xl">
                      <Plus size={24} strokeWidth={3} />
                   </div>
                   <h3 className="text-xl font-black uppercase italic text-white">Sur Android / Chrome</h3>
                </div>
                <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                   <li className="flex items-start gap-3"><span className="text-neon-cyan">01.</span> Ouvre Chrome sur teamnexus.fr</li>
                   <li className="flex items-start gap-3"><span className="text-neon-cyan">02.</span> Appuie sur les 3 points en haut à droite</li>
                   <li className="flex items-start gap-3"><span className="text-neon-cyan">03.</span> Sélectionne "Installer l'application"</li>
                </ul>
             </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ── */}
      <section className="py-20 lg:py-32 px-6 relative z-10 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto space-y-12 lg:space-y-16">
          <div className="text-center space-y-4">
             <h2 className={`text-2xl lg:text-3xl font-black uppercase italic tracking-tighter transition-colors duration-700 ${activeTheme === 'nexus' ? 'text-white' : 'text-neon-orange'}`}>Échos_du_Terrain</h2>
             <p className="text-[9px] lg:text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">Retours_d_expérience_coachs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className={`p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2rem] bg-black border-2 transition-all duration-700 hover:scale-[1.02] ${activeTheme === 'nexus' ? 'border-neon-cyan/20 bg-neon-cyan/5' : 'border-neon-orange/20 bg-neon-orange/5'}`}>
                <div className="flex items-center gap-4 mb-4 lg:mb-6">
                   <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-black text-[10px] lg:text-xs border ${activeTheme === 'nexus' ? 'border-neon-cyan text-neon-cyan' : 'border-neon-orange text-neon-orange'}`}>
                      {t.avatar}
                   </div>
                   <div>
                      <p className="text-[10px] lg:text-[11px] font-black text-white uppercase italic">{t.author}</p>
                      <p className={`text-[7px] lg:text-[8px] font-bold uppercase tracking-widest ${activeTheme === 'nexus' ? 'text-neon-cyan/60' : 'text-neon-orange/60'}`}>{t.role}</p>
                   </div>
                </div>
                <p className="text-[10px] lg:text-xs text-gray-400 font-medium leading-relaxed italic uppercase tracking-wider">
                  "{t.text}"
                </p>
                <div className="mt-4 lg:mt-6 flex gap-1">
                   {[1,2,3,4,5].map(star => (
                     <Star key={star} size={10} className={activeTheme === 'nexus' ? 'text-neon-cyan fill-neon-cyan' : 'text-neon-orange fill-neon-orange'} />
                   ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-16 lg:py-20 px-6 border-t border-white/5 text-center relative z-10">
         <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-xl lg:text-2xl font-black text-white uppercase italic tracking-tighter">Prêt_à_Rejoindre_le_Réseau ?</h2>
            <NeonButton variant={activeTheme === 'nexus' ? 'cyan' : 'orange'} size="lg" onClick={handleDownloadAction} className="w-full sm:w-auto">
               {activeTheme === 'nexus' ? 'INITIALISER_UNITÉ_MAINTENANT' : 'DÉMARRER LA SAISON'}
            </NeonButton>
            <p className="text-[7px] lg:text-[8px] font-mono text-gray-700 uppercase tracking-[0.4em] mt-10">FootCoach ALPHA TEST v1 // Fin de Transmission</p>
         </div>
      </footer>

      <style jsx>{`
        @keyframes dash {
          to { stroke-dashoffset: -100; }
        }
      `}</style>
    </main>
  );
}

/* ═══════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════ */

function BionicVolleyAnimation({ theme }: { theme: 'classic' | 'nexus' }) {
  const isBionic = theme === 'nexus';

  return (
    <div className="relative w-full aspect-video bg-[#050505] rounded-[2.5rem] border-2 border-white/10 overflow-hidden shadow-2xl group">
      <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${isBionic ? 'grayscale brightness-[0.3] contrast-150 scale-105' : 'filter-none scale-100'}`}>
        <img
          src="https://images.unsplash.com/photo-1552667466-07770ae110d0?q=80&w=1000&auto=format&fit=crop"
          className="w-full h-full object-cover object-center"
          alt="Soccer Action"
        />
      </div>

      <div className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${isBionic ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />

        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600">
          <g className="stroke-neon-cyan/80 stroke-[2] fill-none">
             <path d="M450,200 L500,280 L480,450" />
             <path d="M400,220 L500,280 L650,220" />
             <path d="M500,280 L620,380 L800,250" className="stroke-neon-orange" strokeWidth="4" />
             <g className="stroke-neon-orange stroke-1">
                <path d="M615,380 L625,380 M620,375 L620,385" />
                <path d="M795,250 L805,250 M800,245 L800,255" />
             </g>
             <path d="M580,360 A40,40 0 0,1 640,370" stroke="#00F0FF" strokeWidth="1" />
          </g>
          <g>
             <line x1="800" y1="250" x2="980" y2="50" stroke="#00F0FF" strokeWidth="1.5" strokeDasharray="10 5" className="animate-[dash_1.5s_linear_infinite]" />
             <g className="stroke-neon-magenta stroke-2">
                <path d="M960,40 L980,40 L980,60" fill="none" />
                <path d="M1000,60 L980,60 L980,80" fill="none" transform="rotate(180 980 60)" />
             </g>
          </g>
        </svg>

        <div className="absolute top-12 left-8 space-y-3">
           <div className="bg-black/80 border-l-2 border-neon-cyan p-2 backdrop-blur-md">
              <p className="text-[6px] text-gray-500 font-bold uppercase tracking-widest">Impact_Force</p>
              <p className="text-lg font-black text-white italic">2.4 <span className="text-neon-cyan text-[8px]">KN</span></p>
           </div>
           <div className="bg-black/80 border-l-2 border-neon-orange p-2 backdrop-blur-md">
              <p className="text-[6px] text-gray-500 font-bold uppercase tracking-widest">Efficiency</p>
              <p className="text-lg font-black text-white italic">MAX</p>
           </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-8 text-right z-20">
         <p className={`text-2xl font-black italic uppercase tracking-tighter leading-none transition-colors duration-700 ${isBionic ? 'text-neon-cyan' : 'text-white'}`}>
           {isBionic ? 'DONNÉE_BIONIQUE' : 'INSTINCT_HUMAIN'}
         </p>
      </div>
    </div>
  );
}

function StatCard({ value, label, theme }: { value: string; label: string; theme: 'classic' | 'nexus' }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !counted.current) {
        counted.current = true;
        const numMatch = value.match(/\d+/);
        if (!numMatch) return;
        const end = parseInt(numMatch[0]);
        const suffix = value.replace(/\d+/, "");
        const startTime = performance.now();
        const duration = 1500;
        function tick(now: number) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(end * eased);
          setDisplay(current.toLocaleString("en-US") + suffix);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return (
    <div className={`bg-[#050505] border rounded-2xl p-6 text-center shadow-xl transition-all duration-700 ${theme === 'nexus' ? 'border-white/5 hover:border-neon-cyan/30' : 'border-neon-orange/10 hover:border-neon-orange/40'}`}>
      <span className={`block text-2xl font-black font-mono mb-1 transition-colors duration-700 ${theme === 'nexus' ? 'text-white group-hover:text-neon-cyan' : 'text-neon-orange'}`} ref={ref}>
        {display}
      </span>
      <span className="block text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] font-mono">
        {label}
      </span>
    </div>
  );
}

function StadiumNeon({ theme }: { theme: 'classic' | 'nexus' }) {
  const colorClass = theme === 'nexus' ? 'border-neon-green/30 shadow-neon-green/10' : 'border-neon-orange/20 shadow-neon-orange/5';
  const lineClass = theme === 'nexus' ? 'bg-neon-green/20' : 'bg-neon-orange/10';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 transition-all duration-1000">
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] border-[1px] rounded-full transition-all duration-1000 ${colorClass}`} />
      <div className={`absolute top-1/2 left-0 w-full h-[1px] transition-all duration-1000 ${lineClass}`} />
      <div className={`absolute top-0 left-1/2 w-[1px] h-full transition-all duration-1000 ${lineClass}`} />
    </div>
  );
}

