'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, User, ShieldCheck } from 'lucide-react';
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
  otherCoachLogo?: string;
  myLogo?: string;
  theme: 'classic' | 'nexus';
}

/**
 * NEGOTIATION_CHAT (v8.2 - UI IMPROVED)
 * Messagerie avec affichage des blasons et fond épuré.
 */
export function NegotiationChat({
  isOpen,
  onClose,
  matchRequestId,
  currentUserId,
  otherCoachName,
  otherCoachLogo,
  myLogo,
  theme
}: NegotiationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isPro = theme === 'classic';

  useEffect(() => {
    if (!isOpen || !matchRequestId) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*, profiles:sender_id(first_name, last_name)')
        .eq('match_request_id', matchRequestId)
        .order('created_at', { ascending: true });

      if (!msgError && msgData) setMessages(msgData as any);

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

    const channel = supabase
      .channel(`chat:${matchRequestId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_request_id=eq.${matchRequestId}`
      }, async (payload) => {
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
  }, [isOpen, matchRequestId, currentUserId]);

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          match_request_id: matchRequestId,
          sender_id: currentUserId,
          text: newMessage.trim()
        }]);
      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error("Erreur envoi message:", err);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className={`relative w-full max-w-md h-[85vh] sm:h-[650px] flex flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t-2 sm:border-2 overflow-hidden shadow-2xl transition-colors duration-500 ${isPro ? 'bg-white border-gray-200' : 'bg-[#0A0A0A] border-white/10'}`}>

        {/* HEADER AVEC BLASONS */}
        <div className={`p-6 border-b flex justify-between items-center ${isPro ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'}`}>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
               <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center overflow-hidden bg-black/20 ${isPro ? 'border-orange-500' : 'border-neon-cyan'} shadow-lg relative z-10`}>
                  {myLogo ? <img src={myLogo} alt="Mien" className="w-full h-full object-contain p-1" /> : <ShieldCheck size={20} className={isPro ? 'text-orange-500' : 'text-neon-cyan'} />}
               </div>
               <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center overflow-hidden bg-black/20 ${isPro ? 'border-gray-200' : 'border-white/10'} shadow-lg`}>
                  {otherCoachLogo ? <img src={otherCoachLogo} alt="Autre" className="w-full h-full object-contain p-1" /> : <ShieldCheck size={20} className="text-gray-500" />}
               </div>
            </div>
            <div className="text-left">
              <p className={`text-[10px] font-black uppercase italic ${isPro ? 'text-orange-600' : 'text-neon-cyan'}`}>
                {isPro ? 'ANNONCE MATCH AMICAL' : 'DÉFI_NEXUS'}
              </p>
              <p className={`text-xs font-black uppercase ${isPro ? 'text-gray-900' : 'text-white'}`}>Coach {otherCoachName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500"><X size={24} /></button>
        </div>

        {/* MESSAGES AREA - FOND ÉPURÉ */}
        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar ${isPro ? 'bg-gray-50/50' : 'bg-black/20'}`}
          style={{ backgroundImage: isPro ? 'none' : 'radial-gradient(circle at 50% 50%, rgba(0, 240, 255, 0.02) 0%, transparent 100%)' }}
        >
          {isLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className={`animate-spin ${isPro ? 'text-blue-600' : 'text-neon-cyan'}`} /></div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-2">
              <p className={`text-[10px] font-black uppercase tracking-widest ${isPro ? 'text-gray-500' : 'text-white'}`}>Ouvrez la négociation...</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-md ${
                    isMe
                      ? (isPro ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-neon-cyan text-black rounded-tr-none shadow-[0_0_15px_#00F0FF33]')
                      : (isPro ? 'bg-white text-gray-900 rounded-tl-none border border-gray-100' : 'bg-white/10 text-white rounded-tl-none border border-white/5')
                  }`}>
                    <p className="text-[11px] leading-relaxed font-bold">{msg.text}</p>
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
        <form onSubmit={handleSendMessage} className={`p-6 border-t ${isPro ? 'bg-white border-gray-100' : 'bg-white/5 border-white/5'}`}>
          <div className="relative flex items-center gap-3">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              className={`flex-1 rounded-2xl p-4 pr-14 text-sm font-bold outline-none transition-all border ${isPro ? 'bg-gray-100 border-gray-200 focus:border-orange-500 text-black !text-black' : 'bg-black border-white/10 focus:border-neon-cyan text-white'}`}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className={`absolute right-2 p-3 rounded-xl transition-all active:scale-90 ${isPro ? 'text-orange-600' : 'text-neon-cyan'} disabled:opacity-30`}
            >
              {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} strokeWidth={3} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
