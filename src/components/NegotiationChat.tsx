'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, ShieldCheck, CheckCircle2, Calendar, Clock, MapPin, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTeam } from '@/lib/context/TeamContext';
import { useDialogA11y } from '@/lib/hooks/useDialogA11y';

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
  profiles: { first_name: string; last_name: string };
}

interface MatchSummary {
  id: string;
  status: string;
  type: string;
  category: string;
  date: string;
  time: string;
  location: string;
  coachAId: string;
  coachBId: string;
  coachAName: string;
  coachBName: string;
  coachAClub: string;
  coachBClub: string;
  coachAConfirmed: boolean;
  coachBConfirmed: boolean;
}

interface NegotiationChatProps {
  isOpen: boolean;
  onClose: () => void;
  matchRequestId: string;
  currentUserId: string;
  otherCoachName: string;
  otherCoachLogo?: string;
  myLogo?: string;
  theme: 'classic' | 'nexus';
  matchSummary?: MatchSummary | null;
  onBothConfirmed?: () => void;
}

export function NegotiationChat({
  isOpen, onClose, matchRequestId, currentUserId,
  otherCoachName, otherCoachLogo, myLogo, theme,
  matchSummary: initialSummary = null,
  onBothConfirmed,
}: NegotiationChatProps) {
  const { teamInfo } = useTeam();
  const [messages, setMessages]         = useState<Message[]>([]);
  const [newMessage, setNewMessage]     = useState('');
  const [isLoading, setIsLoading]       = useState(true);
  const [isSending, setIsSending]       = useState(false);
  const [summary, setSummary]           = useState<MatchSummary | null>(initialSummary);
  const [isConfirming, setIsConfirming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dialogRef = useDialogA11y(isOpen, onClose);
  const isPro = theme === 'classic';

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Recharge la fiche match en temps réel
  const fetchSummary = async () => {
    const { data } = await supabase
      .from('match_requests')
      .select('*, profiles:coach_id(nickname, first_name, last_name, clubs:club_id(name))')
      .eq('id', matchRequestId)
      .single();
    if (data && (data.status === 'MATCHED' || data.status === 'PENDING' || data.status === 'POSTMATCHED')) {
      // Récupérer aussi le profil du répondant
      const { data: resp } = await supabase
        .from('profiles')
        .select('nickname, first_name, last_name, clubs:club_id(name)')
        .eq('id', data.respondent_id)
        .single();

      setSummary({
        id:              data.id,
        status:          data.status,
        type:            data.type,
        category:        data.category,
        date:            data.date,
        time:            data.time,
        location:        data.location,
        coachAId:        data.coach_id,
        coachBId:        data.respondent_id,
        coachAName:      data.profiles?.nickname || data.profiles?.first_name || 'Coach A',
        coachBName:      (resp as any)?.nickname || (resp as any)?.first_name || 'Coach B',
        coachAClub:      (data.profiles as any)?.clubs?.name || '',
        coachBClub:      (resp as any)?.clubs?.name || '',
        coachAConfirmed: data.coach_a_confirmed || false,
        coachBConfirmed: data.coach_b_confirmed || false,
      });
    }
  };

  useEffect(() => {
    if (!isOpen || !matchRequestId) return;

    const load = async () => {
      setIsLoading(true);
      const { data: msgData } = await supabase
        .from('messages')
        .select('*, profiles:sender_id(first_name, last_name)')
        .eq('match_request_id', matchRequestId)
        .order('created_at', { ascending: true });
      if (msgData) setMessages(msgData as any);
      await fetchSummary();
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    };
    load();

    const channel = supabase
      .channel(`chat:${matchRequestId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_request_id=eq.${matchRequestId}` },
        async (payload) => {
          // Éviter les doublons si le message vient de nous (déjà ajouté par handleSend)
          setMessages(prev => {
            const exists = prev.find(m => m.id === payload.new.id);
            if (exists) return prev;

            // Si c'est notre propre message (cas d'une autre session ou refresh)
            if (payload.new.sender_id === currentUserId) {
               const myMsg = { ...payload.new, profiles: { first_name: teamInfo?.userFirstName, last_name: teamInfo?.userLastName } } as Message;
               return [...prev, myMsg];
            }

            // Sinon on récupère le profil de l'autre
            supabase.from('profiles').select('first_name, last_name').eq('id', payload.new.sender_id).single()
              .then(({ data: sender }) => {
                if (sender) {
                  setMessages(current => {
                    const alreadyIn = current.find(m => m.id === payload.new.id);
                    if (alreadyIn) return current;
                    return [...current, { ...payload.new, profiles: sender } as Message];
                  });
                }
              });
            return prev;
          });
          setTimeout(scrollToBottom, 100);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'match_requests', filter: `id=eq.${matchRequestId}` },
        () => fetchSummary())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen, matchRequestId, currentUserId, teamInfo]);

  const handleConfirm = async () => {
    if (!summary || isConfirming) return;
    setIsConfirming(true);
    try {
      const isCoachA = currentUserId === summary.coachAId;
      const field    = isCoachA ? 'coach_a_confirmed' : 'coach_b_confirmed';
      await supabase.from('match_requests').update({ [field]: true }).eq('id', matchRequestId);

      // Message système
      const myName = isCoachA ? summary.coachAName : summary.coachBName;
      await supabase.from('messages').insert([{
        match_request_id: matchRequestId,
        sender_id:        currentUserId,
        text:             `✅ ${myName} a validé la fiche de match.`,
      }]);

      await fetchSummary();

      // Si les deux ont validé → créer l'événement + MATCHED
      const newA = isCoachA ? true : summary.coachAConfirmed;
      const newB = isCoachA ? summary.coachBConfirmed : true;
      if (newA && newB) {
        const { data: mr } = await supabase
          .from('match_requests')
          .select('*, tournament_config')
          .eq('id', matchRequestId).single();

        if (mr) {
          const tc = mr.tournament_config || {};
          await supabase.from('events').insert([{
            match_request_id: matchRequestId,
            title:       `${tc.home_club_name || summary.coachAClub} vs ${tc.away_club_name || summary.coachBClub}`,
            type:        'match',
            date:        mr.date,
            time:        mr.time,
            location:    `${mr.stadium || ''} ${mr.city || ''}`.trim() || 'À définir',
            city:        mr.city,
            stadium_name: mr.stadium,
            home_club_id: tc.home_club_id || null,
            away_club_id: tc.away_club_id || null,
            status:      'scheduled',
            created_by:  currentUserId,
            tournament_config: { is_official: false, from_radar: true },
          }]);
          await supabase.from('match_requests').update({ status: 'MATCHED' }).eq('id', matchRequestId);
        }

        await supabase.from('messages').insert([{
          match_request_id: matchRequestId,
          sender_id:        currentUserId,
          text:             "🎉 Match confirmé par les deux coachs ! L'événement est dans vos agendas.",
        }]);
        onBothConfirmed?.();
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const text = newMessage.trim();
    setNewMessage('');

    // MISE À JOUR OPTIMISTE (AFFICHAGE INSTANTANÉ)
    const tempId = 'temp-' + Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      sender_id: currentUserId,
      text,
      created_at: new Date().toISOString(),
      profiles: {
        first_name: teamInfo?.userFirstName || 'Moi',
        last_name: teamInfo?.userLastName || ''
      }
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    setIsSending(true);
    try {
      const { data, error } = await supabase.from('messages').insert([{
        match_request_id: matchRequestId,
        sender_id: currentUserId,
        text
      }]).select().single();

      if (error) throw error;

      // Remplacer le message temporaire par le message réel avec le bon ID Supabase
      if (data) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...data, profiles: optimisticMsg.profiles } : m));
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      alert("Échec de l'envoi");
    } finally { setIsSending(false); }
  };

  if (!isOpen) return null;

  const amCoachA  = summary?.coachAId === currentUserId;
  const iConfirmed = summary ? (amCoachA ? summary.coachAConfirmed : summary.coachBConfirmed) : false;
  const bothDone   = summary?.coachAConfirmed && summary?.coachBConfirmed;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Négociation de match avec ${otherCoachName}`}
        tabIndex={-1}
        className={`relative w-full max-w-md h-[90vh] sm:h-[700px] flex flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t-2 sm:border-2 overflow-hidden shadow-2xl outline-none
        ${isPro ? 'bg-white border-gray-200' : 'bg-[#0A0A0A] border-white/10'}`}>

        {/* HEADER */}
        <div className={`p-5 border-b flex justify-between items-center shrink-0 ${isPro ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'}`}>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              <div className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center overflow-hidden bg-black/20 ${isPro ? 'border-orange-500' : 'border-neon-cyan'} relative z-10`}>
                {myLogo ? <img src={myLogo} alt="" className="w-full h-full object-contain p-1" /> : <ShieldCheck size={18} className={isPro ? 'text-orange-500' : 'text-neon-cyan'} aria-hidden="true" />}
              </div>
              <div className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center overflow-hidden bg-black/20 ${isPro ? 'border-gray-200' : 'border-white/10'}`}>
                {otherCoachLogo ? <img src={otherCoachLogo} alt="" className="w-full h-full object-contain p-1" /> : <ShieldCheck size={18} className="text-gray-500" aria-hidden="true" />}
              </div>
            </div>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest ${isPro ? 'text-orange-600' : 'text-neon-cyan'}`}>
                {isPro ? 'Négociation Match' : 'Défi_Nexus'}
              </p>
              <p className={`text-xs font-black uppercase ${isPro ? 'text-gray-900' : 'text-white'}`}>Coach {otherCoachName}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500"><X size={22} aria-hidden="true" /></button>
        </div>

        {/* FICHE MATCH ÉPINGLÉE (visible seulement si MATCHED) */}
        {summary && (
          <div className={`shrink-0 mx-4 mt-4 rounded-[1.5rem] border-2 overflow-hidden
            ${bothDone
              ? 'border-[#39FF14] bg-[#39FF14]/5'
              : isPro ? 'border-orange-200 bg-orange-50' : 'border-neon-cyan/30 bg-neon-cyan/5'}`}>

            {/* Titre fiche */}
            <div className={`px-5 py-3 flex items-center justify-between border-b
              ${bothDone ? 'border-[#39FF14]/20' : isPro ? 'border-orange-100' : 'border-white/5'}`}>
              <div className="flex items-center gap-2">
                <Trophy size={14} className={bothDone ? 'text-[#39FF14]' : isPro ? 'text-orange-600' : 'text-neon-cyan'} />
                <span className={`text-[10px] font-black uppercase tracking-widest
                  ${bothDone ? 'text-[#39FF14]' : isPro ? 'text-orange-600' : 'text-neon-cyan'}`}>
                  {bothDone ? '🎉 Match Confirmé !' : '📋 Fiche de Match — À valider'}
                </span>
              </div>
            </div>

            {/* Détails */}
            <div className="px-5 py-4 space-y-2">
              <div className={`text-center text-sm font-black uppercase italic ${isPro ? 'text-gray-900' : 'text-white'}`}>
                {summary.coachAClub} <span className={`${isPro ? 'text-orange-500' : 'text-neon-cyan'}`}>vs</span> {summary.coachBClub}
              </div>
              <div className={`text-[10px] font-bold uppercase text-center ${isPro ? 'text-gray-400' : 'text-gray-500'}`}>
                {summary.category} • {summary.type}
                {summary.coachAName && summary.coachBName && (
                  <span className="ml-2 opacity-70">— {summary.coachAName} vs {summary.coachBName}</span>
                )}
              </div>
              <div className="flex items-center justify-center gap-4 pt-1">
                <span className={`flex items-center gap-1 text-[10px] font-black ${isPro ? 'text-gray-700' : 'text-gray-300'}`}>
                  <Calendar size={11} /> {new Date(summary.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className={`flex items-center gap-1 text-[10px] font-black ${isPro ? 'text-gray-700' : 'text-gray-300'}`}>
                  <Clock size={11} /> {summary.time?.slice(0, 5)}
                </span>
                <span className={`flex items-center gap-1 text-[10px] font-black ${isPro ? 'text-gray-700' : 'text-gray-300'}`}>
                  <MapPin size={11} /> {summary.location}
                </span>
              </div>
            </div>

            {/* Statuts de validation */}
            <div className={`px-5 pb-4 flex items-center justify-between gap-3`}>
              <ValidationChip
                name={summary.coachAName} confirmed={summary.coachAConfirmed}
                isMe={amCoachA} isPro={isPro}
              />
              <ValidationChip
                name={summary.coachBName} confirmed={summary.coachBConfirmed}
                isMe={!amCoachA} isPro={isPro}
              />
            </div>

            {/* Bouton Je valide (si pas encore validé et pas les deux) */}
            {!iConfirmed && !bothDone && (
              <div className="px-5 pb-5">
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className={`w-full py-4 rounded-2xl font-black uppercase italic text-sm flex items-center justify-center gap-2 active:scale-95 transition-all
                    ${isPro ? 'bg-orange-600 text-white' : 'bg-neon-cyan text-black'}`}
                >
                  {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  ✅ Je valide ce match
                </button>
              </div>
            )}
          </div>
        )}

        {/* MESSAGES */}
        <div ref={scrollRef} className={`flex-1 overflow-y-auto p-5 space-y-3 no-scrollbar ${isPro ? 'bg-gray-50/50' : 'bg-black/20'}`}>
          {isLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className={`animate-spin ${isPro ? 'text-orange-500' : 'text-neon-cyan'}`} /></div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center opacity-30">
              <p className={`text-[10px] font-black uppercase tracking-widest ${isPro ? 'text-gray-500' : 'text-white'}`}>Ouvrez la négociation...</p>
            </div>
          ) : messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            const isSystem = msg.text.startsWith('✅') || msg.text.startsWith('❌') || msg.text.startsWith('🎉');
            if (isSystem) return (
              <div key={msg.id} className="flex justify-center">
                <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full ${isPro ? 'bg-gray-100 text-gray-500' : 'bg-white/10 text-gray-400'}`}>
                  {msg.text}
                </span>
              </div>
            );
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-md ${
                  isMe
                    ? (isPro ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-neon-cyan text-black rounded-tr-none')
                    : (isPro ? 'bg-white text-gray-900 rounded-tl-none border border-gray-100' : 'bg-white/10 text-white rounded-tl-none border border-white/5')
                }`}>
                  <p className="text-[11px] leading-relaxed font-bold">{msg.text}</p>
                  <p className={`text-[7px] font-black uppercase mt-1.5 opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* INPUT */}
        <form onSubmit={handleSend} className={`p-5 border-t shrink-0 ${isPro ? 'bg-white border-gray-100' : 'bg-white/5 border-white/5'}`}>
          <div className="relative flex items-center gap-3">
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              className={`flex-1 rounded-2xl p-4 pr-14 text-sm font-bold outline-none border transition-all
                ${isPro ? 'bg-gray-100 border-gray-200 focus:border-orange-500 text-black' : 'bg-black border-white/10 focus:border-neon-cyan text-white'}`}
            />
            <button type="submit" disabled={!newMessage.trim() || isSending}
              className={`absolute right-2 p-3 rounded-xl transition-all active:scale-90 ${isPro ? 'text-orange-600' : 'text-neon-cyan'} disabled:opacity-30`}>
              {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} strokeWidth={3} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ValidationChip({ name, confirmed, isMe, isPro }: { name: string; confirmed: boolean; isMe: boolean; isPro: boolean }) {
  return (
    <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all
      ${confirmed
        ? 'border-[#39FF14] bg-[#39FF14]/10'
        : isPro ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-white/5'}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0
        ${confirmed ? 'bg-[#39FF14]' : isPro ? 'bg-gray-200' : 'bg-white/10'}`}>
        {confirmed && <CheckCircle2 size={12} className="text-black" />}
      </div>
      <div className="min-w-0">
        <p className={`text-[9px] font-black uppercase truncate ${confirmed ? 'text-[#39FF14]' : isPro ? 'text-gray-500' : 'text-gray-500'}`}>
          {name} {isMe ? '(moi)' : ''}
        </p>
        <p className={`text-[8px] uppercase font-bold ${confirmed ? 'text-[#39FF14]/70' : isPro ? 'text-gray-400' : 'text-gray-600'}`}>
          {confirmed ? 'Validé ✓' : 'En attente...'}
        </p>
      </div>
    </div>
  );
}
