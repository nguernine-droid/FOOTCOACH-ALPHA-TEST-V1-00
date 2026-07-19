'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  UserPlus,
  ChevronDown,
  Check,
  Shield,
  Star,
  Trophy,
  Zap,
  Target
} from 'lucide-react';

export default function NewPlayerPage() {
  const router = useRouter();
  const [data, setData] = useState({
    name: '',
    position: 'ATT',
    rating: 75,
    status: 'Actif',
    assiduite: 100,
    technique: 75,
    physique: 75,
    buts: 0,
    passes: 0,
    felicitations: 0,
    compliments: 0,
    encouragements: 0,
    joueurMois: 0,
    joueurSemaine: 0,
    fairPlay: 0,
    meilleurCoequipier: 0,
    licence: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name) return;

    const category = ['BU', 'ATT'].includes(data.position) ? 'Attaquant' : ['MDC', 'MOC', 'MIL'].includes(data.position) ? 'Milieu' : data.position === 'GB' ? 'Gardien' : 'Défenseur';
    const newPlayer = { ...data, id: Date.now(), category };

    const existingPlayers = JSON.parse(localStorage.getItem('team_players') || '[]');
    localStorage.setItem('team_players', JSON.stringify([...existingPlayers, newPlayer]));

    router.push('/team');
  };

  const getAvatarUrl = (name: string) =>
    `https://i.pravatar.cc/300?u=${encodeURIComponent(name || 'placeholder')}`;

  return (
    <main className="min-h-screen bg-[#15171C] max-w-md lg:max-w-2xl mx-auto shadow-2xl lg:shadow-none pb-32 font-sans relative overflow-x-hidden">
      {/* Header Premium */}
      <header className="bg-[#1D2027]/80 backdrop-blur-md py-5 px-6 sticky top-0 z-40 border-b border-white/5 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-white active:scale-90 transition-transform p-2 bg-white/5 rounded-xl">
          <ChevronLeft size={24} strokeWidth={3} />
        </button>
        <h1 className="text-xl font-black text-white uppercase italic tracking-tighter">Signature Recrue</h1>
      </header>

      <div className="p-6 space-y-10">

        {/* LIVE PREVIEW FIFA CARD */}
        <section className="flex justify-center perspective-1000">
           <div className="relative w-64 h-96 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-[2.5rem] p-1 shadow-[0_20px_50px_rgba(234,179,8,0.3)] animate-in zoom-in duration-700 hover:rotate-2 transition-transform border-2 border-white/20">
              <div className="absolute inset-0 bg-white/10 mix-blend-overlay rounded-[2.5rem]" />

              <div className="relative h-full bg-[#1D2027] rounded-[2.3rem] flex flex-col items-center p-6 overflow-hidden">
                 {/* Card Header */}
                 <div className="w-full flex justify-between items-start mb-2">
                    <div className="text-left">
                       <span className="text-5xl font-black text-white leading-none tracking-tighter">{data.rating}</span>
                       <p className="text-[10px] font-black text-yellow-500 uppercase italic tracking-widest mt-1">{data.position}</p>
                    </div>
                    <Shield className="w-10 h-10 text-white/10" />
                 </div>

                 {/* Photo */}
                 <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-white/5 shadow-2xl mb-4 bg-gray-800 rotate-1">
                    <img src={getAvatarUrl(data.name)} alt="" className="w-full h-full object-cover" />
                 </div>

                 {/* Name */}
                 <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-6 text-center leading-none">
                    {data.name || "NOM DU JOUEUR"}
                 </h2>

                 {/* Quick Stats Grid */}
                 <div className="w-full grid grid-cols-3 gap-2 px-2 mt-auto">
                    <StatBox label="BUT" value={data.buts} />
                    <StatBox label="PAS" value={data.passes} />
                    <StatBox label="TEC" value={data.technique} />
                 </div>
              </div>
           </div>
        </section>

        {/* FORMULAIRE DE RECRUTEMENT */}
        <form onSubmit={handleSubmit} className="space-y-6">
           <div className="space-y-4">
              <div className="bg-[#1D2027] rounded-[2rem] p-6 border border-white/5 shadow-xl">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 ml-1">Numéro de Licence</label>
                <div className="flex items-center gap-3">
                   <Target size={18} className="text-yellow-500" />
                   <input
                    type="text"
                    value={data.licence}
                    onChange={(e) => setData({...data, licence: e.target.value})}
                    placeholder="N° DE LICENCE XXL"
                    className="w-full bg-transparent text-lg font-black text-white outline-none placeholder:text-gray-800"
                   />
                </div>
              </div>

              <div className="bg-[#1D2027] rounded-[2rem] p-6 border border-white/5 shadow-xl group focus-within:border-yellow-500/50 transition-all">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 ml-1">Identité de la pépite</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData({...data, name: e.target.value})}
                  placeholder="NOM PRÉNOM"
                  className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-gray-800 uppercase italic"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-[#1D2027] rounded-[2rem] p-6 border border-white/5 shadow-xl">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-3 ml-1">Poste Tactique</label>
                    <div className="relative">
                       <select
                        value={data.position}
                        onChange={(e) => setData({...data, position: e.target.value})}
                        className="w-full bg-white/5 rounded-xl p-3 text-sm font-black text-white outline-none appearance-none border border-white/10"
                       >
                          <option value="GB">GARDIEN</option>
                          <option value="DC">DÉFENSEUR</option>
                          <option value="MIL">MILIEU</option>
                          <option value="ATT">ATTAQUANT</option>
                          <option value="BU">BUTEUR</option>
                       </select>
                       <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-500" />
                    </div>
                 </div>

                 <div className="bg-[#1D2027] rounded-[2rem] p-6 border border-white/5 shadow-xl">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-3 ml-1">Note Globale</label>
                    <div className="flex items-center gap-4">
                       <input
                        type="number"
                        value={data.rating}
                        onChange={(e) => setData({...data, rating: Number(e.target.value)})}
                        min="40" max="99"
                        className="bg-transparent text-3xl font-black text-yellow-500 outline-none w-16"
                       />
                       <Star size={20} className="text-yellow-500 fill-yellow-500 animate-pulse" />
                    </div>
                 </div>
              </div>
           </div>

           {/* Bouton de Signature */}
           <div className="fixed bottom-28 lg:bottom-8 left-0 right-0 lg:left-64 px-6 z-40 pointer-events-none">
              <div className="max-w-md lg:max-w-2xl mx-auto pointer-events-auto">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-[#15171C] font-black py-5 rounded-[2.5rem] shadow-lg shadow-orange-900/20 flex items-center justify-center gap-3 uppercase italic tracking-tighter text-lg active:scale-95 transition-all border-t-2 border-white/30"
                >
                  <Check size={28} strokeWidth={4} />
                  Signer le contrat
                </button>
              </div>
           </div>
        </form>
      </div>
    </main>
  );
}

function StatBox({ label, value }: { label: string, value: number }) {
  return (
    <div className="flex flex-col items-center bg-white/5 rounded-xl py-2 border border-white/5">
       <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
       <span className="text-xs font-black text-white">{value}</span>
    </div>
  );
}
