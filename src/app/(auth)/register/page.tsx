'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, User, ChevronRight, ArrowLeft, UsersRound, Heart, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

type Role = 'coach' | 'player' | 'parent' | 'supporter';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('coach');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const testConnection = async () => {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      if (error) console.log("❌ Erreur Supabase:", error.message);
      else console.log("✅ Connecté à Supabase ! Données:", data);
    };
    testConnection();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Inscription réelle à Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // 2. Préparation pour l'onboarding
      localStorage.setItem('pending_signup_email', email);
      localStorage.setItem('user_role', role);
      localStorage.setItem('is_authenticated', 'true');

      // 3. Rediriger vers l'onboarding pour finaliser le profil
      router.push('/onboarding');
    } catch (error: any) {
      alert("Erreur d'inscription : " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Configuration visuelle des rôles
  const roleConfig = {
    coach: { icon: Shield, label: 'Coach', color: 'neon-orange', border: 'border-neon-orange', bg: 'bg-neon-orange/10', shadow: 'shadow-neon-orange/20', text: 'text-neon-orange' },
    player: { icon: Zap, label: 'Joueur', color: 'neon-cyan', border: 'border-neon-cyan', bg: 'bg-neon-cyan/10', shadow: 'shadow-neon-cyan/20', text: 'text-neon-cyan' },
    parent: { icon: User, label: 'Parent', color: 'neon-magenta', border: 'border-neon-magenta', bg: 'bg-neon-magenta/10', shadow: 'shadow-neon-magenta/20', text: 'text-neon-magenta' },
    supporter: { icon: Heart, label: 'Supporter', color: 'amber-500', border: 'border-amber-500', bg: 'bg-amber-500/10', shadow: 'shadow-amber-500/20', text: 'text-amber-500' }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white flex flex-col p-6 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-[#39FF14] opacity-5 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-neon-cyan opacity-5 blur-[100px] rounded-full" />

      {/* Top Header */}
      <header className="flex justify-between items-center mb-10 relative z-10">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/5">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-[#39FF14] rounded-lg flex items-center justify-center -rotate-12 shadow-lg shadow-[#39FF14]/30">
              <Shield size={18} className="text-black" strokeWidth={3} />
           </div>
           <span className="font-black italic uppercase tracking-tighter text-xl">Nexus_OS</span>
        </div>
        <div className="w-10" />
      </header>

      {/* Intro Text */}
      <div className="mb-10 relative z-10">
        <h1 className="text-4xl font-black italic uppercase leading-none tracking-tighter mb-2">
          Nouvelle <br />
          <span className="text-[#39FF14] text-5xl drop-shadow-[0_0_10px_rgba(57,255,20,0.5)]">Recrue</span>
        </h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
          PROTOCOLE ALPHA TEST V1 : POSITION COACH FORCÉE
        </p>
      </div>

      {/* Register Form */}
      <form onSubmit={handleRegister} className="space-y-4 relative z-10">
        <div className="space-y-1.5">
           <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Email</label>
           <div className="relative">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@nexus-os.app"
                required
                className="w-full bg-white/5 border-2 border-white/5 rounded-3xl p-5 pl-14 text-sm font-bold outline-none focus:border-[#39FF14] focus:bg-white/10 focus:shadow-[0_0_15px_rgba(57,255,20,0.2)] transition-all placeholder:text-gray-700"
              />
           </div>
        </div>

        <div className="space-y-1.5">
           <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Mot de passe</label>
           <div className="relative">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                required
                className="w-full bg-white/5 border-2 border-white/5 rounded-3xl p-5 pl-14 text-sm font-bold outline-none focus:border-[#39FF14] focus:bg-white/10 focus:shadow-[0_0_15px_rgba(57,255,20,0.2)] transition-all placeholder:text-gray-700"
              />
           </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#39FF14] text-black font-black py-6 rounded-[2.5rem] shadow-xl shadow-[#39FF14]/30 flex items-center justify-center gap-3 uppercase italic tracking-tighter text-xl active:scale-95 transition-all mt-6 hover:bg-green-400 disabled:opacity-80 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <>Signer le contrat <ChevronRight size={24} strokeWidth={4} /></>
          )}
        </button>
      </form>

      {/* Footer */}
      <footer className="mt-auto pt-10 text-center relative z-10">
         <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
           Déjà dans l'effectif ?
           <Link href="/login" className="text-neon-orange ml-2 hover:text-white transition-colors">Se connecter</Link>
         </p>
      </footer>
    </main>
  );
}
