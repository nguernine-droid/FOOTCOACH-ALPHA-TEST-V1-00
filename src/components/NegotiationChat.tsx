'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, User } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface NegotiationChatProps {
  isOpen: boolean;
  onClose: () => void;
  matchRequestId: string;
  currentUserId: string;
  otherCoachName: string;
  theme: 'classic' | 'nexus';
}

/**
 * NEGOTIATION_CHAT (v8.1 - ALPHA TEST V1)
 * Messagerie instantanée en temps réel pour finaliser l'organisation du match.
 */
export function NegotiationChat({
  isOpen,
  onClose,
  matchRequestId,
  currentUserId,
  otherCoachName,
  theme
}: NegotiationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isPro = theme === 'classic';

  // 1. CHARGEMENT ET ABONNEMENT TEMPS RÉEL
  useEffect(() => {
    if (!isOpen || !matchRequestId) return;

    const fetchMessages = async () => {
      setIsLoading(true);

      // Récupérer les messages
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*, profiles:sender_id(first_name, last_name)')
        .eq('match_request_id', matchRequestId)
        .order('created_at', { ascending: true });

      if (!msgError && msgData) setMessages(msgData as any);

      // Récupérer mon téléphone
      const { data: profileData } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', currentUserId)
        .single();

      if (profileData?.phone) setCurrentUserPhone(profileData.phone);

      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    };

    fetchMessages();

    // Souscription Realtime
    const channel = supabase
      .channel(`chat:${matchRequestId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_request_id=eq.${matchRequestId}`
      }, async (payload) => {
        // On récupère les infos du sender pour le nouveau message
        const { data: senderData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', payload.new.sender_id)
          .single();

        const msgWithProfile = { ...payload.new, profiles: senderData } as Message;
        setMessages(prev => [...prev, msgWithProfile]);
        setTimeout(scrollToBottom, 100);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, matchRequestId]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(newMessage);
    setNewMessage('');
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;
    setIsSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          match_request_id: matchRequestId,
          sender_id: currentUserId,
          text: text.trim()
        }]);
      if (error) throw error;
    } catch (err) {
      console.error("Erreur envoi message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSharePhone = async () => {
    if (!currentUserPhone) {
      alert("Aucun numéro de téléphone configuré dans votre profil.");
      return;
    }
    await sendMessage(`📞 Mon numéro est le : ${currentUserPhone}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className={`relative w-full max-w-md h-[80vh] sm:h-[600px] flex flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t-2 sm:border-2 overflow-hidden shadow-2xl transition-colors duration-500 ${isPro ? 'bg-white border-gray-200' : 'bg-[#0A0A0A] border-white/10'}`}>

        {/* HEADER */}
        <div className={`p-6 border-b flex justify-between items-center ${isPro ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPro ? 'bg-blue-600 text-white' : 'bg-neon-cyan text-black shadow-[0_0_10px_#00F0FF]'}`}>
              <User size={20} />
            </div>
            <div className="text-left">
              <p className={`text-xs font-black uppercase italic ${isPro ? 'text-gray-900' : 'text-white'}`}>Discussion_Nexus</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Avec Coach {otherCoachName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500"><X size={24} /></button>
        </div>

        {/* MESSAGES AREA */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-90">
          {isLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className={`animate-spin ${isPro ? 'text-blue-600' : 'text-neon-cyan'}`} /></div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-2">
              <MessageSquare size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest">Ouvrez la négociation...</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-lg ${
                    isMe
                      ? (isPro ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-neon-cyan text-black rounded-tr-none shadow-[0_0_15px_#00F0FF33]')
                      : (isPro ? 'bg-gray-100 text-gray-900 rounded-tl-none border border-gray-200' : 'bg-white/10 text-white rounded-tl-none border border-white/5')
                  }`}>
                    <p className="text-[11px] leading-relaxed">{msg.text}</p>
                    <p className={`text-[7px] font-black uppercase mt-2 opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* INPUT AREA */}
        <form onSubmit={handleSendMessage} className={`p-6 border-t ${isPro ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'}`}>
          <div className="flex flex-col gap-3">
            {currentUserPhone && (
              <button
                type="button"
                onClick={handleSharePhone}
                className={`w-fit self-center px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105 active:scale-95 ${isPro ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan shadow-[0_0_10px_#00F0FF33]'}`}
              >
                📞 Partager mon numéro
              </button>
            )}
            <div className="relative flex items-center gap-3">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Écrire un message..."
                className={`flex-1 rounded-2xl p-4 pr-14 text-sm font-bold outline-none transition-all border ${isPro ? 'bg-white border-gray-200 focus:border-blue-600' : 'bg-black border-white/10 focus:border-neon-cyan text-white'}`}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className={`absolute right-2 p-3 rounded-xl transition-all active:scale-90 ${isPro ? 'text-blue-600' : 'text-neon-cyan'} disabled:opacity-30`}
              >
                {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} strokeWidth={3} />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageSquare({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
