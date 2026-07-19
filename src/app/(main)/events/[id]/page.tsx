'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, Calendar, Clock, MapPin, Users, MessageSquare,
  CheckCircle2, XCircle, HelpCircle, Loader2, Zap, Trophy, Star, Shield, AlertTriangle, QrCode
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useTeam } from '@/lib/context/TeamContext';
import { SosModal } from '@/components/SosModal';
import { QRCodeSVG } from 'qrcode.react';

type AttendanceStatus = 'present' | 'absent' | 'maybe';
type EventStatus = 'scheduled' | 'live' | 'finished';

interface EventData {
  id: string;
  match_request_id?: string | null;
  title: string;
  type: string;
  date: string;
  time: string;
  location: string;
  city: string | null;
  stadium_name: string | null;
  home_score: number;
  away_score: number;
  status: EventStatus;
  tournament_config: { is_official?: boolean; opponents?: string[] } | null;
  training_theme?: string | null;
  description?: string | null;
  created_by?: string | null;
  qr_token?: string | null;
  qr_validated_at?: string | null;
}

interface Attendee {
  profile_id: string;
  status: AttendanceStatus;
  profiles: { first_name: string | null; last_name: string | null; nickname: string | null } | null;
}

const TYPE_STYLE: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  match:       { color: 'text-neon-green',  bg: 'bg-neon-green',  label: 'Match',        icon: <Zap size={16} fill="currentColor" /> },
  training:    { color: 'text-sky-400',    bg: 'bg-sky-500',    label: 'Entraînement', icon: <Zap size={16} /> },
  tournament:  { color: 'text-yellow-400', bg: 'bg-yellow-500', label: 'Tournoi',      icon: <Star size={16} fill="currentColor" /> },
  plateau:     { color: 'text-purple-400', bg: 'bg-purple-500', label: 'Plateau',      icon: <Users size={16} /> },
  convocation: { color: 'text-orange-400', bg: 'bg-orange-500', label: 'Convocation',  icon: <Shield size={16} /> },
};

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: React.ReactNode; active: string; inactive: string }> = {
  present: { label: 'Présent',   icon: <CheckCircle2 size={22} />, active: 'bg-neon-green text-black border-neon-green',  inactive: 'bg-white/5 text-gray-500 border-white/10' },
  absent:  { label: 'Absent',    icon: <XCircle size={22} />,      active: 'bg-red-500 text-white border-red-500',       inactive: 'bg-white/5 text-gray-500 border-white/10' },
  maybe:   { label: 'Incertain', icon: <HelpCircle size={22} />,   active: 'bg-orange-500 text-white border-orange-500', inactive: 'bg-white/5 text-gray-500 border-white/10' },
};

function parseLocalDate(d: string) { return new Date(d + 'T00:00:00'); }

