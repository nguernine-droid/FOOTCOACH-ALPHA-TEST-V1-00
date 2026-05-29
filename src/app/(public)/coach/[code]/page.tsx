'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Shield, Phone, MapPin, Calendar, Smartphone,
  CheckCircle2, Loader2, UserPlus, Zap, Trophy, Star
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface PublicCoach {
  id: string;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  coach_grade: string | null;
  coach_level: string | null;
  coach_category: string | null;
  coach_status: string | null;
  phone: string | null;
  referral_code: string | null;
  created_at: string;
  clubs: { name: string; city: string | null; logo_url: string | null } | null;
  match_count: number;
  radar_count: number;
}

function CoachPublicContent() {
  const params      = useParams();
  const router      = useRouter();
  const search      = useSearchParams();
  const code        = params.code as string;
  const eventId     = search.get('event'); // présent si vient du QR match

  const [coach, setCoach]           = useState<PublicCoach | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'follow' | 'connection' | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => { loadData(); }, [code]);

  const loadData = async () => {
    try {
      // Profil public du coach
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, nickname, first_name, last_name, avatar_url, coach_grade, coach_level, coach_category, coach_status, phone, referral_code, created_at, clubs:club_id(name, city, logo_url)')
        .eq('referral_code', code.toUpperCase())
        .single();

      if (!profile) { setIsLoading(false); return; }

      // Stats
      const [{ count: matchCount }, { count: radarCount }] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true })
          .eq('type', 'match').eq('status', 'finished').is('deleted_at', null),
        supabase.from('match_requests').select('*', { count: 'exact', head: true })
          .eq('coach_id', profile.id).is('deleted_at', null),
      ]);

      setCoach({ ...profile, clubs: (profile.clubs as any) || null, match_count: matchCount || 0, radar_count: radarCount || 0 });

      // Utilisateur connecté ?
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        // Déjà connectés ?
        const { data: conn } = await supabase
          .from('coach_connections')
          .select('type')
          .or(`and(coach_a_id.eq.${user.id},coach_b_id.eq.${profile.id}),and(coach_a_id.eq.${profile.id},coach_b_id.eq.${user.id})`)
          .maybeSingle();
        if (conn) {
          setIsConnected(true);
          setConnectionType(conn.type as 'follow' | 'connection');
        }
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleConnect = async (type: 'follow' | 'connection') => {
    if (!currentUser || !coach || isConnecting) return;
    setIsConnecting(true);
    try {
      await supabase.from('coach_connections').upsert([{
        coach_a_id: currentUser.id,
        coach_b_id: coach.id,
        type,
        source: eventId ? 'qr_match' : 'profile',
        event_id: eventId || null,
      }], { onConflict: 'coach_a_id,coach_b_id' });

      // Notifier le coach
      await supabase.functions.invoke('notify-coach', {
        body: {
          profile_id: coach.id,
          title: type === 'connection' ? '🎴 Échange de cartes FIFA !' : '👥 Nouveau follower',
          body:  type === 'connection'
            ? `Un coach a échangé sa carte FIFA avec vous.`
            : `Un coach suit maintenant votre profil.`,
          url: '/profile',
        },
      });

      setIsConnected(true);
      setConnectionType(type);
      setShowSuccess(true);
      if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
    } catch (err: any) { alert(err.message); }
    finally { setIsConnecting(false); }
  };

  const statusConfig = {
    actif:          { label: 'Actif',         color: 'bg-gray-400',   dot: '⚫' },
    toujours_pret:  { label: 'Toujours prêt', color: 'bg-green-500',  dot: '🟢' },
    inactif:        { label: 'Inactif',        color: 'bg-gray-300',   dot: '⚫' },
  };

  const statusInfo = statusConfig[(coach?.coach_status as keyof typeof statusConfig) || 'actif'];

  if (isLoading) return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 size={40} className="animate-spin text-neon-cyan" />
    </main>
  );

  if (!coach) return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 text-white p-6 text-center">
      <Shield size={48} className="text-gray-600" />
      <p className="font-black uppercase text-gray-500">Profil introuvable</p>
      <button onClick={() => router.push('/')} className="text-neon-cyan font-black uppercase text-sm">← Retour</button>
    </main>
  );

  const coachName = coach.nickname || `${coach.first_name || ''} ${coach.last_name || ''}`.trim() || 'Coach';
  const memberSince = new Date(coach.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const device = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : 'Web';

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-20">

      {/* Header dégradé */}
      <div className="relative h-48 bg-gradient-to-br from-[#0A0A0A] via-orange-950/30 to-[#050505] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(249,115,22,0.15),transparent_70%)]" />
        <div className="absolute top-6 left-6">
          <div className="px-3 py-1 rounded-lg border border-orange-500/30 text-orange-400 text-[8px] font-black uppercase tracking-widest">
            FootCoach · Carte de Visite
          </div>
        </div>
      </div>

      <div className="px-5 -mt-20 space-y-5 max-w-md mx-auto">

        {/* FIFA CARD */}
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-[2.5rem] border-2 border-orange-500/30 p-6 shadow-[0_0_40px_rgba(249,115,22,0.15)] space-y-5">

          {/* Avatar + Nom */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-3 border-orange-500/50 overflow-hidden bg-white/10 flex items-center justify-center shadow-xl">
                {coach.avatar_url
                  ? <img src={coach.avatar_url} className="w-full h-full object-cover" />
                  : <Shield size={36} className="text-orange-400" />
                }
              </div>
              {/* Statut */}
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#050505] ${statusInfo.color}`} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase italic tracking-tight text-white">{coachName}</h1>
              <p className="text-[11px] font-black uppercase text-orange-400 tracking-widest">
                {coach.clubs?.name || 'Club non renseigné'}
              </p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">
                {coach.coach_category} · {coach.coach_level}
              </p>
            </div>
          </div>

          {/* Grade */}
          {coach.coach_grade && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 w-fit">
              <Trophy size={14} className="text-orange-400" />
              <span className="text-[10px] font-black uppercase text-orange-400">{coach.coach_grade}</span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: coach.match_count, label: 'Matchs', icon: <Zap size={14} className="text-[#39FF14]" /> },
              { value: coach.radar_count, label: 'Annonces', icon: <Star size={14} className="text-orange-400" /> },
              { value: isConnected ? '✓' : '—', label: 'Réseau', icon: <CheckCircle2 size={14} className={isConnected ? 'text-green-400' : 'text-gray-600'} /> },
            ].map((s, i) => (
              <div key={i} className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                <div className="flex items-center justify-center mb-1">{s.icon}</div>
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-[8px] font-black uppercase text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Infos */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            {/* Téléphone — masqué si pas connecté */}
            <div className="flex items-center gap-3">
              <Phone size={14} className="text-orange-400 shrink-0" />
              <span className="text-sm font-bold">
                {isConnected && coach.phone
                  ? coach.phone
                  : <span className="text-gray-600 text-[10px] uppercase font-black tracking-widest">
                      🔒 Visible après connexion
                    </span>
                }
              </span>
            </div>
            {coach.clubs?.city && (
              <div className="flex items-center gap-3">
                <MapPin size={14} className="text-orange-400 shrink-0" />
                <span className="text-sm font-bold">{coach.clubs.city}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar size={14} className="text-orange-400 shrink-0" />
              <span className="text-sm font-bold capitalize">Membre depuis {memberSince}</span>
            </div>
            <div className="flex items-center gap-3">
              <Smartphone size={14} className="text-orange-400 shrink-0" />
              <span className="text-sm font-bold">{device}</span>
            </div>
          </div>

          {/* CV — Bridé V2 */}
          <div className="px-4 py-3 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-gray-600">CV · Diplômes · Expériences</p>
              <p className="text-[9px] font-bold text-gray-700 uppercase">Disponible en V2</p>
            </div>
            <span className="text-[10px] font-black text-gray-700">🔒</span>
          </div>
        </div>

        {/* ACTIONS */}
        {currentUser && currentUser.id !== coach.id && (
          <div className="space-y-3">
            {showSuccess ? (
              <div className="rounded-2xl bg-[#39FF14]/10 border border-[#39FF14]/30 p-5 flex items-center gap-3">
                <CheckCircle2 size={24} className="text-[#39FF14]" />
                <div>
                  <p className="text-[11px] font-black uppercase text-[#39FF14]">
                    {connectionType === 'connection' ? '🎴 Cartes échangées !' : '👥 Vous suivez ce coach'}
                  </p>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">
                    {coachName} est dans votre réseau
                  </p>
                </div>
              </div>
            ) : isConnected ? (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
                <p className="text-[10px] font-black uppercase text-gray-400">
                  {connectionType === 'connection' ? '🎴 Cartes FIFA échangées' : '👥 Vous suivez ce coach'}
                </p>
              </div>
            ) : (
              <>
                {/* Échange de cartes (connexion mutuelle) */}
                <button
                  onClick={() => handleConnect('connection')}
                  disabled={isConnecting}
                  className="w-full py-5 rounded-2xl bg-orange-600 text-white font-black uppercase italic text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"
                >
                  {isConnecting ? <Loader2 size={20} className="animate-spin" /> : <span className="text-lg">🎴</span>}
                  Échanger nos cartes FIFA
                </button>

                {/* Suivre (asymétrique) */}
                <button
                  onClick={() => handleConnect('follow')}
                  disabled={isConnecting}
                  className="w-full py-4 rounded-2xl bg-white/10 border border-white/10 text-white font-black uppercase text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <UserPlus size={16} /> Suivre ce coach
                </button>
              </>
            )}
          </div>
        )}

        {/* Non connecté → Rejoindre */}
        {!currentUser && (
          <button
            onClick={() => router.push(`/register?ref=${coach.referral_code}`)}
            className="w-full py-5 rounded-2xl bg-[#39FF14] text-black font-black uppercase italic text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_0_20px_#39FF1440]"
          >
            🚀 Rejoindre FootCoach
          </button>
        )}

      </div>
    </main>
  );
}

export default function CoachPublicPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-neon-cyan" />
      </main>
    }>
      <CoachPublicContent />
    </Suspense>
  );
}
