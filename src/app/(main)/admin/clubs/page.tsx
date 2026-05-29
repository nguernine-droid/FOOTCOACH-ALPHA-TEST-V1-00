'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Shield, Loader2, Merge, AlertTriangle,
  CheckCircle2, Trash2, RefreshCw, Search
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTeam } from '@/lib/context/TeamContext';

interface Duplicate {
  club_a_id: string; club_a_name: string; club_a_city: string | null;
  club_b_id: string; club_b_name: string; club_b_city: string | null;
  score: number;
}

interface MergeResult {
  profiles_moved: number;
  events_moved: number;
  children_moved: number;
  aliases_moved: number;
}

export default function AdminClubsPage() {
  const router = useRouter();
  const { role } = useTeam();

  const [duplicates, setDuplicates]   = useState<Duplicate[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [threshold, setThreshold]     = useState(0.5);
  const [merging, setMerging]         = useState<string | null>(null);
  const [results, setResults]         = useState<Record<string, MergeResult>>({});
  const [dismissed, setDismissed]     = useState<Set<string>>(new Set());

  // Garde : seul l'admin peut accéder
  useEffect(() => {
    if (role !== 'admin') router.replace('/dashboard');
  }, [role]);

  const fetchDuplicates = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.rpc('find_duplicate_clubs', { p_threshold: threshold });
    if (!error && data) setDuplicates(data as Duplicate[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchDuplicates(); }, [threshold]);

  const handleMerge = async (keepId: string, deleteId: string, pairKey: string) => {
    if (!confirm(`Fusionner ces deux clubs ? Le second sera supprimé définitivement.`)) return;
    setMerging(pairKey);
    try {
      const { data, error } = await supabase.rpc('merge_clubs', {
        p_keep: keepId, p_delete: deleteId,
      });
      if (error) throw error;
      setResults(prev => ({ ...prev, [pairKey]: data as MergeResult }));
      setDuplicates(prev => prev.filter(d => pairKey !== `${d.club_a_id}-${d.club_b_id}`));
    } catch (err: any) {
      alert('Erreur fusion : ' + err.message);
    } finally {
      setMerging(null);
    }
  };

  const dismiss = (pairKey: string) => {
    setDismissed(prev => new Set([...prev, pairKey]));
  };

  const visibleDuplicates = duplicates.filter(d => !dismissed.has(`${d.club_a_id}-${d.club_b_id}`));

  const scoreColor = (s: number) => {
    if (s >= 0.8) return 'text-red-500 bg-red-50 border-red-200';
    if (s >= 0.65) return 'text-orange-500 bg-orange-50 border-orange-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const scoreLabel = (s: number) => {
    if (s >= 0.8) return 'Doublon probable';
    if (s >= 0.65) return 'Très similaire';
    return 'Similaire';
  };

  if (role !== 'admin') return null;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 pb-32 max-w-2xl mx-auto font-sans">
      <header className="bg-white py-5 px-6 sticky top-0 z-30 border-b border-gray-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="active:scale-90 transition-transform">
            <ChevronLeft size={24} strokeWidth={3} />
          </button>
          <div>
            <h1 className="text-lg font-black uppercase italic tracking-tight">Fusion Clubs</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin — Doublons détectés</p>
          </div>
        </div>
        <button onClick={fetchDuplicates} className="p-2 bg-gray-100 rounded-xl active:scale-90 transition-transform">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </header>

      <div className="p-5 space-y-6">

        {/* Seuil de similarité */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Seuil de similarité</p>
            <span className="text-sm font-black text-orange-600">{Math.round(threshold * 100)}%</span>
          </div>
          <input
            type="range" min={0.3} max={0.9} step={0.05}
            value={threshold}
            onChange={e => setThreshold(parseFloat(e.target.value))}
            className="w-full accent-orange-500"
          />
          <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase">
            <span>30% — Large</span><span>50% — Équilibré</span><span>90% — Strict</span>
          </div>
        </section>

        {/* Compteur */}
        <div className="flex items-center gap-3 px-1">
          <AlertTriangle size={16} className="text-orange-500" />
          <p className="text-[11px] font-black uppercase text-gray-500 tracking-widest">
            {isLoading ? 'Analyse...' : `${visibleDuplicates.length} doublon${visibleDuplicates.length !== 1 ? 's' : ''} détecté${visibleDuplicates.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Liste des doublons */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-orange-500" />
          </div>
        ) : visibleDuplicates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-3">
            <CheckCircle2 size={40} className="text-green-500 mx-auto" />
            <p className="font-black uppercase text-gray-400 text-sm">Aucun doublon détecté</p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">à ce seuil de similarité</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleDuplicates.map(d => {
              const pairKey = `${d.club_a_id}-${d.club_b_id}`;
              const isMerging = merging === pairKey;
              const mergeResult = results[pairKey];

              return (
                <div key={pairKey} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                  {/* Score */}
                  <div className={`px-5 py-2 flex items-center justify-between border-b border-gray-50`}>
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${scoreColor(d.score)}`}>
                      {scoreLabel(d.score)} — {Math.round(d.score * 100)}%
                    </span>
                    <button
                      onClick={() => dismiss(pairKey)}
                      className="text-[9px] font-black uppercase text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      Ignorer
                    </button>
                  </div>

                  {/* Les deux clubs */}
                  <div className="grid grid-cols-2 divide-x divide-gray-50">
                    {[
                      { id: d.club_a_id, name: d.club_a_name, city: d.club_a_city, otherId: d.club_b_id, label: 'Conserver A' },
                      { id: d.club_b_id, name: d.club_b_name, city: d.club_b_city, otherId: d.club_a_id, label: 'Conserver B' },
                    ].map(club => (
                      <div key={club.id} className="p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Shield size={14} className="text-gray-300" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase leading-tight line-clamp-2">{club.name}</p>
                            {club.city && <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{club.city}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleMerge(club.id, club.otherId, pairKey)}
                          disabled={isMerging}
                          className="w-full py-2.5 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-40"
                        >
                          {isMerging
                            ? <Loader2 size={12} className="animate-spin" />
                            : <Merge size={12} />
                          }
                          {club.label}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Résultat de fusion */}
                  {mergeResult && (
                    <div className="px-5 py-3 bg-green-50 border-t border-green-100 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                      <p className="text-[10px] font-black uppercase text-green-600">
                        Fusionné — {mergeResult.profiles_moved} profil{mergeResult.profiles_moved !== 1 ? 's' : ''} •
                        {' '}{mergeResult.events_moved} événement{mergeResult.events_moved !== 1 ? 's' : ''} •
                        {' '}{mergeResult.aliases_moved} alias transféré{mergeResult.aliases_moved !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
