'use client';

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import {
  Users,
  Target,
  Activity,
  Cpu,
  Shield,
  Zap,
  ArrowDown,
  Smartphone,
  Share,
  MoreVertical,
  Star,
  StarHalf,
  Check,
} from "lucide-react";

type Theme = 'classic' | 'nexus';

/* Un seul accent sémantique par thème (cohérence chromatique). */
const accent = (theme: Theme) => ({
  text: theme === 'nexus' ? 'text-neon-cyan' : 'text-neon-orange',
  bg: theme === 'nexus' ? 'bg-neon-cyan' : 'bg-neon-orange',
  border: theme === 'nexus' ? 'border-neon-cyan/30' : 'border-neon-orange/30',
  ring: theme === 'nexus' ? 'border-neon-cyan/40' : 'border-neon-orange/40',
  softBg: theme === 'nexus' ? 'bg-neon-cyan/10' : 'bg-neon-orange/10',
  glow: theme === 'nexus' ? 'shadow-lg shadow-teal-900/20' : 'shadow-lg shadow-orange-900/20',
});

const features = [
  {
    title: "Gestion d'unité",
    desc: "Synchronisez votre équipe, profilez vos joueurs et définissez vos tactiques en un seul endroit.",
    icon: Users,
  },
  {
    title: "Scan du secteur",
    desc: "Détectez des adversaires via le radar. Filtrez par périmètre, niveau et disponibilité immédiate.",
    icon: Target,
  },
  {
    title: "Briefing de mission",
    desc: "Restez informé : flux du secteur, échanges et journaux de la communauté en temps réel.",
    icon: Activity,
  },
  {
    title: "Analyses avancées",
    desc: "Suivez la progression : buts, passes, cohésion d'équipe. Visualisez le potentiel de chacun.",
    icon: Cpu,
  },
];

const stats = [
  { value: "10K+", label: "Unités liées" },
  { value: "50K+", label: "Missions jouées" },
  { value: "100K+", label: "Coachs actifs", highlight: true },
  { value: "200+", label: "Secteurs couverts" },
];

const testimonials = [
  {
    text: "FootCoach a totalement transformé ma gestion d'équipe. La synchronisation est un vrai game-changer.",
    author: "Coach Marc",
    club: "FC Vénissieux · U17",
    avatar: "M",
    rating: 5,
  },
  {
    text: "L'interface est superbe et mes joueurs adorent voir leurs statistiques progresser comme dans un jeu.",
    author: "Coach Sarah",
    club: "AS Minguettes · Seniors R1",
    avatar: "S",
    rating: 4.5,
  },
  {
    text: "Simple, rapide et gratuit. C'est l'outil que j'attendais pour mon club depuis des années.",
    author: "Coach Thomas",
    club: "OL Sud · U13",
    avatar: "T",
    rating: 5,
  },
];

