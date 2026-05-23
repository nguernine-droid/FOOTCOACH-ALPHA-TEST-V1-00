'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  MessageSquare,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EventDetailPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'dispo' | 'chat'>('dispo');

  const event = {
    title: "Match vs AS Versailles",
    type: "match",
    date: "samedi 16 mai 2026",
    time: "14:00",
    location: "Stade Municipal",
    opponent: "AS Versailles",
    stats: { present: 7, absent: 2, maybe: 1 }
  };

  const players = [
    { name: 'Lucas Dubois', position: 'Gardien', status: 'present' },
    { name: 'Emma Martin', position: 'Défenseur', status: 'present' },
    { name: 'Léa Petit', position: 'Attaquant', status: 'present' },
  ];

  return (
    <main className="min-h-screen bg-background-gray max-w-md mx-auto shadow-2xl">
      {/* Header */}
      <header className="bg-white py-4 px-6 sticky top-0 z-10 border-b border-gray-50 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-900 active:scale-90 transition-transform">
          <ChevronLeft size={24} strokeWidth={3} />
        </button>
        <h1 className="text-xl font-black text-gray-900 truncate">{event.title}</h1>
      </header>

      <div className="p-4 space-y-4">

        {/* Event Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-black text-gray-900 leading-tight">{event.title}</h2>
            <span className="bg-match-red/10 text-match-red text-[10px] font-black uppercase px-3 py-1 rounded-full">
              Match
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3 text-gray-400 font-bold text-sm">
              <Calendar size={18} className="text-match-red" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 font-bold text-sm">
              <Clock size={18} className="text-sky-blue" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 font-bold text-sm">
              <MapPin size={18} className="text-match-red" />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 font-bold text-sm">
              <Users size={18} className="text-grass-green" />
              <span>vs {event.opponent}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <StatusButton icon={<CheckCircle2 size={24} />} label="Présent" color="bg-grass-green" active />
          <StatusButton icon={<XCircle size={24} />} label="Absent" color="bg-match-red" />
          <StatusButton icon={<HelpCircle size={24} />} label="Incertain" color="bg-energy-orange" />
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl p-1 border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setTab('dispo')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-black transition-all rounded-xl ${tab === 'dispo' ? 'bg-grass-green/10 text-grass-green' : 'text-gray-400'}`}
          >
            <Users size={18} /> Disponibilités
          </button>
          <button
            onClick={() => setTab('chat')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-black transition-all rounded-xl ${tab === 'chat' ? 'bg-grass-green/10 text-grass-green' : 'text-gray-400'}`}
          >
            <MessageSquare size={18} /> Messages
          </button>
        </div>

        {/* Tab Content: Disponibilités */}
        {tab === 'dispo' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Summary */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Résumé</h3>
              <div className="flex justify-between items-center px-4">
                <StatItem value={event.stats.present} label="Présents" color="text-grass-green" />
                <StatItem value={event.stats.absent} label="Absents" color="text-match-red" />
                <StatItem value={event.stats.maybe} label="Incertains" color="text-energy-orange" />
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 flex items-center gap-2 border-b border-gray-50">
                <CheckCircle2 size={18} className="text-grass-green" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Présents ({event.stats.present})</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {players.map((p, i) => (
                  <div key={i} className="p-4 flex flex-col px-6">
                    <span className="font-bold text-gray-900">{p.name}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{p.position}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

function StatusButton({ icon, label, color, active = false }: { icon: React.ReactNode, label: string, color: string, active?: boolean }) {
  return (
    <button className={`flex flex-col items-center justify-center gap-2 p-4 rounded-[2rem] transition-all active:scale-95 border-2 ${active ? `${color} text-white shadow-lg border-white/20` : 'bg-white text-gray-400 border-gray-100 shadow-sm'}`}>
      {icon}
      <span className="text-[11px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function StatItem({ value, label, color }: { value: number, label: string, color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-2xl font-black ${color}`}>{value}</span>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}