function attendeeName(a: Attendee) {
  const p = a.profiles;
  if (!p) return 'Joueur';
  return p.nickname || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Joueur';
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { theme } = useTeam();
  const isPro = theme === 'classic';

  const [event, setEvent]         = useState<EventData | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [myStatus, setMyStatus]   = useState<AttendanceStatus | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);
  const [tab, setTab]             = useState<'dispo' | 'chat'>('dispo');
  const [showSos, setShowSos]         = useState(false);
  const [isSosSending, setIsSosSending] = useState(false);
  const [showQr, setShowQr]           = useState(false);
  const [qrToken, setQrToken]         = useState<string | null>(null);
  const [qrValidated, setQrValidated] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const fetchAttendees = useCallback(async () => {
    const { data } = await supabase
      .from('event_attendees')
      .select('profile_id, status, profiles(first_name, last_name, nickname)')
      .eq('event_id', id);
    if (data) {
      const formatted = (data as any[]).map(item => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      }));
      setAttendees(formatted as Attendee[]);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
      if (!error && data) {
        setEvent(data as EventData);
        // Générer ou récupérer le token QR
        if (data.qr_token) {
          setQrToken(data.qr_token);
        } else {
          // Créer un token unique : 16 chars hex
          const token = Array.from(crypto.getRandomValues(new Uint8Array(8)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
          await supabase.from('events').update({ qr_token: token }).eq('id', id);
          setQrToken(token);
        }
        setQrValidated(!!data.qr_validated_at);
      }
      await fetchAttendees();
      setIsLoading(false);
    };
    load();
  }, [id, fetchAttendees]);

  useEffect(() => {
    if (!userId || !attendees.length) return;
    const mine = attendees.find(a => a.profile_id === userId);
    setMyStatus(mine?.status ?? null);
  }, [attendees, userId]);

  const handleAttendance = async (status: AttendanceStatus) => {
    if (!userId || isSaving) return;
    setIsSaving(true);
    await supabase.from('event_attendees').upsert(
      { event_id: id, profile_id: userId, status, updated_at: new Date().toISOString() },
      { onConflict: 'event_id,profile_id' }
    );
    setMyStatus(status);
    await fetchAttendees();
    setIsSaving(false);
  };

  const handleSos = async (motifId: string) => {
    if (!event || !userId || isSosSending) return;
    setIsSosSending(true);
    try {
      const MOTIF_LABELS: Record<string, string> = {
        blessure:  'Blessure / Effectif insuffisant',
        meteo:     'Conditions météo',
        terrain:   'Terrain indisponible',
        personnel: 'Raison personnelle',
      };

      // 1. Soft delete de l'événement
      await supabase.from('events')
        .update({ deleted_at: new Date().toISOString(), status: 'finished' })
        .eq('id', id);

      // 2. Remettre l'annonce Radar en OPEN + marquer SOS
      if (event.match_request_id) {
        const { data: mr } = await supabase
          .from('match_requests')
          .select('category, respondent_id')
          .eq('id', event.match_request_id)
          .single();

        await supabase.from('match_requests').update({
          status:       'OPEN',
          is_sos:       true,
          sos_reason:   MOTIF_LABELS[motifId] || motifId,
          respondent_id: null,
          coach_a_confirmed: false,
          coach_b_confirmed: false,
        }).eq('id', event.match_request_id);

        // 3. Notifier l'adversaire
        if (mr?.respondent_id) {
          await supabase.functions.invoke('notify-coach', {
            body: {
              profile_id: mr.respondent_id,
              title: '😔 Forfait déclaré',
              body:  `Le match a été annulé — Motif : ${MOTIF_LABELS[motifId]}. L'annonce est remise en ligne.`,
              url:   '/radar',
            },
          });
        }

        // 4. Alerter les coachs "toujours prêt"
        await supabase.functions.invoke('notify-sos', {
          body: {
            match_request_id: event.match_request_id,
            category:         mr?.category || '',
            exclude_coach_id: userId,
          },
        });
      }

      setShowSos(false);
      router.replace('/events');
    } catch (err: any) {
      alert('Erreur : ' + err.message);
    } finally {
      setIsSosSending(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#15171C] flex items-center justify-center">
        <Loader2 size={32} className="text-neon-cyan animate-spin" />
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-[#15171C] flex flex-col items-center justify-center gap-4 text-white">
        <p className="font-black uppercase italic text-gray-500">Événement introuvable</p>
        <button onClick={() => router.back()} className="text-neon-cyan font-black uppercase text-sm">← Retour</button>
      </main>
    );
  }

  const isOfficial = event.tournament_config?.is_official === true;
  const typeKey = event.type?.toLowerCase() || 'training';
  const style = isOfficial
    ? { color: 'text-orange-500', bg: 'bg-orange-500', label: 'Officiel', icon: <Trophy size={16} fill="currentColor" /> }
    : (TYPE_STYLE[typeKey] || TYPE_STYLE['training']);

  const dateLabel = parseLocalDate(event.date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const byStatus = (s: AttendanceStatus) => attendees.filter(a => a.status === s);
  const present  = byStatus('present');
  const absent   = byStatus('absent');
  const maybe    = byStatus('maybe');
  const isCoach  = event.created_by === userId;

  return (
    <main className="min-h-screen bg-[#15171C] text-white pb-32 max-w-md lg:max-w-2xl mx-auto font-sans">
      <header className="bg-[#15171C]/80 backdrop-blur-md py-5 px-6 sticky top-0 z-30 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="active:scale-90 transition-transform">
            <ChevronLeft size={24} strokeWidth={3} />
          </button>
          <h1 className="text-xl font-black italic uppercase tracking-tighter truncate">{event.title}</h1>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${style.color} border-current`}>
          {style.label}
        </span>
      </header>

      <div className="p-5 space-y-5">

        {/* CARTE PRINCIPALE */}
        <section className="bg-[#1D2027] border-2 border-white/10 rounded-[2.5rem] p-6 space-y-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 ${style.color}`}>
            {style.icon}
          </div>
          <h2 className="text-2xl font-black italic uppercase leading-tight">{event.title}</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm font-bold text-gray-400">
              <Calendar size={16} className={style.color} />
              <span className="capitalize">{dateLabel}</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-bold text-gray-400">
              <Clock size={16} className="text-neon-cyan" />
              <span>{event.time?.slice(0, 5)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-3 text-sm font-bold text-gray-400">
                <MapPin size={16} className="text-red-500" />
                <span className="uppercase">{event.location}</span>
              </div>
            )}
            {event.training_theme && (
              <div className="flex items-center gap-3 text-sm font-bold text-gray-400">
                <Zap size={16} className="text-sky-400" />
                <span className="uppercase">Thème : {event.training_theme}</span>
              </div>
            )}
          </div>

          {event.type === 'match' && event.status === 'finished' && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-6">
              <span className="text-4xl font-black text-white">{event.home_score}</span>
              <span className="text-xl font-black text-gray-600">—</span>
              <span className="text-4xl font-black text-white">{event.away_score}</span>
            </div>
          )}

          {event.description && (
            <div className="pt-4 border-t border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2">Consignes</p>
              <p className="text-sm font-bold text-gray-300 uppercase leading-relaxed">{event.description}</p>
            </div>
          )}
        </section>

        {/* BOUTONS DISPONIBILITÉ (pour les non-coachs ou tous) */}
        <div className="grid grid-cols-3 gap-3">
          {(['present', 'absent', 'maybe'] as AttendanceStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s];
            const isActive = myStatus === s;
            return (
              <button
                key={s}
                onClick={() => handleAttendance(s)}
                disabled={isSaving}
                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-tight transition-all active:scale-95 ${isActive ? cfg.active : cfg.inactive}`}
              >
                {isSaving && myStatus === s ? <Loader2 size={22} className="animate-spin" /> : cfg.icon}
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* TABS */}
        <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10">
          <button
            onClick={() => setTab('dispo')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-xs font-black uppercase transition-all rounded-xl ${tab === 'dispo' ? 'bg-white/10 text-white' : 'text-gray-600'}`}
          >
            <Users size={16} /> Disponibilités
          </button>
          <button
            onClick={() => setTab('chat')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-xs font-black uppercase transition-all rounded-xl ${tab === 'chat' ? 'bg-white/10 text-white' : 'text-gray-600'}`}
          >
            <MessageSquare size={16} /> Messages
          </button>
        </div>

        {tab === 'dispo' && (
          <div className="space-y-4">
            {/* RÉSUMÉ */}
            <section className="bg-[#1D2027] border border-white/10 rounded-[2.5rem] p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-5">Résumé</p>
              <div className="flex justify-around">
                <StatItem value={present.length} label="Présents"   color="text-neon-green" />
                <StatItem value={absent.length}  label="Absents"    color="text-red-500" />
                <StatItem value={maybe.length}   label="Incertains" color="text-orange-400" />
              </div>
            </section>

            {/* LISTES — visibles par le coach uniquement */}
            {isCoach ? (
              <div className="space-y-3">
                {present.length > 0 && (
                  <AttendeeList title={`Présents (${present.length})`} items={present} color="text-neon-green" icon={<CheckCircle2 size={14} />} />
                )}
                {absent.length > 0 && (
                  <AttendeeList title={`Absents (${absent.length})`} items={absent} color="text-red-500" icon={<XCircle size={14} />} />
                )}
                {maybe.length > 0 && (
                  <AttendeeList title={`Incertains (${maybe.length})`} items={maybe} color="text-orange-400" icon={<HelpCircle size={14} />} />
                )}
                {attendees.length === 0 && (
                  <p className="text-center text-gray-700 text-[10px] font-black uppercase italic py-6">Aucune réponse pour l'instant</p>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-700 text-[10px] font-black uppercase italic py-4">
                Seul le coach voit la liste complète
              </p>
            )}
          </div>
        )}

        {tab === 'chat' && (
          <section className="bg-[#1D2027] border border-white/10 rounded-[2.5rem] p-8 text-center space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">Messages</p>
            <p className="text-gray-600 text-xs font-bold uppercase italic">Fonctionnalité V2 — bientôt disponible</p>
          </section>
        )}

        {/* QR CODE VALIDATION JOUR J */}
        {isCoach && event.type === 'match' && event.status === 'scheduled' && qrToken && (() => {
          const today    = new Date().toISOString().split('T')[0];
          const isToday  = event.date === today;
          if (!isToday && !showQr) return null;
          const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/events/${id}/validate?token=${qrToken}`;
          return (
            <section className={`rounded-[2rem] overflow-hidden border-2 ${qrValidated ? 'border-neon-green/40' : 'border-white/10'}`}>
              <button
                onClick={() => setShowQr(v => !v)}
                className={`w-full px-5 py-4 flex items-center justify-between ${qrValidated ? 'bg-neon-green/10' : 'bg-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <QrCode size={18} className={qrValidated ? 'text-neon-green' : 'text-neon-cyan'} />
                  <div className="text-left">
                    <p className={`text-[11px] font-black uppercase ${qrValidated ? 'text-neon-green' : 'text-white'}`}>
                      {qrValidated ? '✅ Match validé par QR Code' : isPro ? 'QR Code de validation' : 'QR_Code_Jour_J'}
                    </p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">
                      {qrValidated ? 'Confirmation enregistrée' : isToday ? 'À faire scanner par l\'adversaire' : 'Disponible le jour du match'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-gray-500">{showQr ? '▲' : '▼'}</span>
              </button>

              {showQr && !qrValidated && (
                <div className="p-6 flex flex-col items-center gap-4 bg-white">
                  <p className="text-[10px] font-black uppercase text-gray-400 text-center">
                    Fais scanner ce QR code par l'adversaire pour confirmer votre présence
                  </p>
                  <div className="p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-lg">
                    <QRCodeSVG
                      value={qrUrl}
                      size={200}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="M"
                    />
                  </div>
                  <p className="text-[9px] font-bold text-gray-300 uppercase text-center">
                    {event.title}
                  </p>
                </div>
              )}
            </section>
          );
        })()}

        {/* BOUTON FORFAIT — visible par le coach créateur, match schedulé issu du Radar */}
        {isCoach && event.type === 'match' && event.status === 'scheduled' && event.match_request_id && (
          <button
            onClick={() => setShowSos(true)}
            className="w-full py-4 rounded-2xl border-2 border-red-500/30 bg-red-500/5 flex items-center justify-center gap-2 text-red-500 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
          >
            <AlertTriangle size={16} />
            {isPro ? 'Déclarer un forfait' : '🚨 Émettre un SOS'}
          </button>
        )}
      </div>

      {/* MODAL SOS */}
      <SosModal
        isOpen={showSos}
        eventTitle={event.title}
        isPro={isPro}
        onConfirm={handleSos}
        onCancel={() => setShowSos(false)}
      />
    </main>
  );
}

function StatItem({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-3xl font-black ${color}`}>{value}</span>
      <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">{label}</span>
    </div>
  );
}

function AttendeeList({ title, items, color, icon }: { title: string; items: Attendee[]; color: string; icon: React.ReactNode }) {
  return (
    <section className="bg-[#1D2027] border border-white/10 rounded-[2rem] overflow-hidden">
      <div className={`px-5 py-4 flex items-center gap-2 border-b border-white/5 ${color}`}>
        {icon}
        <p className="text-[10px] font-black uppercase tracking-widest">{title}</p>
      </div>
      <div className="divide-y divide-white/5">
        {items.map(a => (
          <div key={a.profile_id} className="px-5 py-3">
            <p className="text-sm font-black text-white uppercase">{attendeeName(a)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