export default function ShowcasePage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>('classic');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const a = accent(theme);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');
      if (refCode) localStorage.setItem('pending_coach_code', refCode.toUpperCase());
    }
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleStart = async () => {
    const hasRole = localStorage.getItem('user_role');
    if (hasRole) { router.push('/dashboard'); return; }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
    router.push('/register');
  };

  const toggleTheme = () => setTheme(t => (t === 'nexus' ? 'classic' : 'nexus'));

  return (
    <main className="min-h-screen bg-[#15171C] text-white font-sans selection:bg-neon-cyan selection:text-black relative overflow-x-hidden">
      <StadiumBackdrop theme={theme} />

      {/* ── HEADER ── */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#15171C]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon.svg" alt="FootCoach" className="w-8 h-8 rounded-lg" />
            <span className="font-black uppercase italic text-sm tracking-tight text-white">FootCoach</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className={`text-[8px] font-black uppercase tracking-widest ${theme === 'classic' ? a.text : 'text-gray-500'}`}>Classique</span>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'nexus'}
              aria-label="Basculer le thème Nexus"
              onClick={toggleTheme}
              className="w-9 h-5 bg-gray-800 rounded-full relative shrink-0"
            >
              <span className={`absolute top-1 w-3 h-3 rounded-full transition-all duration-300 ${theme === 'nexus' ? 'left-5 bg-neon-cyan' : 'left-1 bg-neon-orange'}`} />
            </button>
            <span className={`text-[8px] font-black uppercase tracking-widest ${theme === 'nexus' ? a.text : 'text-gray-500'}`}>Nexus</span>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex items-center min-h-[92vh] pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000&auto=format&fit=crop"
            className={`w-full h-full object-cover ${theme === 'nexus' ? 'opacity-15 grayscale contrast-125' : 'opacity-25 grayscale sepia-[0.3]'}`}
            alt=""
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/90 to-black lg:bg-gradient-to-r lg:from-black lg:via-black/85 lg:to-black/40" />
        </div>

        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center relative z-10 w-full">
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black tracking-[0.25em] uppercase ${a.softBg} ${a.border} ${a.text}`}>
              {theme === 'nexus' ? <Zap size={12} fill="currentColor" aria-hidden="true" /> : <Shield size={12} fill="currentColor" aria-hidden="true" />}
              {theme === 'nexus' ? 'Mode Nexus' : 'Mode Classique'}
            </div>

            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-black italic uppercase tracking-tighter leading-[0.95]"
              aria-label="Communiquez. Managez. Équipez."
            >
              <span aria-hidden="true">
                <TypewriterHeadline
                  lines={[
                    { text: 'Communiquez.' },
                    { text: 'Managez.', className: a.text },
                    { text: 'Équipez.' },
                  ]}
                />
              </span>
            </h1>

            <p className="max-w-md mx-auto lg:mx-0 text-gray-300 text-base leading-relaxed">
              L'outil tactique ultime pour piloter votre club amateur.{' '}
              <span className={`font-black ${a.text}`}>100&nbsp;% gratuit</span>, sans publicité.
            </p>

            <div className="flex flex-col items-center lg:items-start gap-4 pt-2">
              <button
                onClick={handleStart}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-3 py-5 px-10 text-base font-black uppercase italic rounded-xl text-black ${a.bg} ${a.glow} active:scale-95 transition-transform`}
              >
                Commencer gratuitement
              </button>
              <button
                onClick={() => router.push('/login')}
                className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
              >
                Déjà inscrit ? <span className={a.text}>Se connecter</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 hidden lg:block">
            <PreviewCard theme={theme} />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="w-full bg-white/[0.03] border-y border-white/10 py-14">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {stats.map((s, i) => (
              <StatCard key={i} {...s} theme={theme} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="w-full py-20 lg:py-28 px-6" id="features">
        <div className="max-w-5xl mx-auto">
          <div className="text-center lg:text-left space-y-4 mb-14">
            <h2 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter">Capacités du système</h2>
            <div className={`w-20 h-1 mx-auto lg:mx-0 ${a.bg} ${a.glow}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className={`p-7 lg:p-8 rounded-[1.75rem] bg-[#1D2027] border-2 ${a.border} hover:-translate-y-1 transition-transform duration-300`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 bg-white/5 mb-5 ${a.text}`}>
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── INSTALLATION ── */}
      <section className="w-full py-20 lg:py-28 px-6 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center text-center gap-4 mb-14">
            <ArrowDown size={40} className={`${a.text} animate-bounce`} strokeWidth={3} aria-hidden="true" />
            <h2 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter">Installez l'application</h2>
            <p className="text-gray-500 font-bold uppercase tracking-[0.25em] text-xs">Ajoutez FootCoach à votre écran d'accueil</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InstallCard
              theme={theme}
              platform="Sur iPhone (Safari)"
              steps={[
                <>Ouvrez le site dans <b className="text-white">Safari</b></>,
                <>Appuyez sur <b className="text-white">Partager</b> <Share size={13} className="inline align-middle" aria-hidden="true" /></>,
                <>Choisissez <b className="text-white">« Sur l'écran d'accueil »</b></>,
              ]}
            />
            <InstallCard
              theme={theme}
              platform="Sur Android (Chrome)"
              steps={[
                <>Ouvrez le site dans <b className="text-white">Chrome</b></>,
                <>Appuyez sur le menu <MoreVertical size={13} className="inline align-middle" aria-hidden="true" /> (trois points)</>,
                <>Choisissez <b className="text-white">« Installer l'application »</b></>,
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section className="w-full py-20 lg:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-4 mb-14">
            <h2 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter">Échos du terrain</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.25em]">Ce qu'en disent les coachs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <figure key={i} className={`p-7 rounded-[1.5rem] bg-[#1D2027] border-2 ${a.border}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border ${a.ring} ${a.text} shrink-0`} aria-hidden="true">
                    {t.avatar}
                  </div>
                  <figcaption>
                    <p className="text-sm font-black text-white uppercase italic leading-tight">{t.author}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{t.club}</p>
                  </figcaption>
                </div>
                <StarRating rating={t.rating} theme={theme} />
                <blockquote className="mt-4 text-sm text-gray-300 leading-relaxed italic">« {t.text} »</blockquote>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="w-full py-20 lg:py-28 px-6 bg-white/[0.03] border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-black text-white uppercase italic tracking-tighter">Prêt à rejoindre le réseau ?</h2>
          <p className="text-gray-400">Rejoignez la communauté des coachs et pilotez votre saison dès aujourd'hui.</p>
          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              onClick={handleStart}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-3 py-6 px-14 text-lg font-black uppercase italic rounded-xl text-black ${a.bg} ${a.glow} active:scale-95 transition-transform`}
            >
              Démarrer la saison
            </button>
            <p className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${a.text}`}>
              <Check size={13} aria-hidden="true" /> 100&nbsp;% gratuit, sans engagement
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="w-full py-14 px-6 border-t border-white/10 text-center">
        <div className="max-w-5xl mx-auto space-y-4">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] font-bold uppercase tracking-widest text-gray-500">
            <button onClick={() => router.push('/login')} className="hover:text-white transition-colors">Connexion</button>
            <a href="mailto:contact@footcoach.app" className="hover:text-white transition-colors">Contact</a>
            <a href="/showcase" className="hover:text-white transition-colors">Mentions légales</a>
          </nav>
          <p className="text-[8px] font-mono text-gray-700 uppercase tracking-[0.4em]">
            FootCoach Alpha Test v1 · © 2026 · Fin de transmission
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes dash { to { stroke-dashoffset: -100; } }
      `}</style>
    </main>
  );
}

/* ═══════════════ SUB-COMPONENTS ═══════════════ */

function TypewriterHeadline({ lines }: { lines: { text: string; className?: string }[] }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (reduceMotion || lineIndex >= lines.length) return;
    const current = lines[lineIndex].text;
    if (charIndex < current.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 55);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLineIndex((l) => l + 1);
      setCharIndex(0);
    }, 350);
    return () => clearTimeout(t);
  }, [charIndex, lineIndex, reduceMotion, lines]);

  const finished = reduceMotion || lineIndex >= lines.length;

  return (
    <>
      {lines.map((l, i) => {
        const cls = `block ${l.className || ''}`;
        if (finished || i < lineIndex) {
          return <span key={i} className={cls}>{l.text}</span>;
        }
        if (i === lineIndex) {
          return (
            <span key={i} className={cls}>
              {l.text.slice(0, charIndex)}
              <span className="inline-block w-[3px] md:w-[4px] h-[0.8em] bg-current ml-1 align-middle animate-pulse" />
            </span>
          );
        }
        return <span key={i} className={`${cls} invisible`}>{l.text}</span>;
      })}
    </>
  );
}

function StarRating({ rating, theme }: { rating: number; theme: Theme }) {
  const a = accent(theme);
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`Note : ${rating} sur 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        if (i < full) return <Star key={i} size={13} className={`${a.text} fill-current`} aria-hidden="true" />;
        if (i === full && half) return <StarHalf key={i} size={13} className={`${a.text} fill-current`} aria-hidden="true" />;
        return <Star key={i} size={13} className="text-gray-700" aria-hidden="true" />;
      })}
    </div>
  );
}

