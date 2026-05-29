'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Shield, Calendar, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

function ValidateContent() {
  const router   = useRouter();
  const params   = useParams();
  const search   = useSearchParams();
  const id       = params.id as string;
  const token    = search.get('token');

  const [status, setStatus] = useState<'loading' | 'valid' | 'already' | 'invalid' | 'error'>('loading');
  const [event, setEvent]   = useState<any>(null);

  useEffect(() => {
    if (!id || !token) { setStatus('invalid'); return; }
    validate();
  }, [id, token]);

  const validate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      // Récupérer l'événement
      const { data: ev, error } = await supabase
        .from('events')
        .select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)')
        .eq('id', id)
        .eq('qr_token', token)
        .single();

      if (error || !ev) { setStatus('invalid'); return; }
      setEvent(ev);

      // Déjà validé ?
      if (ev.qr_validated_at) { setStatus('already'); return; }

      // Token valide → enregistrer la validation
      const { error: updErr } = await supabase
        .from('events')
        .update({
          qr_validated_at: new Date().toISOString(),
          qr_validated_by: user.id,
        })
        .eq('id', id);

      if (updErr) { setStatus('error'); return; }

      // Vibration de confirmation
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
      setStatus('valid');
      // Stocker l'event_id pour la page publique du coach adverse
      // Coach B pourra proposer l'échange de cartes depuis la page de l'adversaire
      if (ev.created_by) {
        localStorage.setItem('pending_card_exchange', JSON.stringify({
          event_id:   id,
          coach_id:   ev.created_by,
        }));
      }

    } catch {
      setStatus('error');
    }
  };

  const dateLabel = event?.date
    ? new Date(event.date + 'T00:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long'
      })
    : '';

  return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white">

      {status === 'loading' && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="text-neon-cyan animate-spin" />
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Vérification en cours...</p>
        </div>
      )}

      {status === 'valid' && (
        <div className="flex flex-col items-center gap-6 text-center animate-in fade-in duration-500">
          <div className="w-28 h-28 rounded-full bg-[#39FF14]/10 border-4 border-[#39FF14] flex items-center justify-center shadow-[0_0_40px_#39FF1440]">
            <CheckCircle2 size={56} className="text-[#39FF14]" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#39FF14] mb-2">Match validé ✅</p>
            <h1 className="text-2xl font-black uppercase italic">{event?.title}</h1>
            <p className="text-gray-400 text-sm mt-2 capitalize">{dateLabel} · {event?.time?.slice(0,5)}</p>
            <p className="text-gray-500 text-xs mt-1">{event?.location}</p>
          </div>

          <div className="flex gap-6">
            {[event?.home_club, event?.away_club].filter(Boolean).map((club: any, i: number) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-2xl border-2 border-[#39FF14]/30 bg-white/5 p-2 flex items-center justify-center">
                  {club.logo_url
                    ? <img src={club.logo_url} className="w-full h-full object-contain" />
                    : <Shield size={24} className="text-gray-500" />
                  }
                </div>
                <p className="text-[9px] font-black uppercase text-center text-gray-400">{club.name}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 w-full">
            {/* Proposer l'échange de cartes */}
            {event?.created_by && (
              <button
                onClick={async () => {
                  // Récupérer le referral_code du coach adverse
                  const { data } = await supabase
                    .from('profiles').select('referral_code').eq('id', event.created_by).single();
                  if (data?.referral_code) {
                    router.replace(`/public/coach/${data.referral_code}?event=${id}`);
                  }
                }}
                className="w-full px-8 py-4 bg-orange-600 text-white font-black uppercase rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                🎴 Échanger nos cartes FIFA
              </button>
            )}
            <button
              onClick={() => router.replace(`/events/${id}`)}
              className="px-8 py-4 bg-[#39FF14] text-black font-black uppercase rounded-2xl active:scale-95 transition-all"
            >
              Voir l'événement
            </button>
          </div>
        </div>
      )}

      {status === 'already' && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-28 h-28 rounded-full bg-sky-500/10 border-4 border-sky-500 flex items-center justify-center">
            <CheckCircle2 size={56} className="text-sky-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-2">Déjà validé</p>
            <h1 className="text-2xl font-black uppercase italic">{event?.title}</h1>
            <p className="text-gray-400 text-sm mt-2">
              Ce match a déjà été confirmé le{' '}
              {event?.qr_validated_at
                ? new Date(event.qr_validated_at).toLocaleDateString('fr-FR')
                : ''}
            </p>
          </div>
          <button onClick={() => router.replace(`/events/${id}`)} className="px-8 py-4 bg-sky-500 text-white font-black uppercase rounded-2xl active:scale-95 transition-all">
            Voir l'événement
          </button>
        </div>
      )}

      {(status === 'invalid' || status === 'error') && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-28 h-28 rounded-full bg-red-500/10 border-4 border-red-500 flex items-center justify-center">
            <XCircle size={56} className="text-red-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">QR Code invalide</p>
            <p className="text-gray-400 text-sm">Ce code ne correspond à aucun match ou a expiré.</p>
          </div>
          <button onClick={() => router.replace('/events')} className="px-8 py-4 bg-white/10 text-white font-black uppercase rounded-2xl active:scale-95 transition-all">
            Retour à l'agenda
          </button>
        </div>
      )}
    </main>
  );
}

export default function ValidatePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 size={40} className="text-neon-cyan animate-spin" />
      </main>
    }>
      <ValidateContent />
    </Suspense>
  );
}
