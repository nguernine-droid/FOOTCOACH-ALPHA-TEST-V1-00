'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, ChevronRight, ArrowLeft, Chrome, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase/client'; // L'import est ici, proprement

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoRole, setDemoRole] = useState<'coach' | 'player' | 'parent' | 'supporter'>('coach');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Tentative de connexion réelle à Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 2. Récupérer le rôle pour le Guard et le Context
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, theme_preference')
        .eq('id', data.user.id)
        .single();

      if (profile) {
        localStorage.setItem('user_role', profile.role);
        localStorage.setItem('app_theme', profile.theme_preference || 'classic');
      }

      // 3. Succès : Redirection DIRECTE vers le Dashboard
      localStorage.setItem('is_authenticated', 'true');
      router.push('/dashboard');
    } catch (error: any) {
      alert("Erreur de connexion : " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white flex flex-col p-6 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-neon-orange opacity-5 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-[#39FF14] opacity-5 blur-[100px] rounded-full" />

      <header className="flex justify-between items-center mb-12 relative z-10">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/5">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-neon-orange rounded-lg flex items-center justify-center rotate-12 shadow-lg shadow-neon-orange/30">
              <Shield size={18} className="text-black" strokeWidth={3} />
           </div>
           <span className="font-black italic uppercase tracking-tighter text-xl">Nexus_OS</span>
        </div>
        <div className="w-10" />
      </header>

      <div className="mb-10 relative z-10">
        <h1 className="text-4xl font-black italic uppercase leading-none tracking-tighter mb-2">
          Connexion <br />
          <span className="text-neon-orange text-5xl drop-shadow-[0_0_10px_rgba(255,107,0,0.5)]">Tactique</span>
        </h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
          Reprenez le contrôle de votre unité.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4 relative z-10">
        <div className="space-y-1.5">
           <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Email Officiel</label>
           <div className="relative">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@club.com"
                required
                className="w-full bg-white/5 border-2 border-white/5 rounded-3xl p-5 pl-14 text-sm font-bold outline-none focus:border-neon-orange focus:bg-white/10 focus:shadow-[0_0_15px_rgba(255,107,0,0.2)] transition-all placeholder:text-gray-700"
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
                placeholder="••••••••"
                required
                className="w-full bg-white/5 border-2 border-white/5 rounded-3xl p-5 pl-14 text-sm font-bold outline-none focus:border-neon-orange focus:bg-white/10 focus:shadow-[0_0_15px_rgba(255,107,0,0.2)] transition-all placeholder:text-gray-700"
              />
           </div>
        </div>

        <div className="flex justify-end px-2">
           <button
             type="button"
             onClick={async () => {
               if (!email) return alert("Veuillez saisir votre email d'abord.");
               const { error } = await supabase.auth.resetPasswordForEmail(email);
               if (error) alert(error.message);
               else alert("📧 Mail de réinitialisation envoyé !");
             }}
             className="text-[10px] font-black text-neon-orange uppercase tracking-widest italic hover:text-white transition-colors"
           >
             Oublié ?
           </button>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest text-center">🕹️ Mode Démo : Choisir le rôle</p>
          <div className="grid grid-cols-4 gap-2">
            {(['coach', 'player', 'parent', 'supporter'] as const).map(role => (
              <button
                key={role}
                type="button"
                onClick={() => setDemoRole(role)}
                className={`p-2 rounded-xl text-[8px] font-black uppercase border transition-all ${
                  demoRole === role ? 'bg-neon-orange border-neon-orange text-black shadow-[0_0_10px_rgba(255,107,0,0.3)]' : 'border-white/10 text-gray-500 hover:border-white/30'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full bg-neon-orange text-black font-black py-6 rounded-[2.5rem] shadow-xl shadow-neon-orange/30 flex items-center justify-center gap-3 uppercase italic tracking-tighter text-xl active:scale-95 transition-all mt-6 ${isLoading ? 'opacity-80 cursor-not-allowed' : 'hover:bg-orange-500'}`}
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <>Accéder au banc <ChevronRight size={24} strokeWidth={4} /></>
          )}
        </button>
      </form>

      <div className="mt-12 space-y-4 relative z-10">
         <p className="text-center text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Ou continuer avec</p>
         <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 hover:border-white/10 transition-all active:scale-95">
               <Chrome size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest">Google</span>
            </button>
            <button className="flex items-center justify-center gap-2 bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 hover:border-white/10 transition-all active:scale-95">
               <Zap size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest">Apple</span>
            </button>
         </div>
      </div>

      <footer className="mt-auto pt-10 text-center relative z-10">
         <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
           Nouveau sur la touche ?
           <Link href="/register" className="text-[#39FF14] ml-2 hover:text-white transition-colors">Créer un compte</Link>
         </p>
      </footer>
    </main>
  );
}