function InstallCard({ theme, platform, steps }: { theme: Theme; platform: string; steps: React.ReactNode[] }) {
  const a = accent(theme);
  return (
    <div className="bg-[#1D2027] border-2 border-white/10 p-8 rounded-[1.75rem]">
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 ${a.text}`}>
          <Smartphone size={22} aria-hidden="true" />
        </div>
        <h3 className="text-lg font-black uppercase italic text-white">{platform}</h3>
      </div>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-gray-400 leading-relaxed">
            <span className={`font-black shrink-0 ${a.text}`}>{String(i + 1).padStart(2, '0')}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StatCard({ value, label, theme, highlight }: { value: string; label: string; theme: Theme; highlight?: boolean }) {
  const a = accent(theme);
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setDisplay(value); return; }
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
          const progress = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(end * eased).toLocaleString("en-US") + suffix);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return (
    <div className={`rounded-2xl p-6 text-center border-2 ${highlight ? `${a.ring} ${a.softBg}` : 'border-white/10 bg-[#1D2027]'}`}>
      <span
        ref={ref}
        className={`block font-black font-mono mb-1 ${highlight ? `text-3xl lg:text-4xl ${a.text}` : 'text-2xl text-white'}`}
      >
        {display}
      </span>
      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</span>
    </div>
  );
}

function PreviewCard({ theme }: { theme: Theme }) {
  const a = accent(theme);
  return (
    <div className={`relative rounded-[2rem] border-2 ${a.border} bg-[#1D2027] overflow-hidden shadow-2xl`}>
      <div className="aspect-[4/3] relative">
        <img
          src="https://images.unsplash.com/photo-1552667466-07770ae110d0?q=80&w=1000&auto=format&fit=crop"
          className={`w-full h-full object-cover ${theme === 'nexus' ? 'grayscale brightness-[0.4] contrast-125' : 'brightness-[0.7]'}`}
          alt=""
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Aperçu produit : mini fiche joueur */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${a.softBg} ${a.text}`}>
            Aperçu · Fiche joueur
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Milieu · N°8</p>
              <p className="text-base font-black text-white uppercase italic leading-tight">L. Bernard</p>
            </div>
            <div className={`text-3xl font-black italic ${a.text}`}>84</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[['VIT', 82], ['TEC', 87], ['PHY', 79]].map(([k, v]) => (
              <div key={k as string}>
                <div className="flex justify-between text-[8px] font-bold uppercase text-gray-400 mb-1">
                  <span>{k}</span><span className="text-white">{v}</span>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full ${a.bg}`} style={{ width: `${v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StadiumBackdrop({ theme }: { theme: Theme }) {
  const line = theme === 'nexus' ? 'bg-neon-cyan/10' : 'bg-neon-orange/10';
  const ring = theme === 'nexus' ? 'border-neon-cyan/15' : 'border-neon-orange/15';
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30 -z-0">
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-w-[90vw] aspect-[8/5] border rounded-full ${ring}`} />
      <div className={`absolute top-1/2 left-0 w-full h-px ${line}`} />
    </div>
  );
}
