'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Loader2, MessageSquare, Trophy, Heart, Share2, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTeam } from '@/lib/context/TeamContext';

type Post = {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  profiles: { first_name: string; last_name: string; nickname?: string; avatar_url: string };
  is_temp?: boolean;
};

/**
 * LIVE_FEED (v1.0 - NEXUS REALTIME)
 * Fil d'actualité en direct avec synchronisation instantanée.
 */
export default function LiveFeedPage() {
  const { teamInfo, theme, isPro } = useTeam();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. CHARGEMENT INITIAL (Les 20 derniers posts)
  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('feed_posts')
      .select('*, profiles:author_id(first_name, last_name, nickname, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setPosts(data as any);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();

    // 2. ÉCOUTE TEMPS RÉEL (Le "Tuyau" Nexus)
    const channel = supabase
      .channel('live_feed_global')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'feed_posts'
      }, async (payload) => {
        // On récupère le profil de l'auteur du nouveau post
        const { data: authorProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, nickname, avatar_url')
          .eq('id', payload.new.author_id)
          .single();

        const newPostWithProfile = {
          ...payload.new,
          profiles: authorProfile
        } as Post;

        // On ajoute le post en haut et on filtre les éventuels doublons temporaires
        setPosts((current) => {
          const exists = current.find(p => p.id === newPostWithProfile.id);
          if (exists) return current;
          return [newPostWithProfile, ...current.filter(p => !p.is_temp)];
        });

        if (navigator.vibrate) navigator.vibrate(50);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  // 3. ENVOI DE MESSAGE (Mode Optimiste)
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insertion réelle
      const { error } = await supabase.from('feed_posts').insert([
        { content, author_id: user.id }
      ]);

      if (error) throw error;
    } catch (error) {
      alert("Erreur de transmission...");
      fetchPosts(); // On rafraîchit en cas d'erreur
    } finally {
      setIsSending(false);
    }
  };

  const styles = isPro ? {
    bg: 'bg-gray-50',
    card: 'bg-white border-gray-100 shadow-sm',
    accent: 'bg-orange-600',
    text: 'text-gray-900'
  } : {
    bg: 'bg-[#050510]',
    card: 'bg-white/5 border-white/10',
    accent: 'bg-neon-cyan',
    text: 'text-white'
  };

  return (
    <main className={`min-h-screen pb-32 ${styles.bg} transition-colors duration-500`}>
      {/* HEADER LIVE */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 p-5 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
           <h1 className="text-xl font-black uppercase italic tracking-tighter text-white">Radio_Nexus_Live</h1>
        </div>
        <div className="text-[8px] font-black uppercase text-gray-500 tracking-[0.3em]">Secteur_Hérault</div>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-6">

        {/* COMPOSER */}
        <form onSubmit={handlePost} className={`${styles.card} p-4 rounded-3xl border-2 flex items-center gap-3 shadow-2xl`}>
           <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
              <Camera size={18} className="text-gray-500" />
           </div>
           <input
             type="text"
             value={newMessage}
             onChange={(e) => setNewMessage(e.target.value)}
             placeholder="Annoncer un but, une info..."
             className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-white placeholder:text-gray-600"
           />
           <button
             type="submit"
             disabled={!newMessage.trim() || isSending}
             className={`${styles.accent} p-3 rounded-2xl text-black active:scale-90 transition-all shadow-lg disabled:opacity-20`}
           >
             {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} strokeWidth={3} />}
           </button>
        </form>

        {/* FEED LIST */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center opacity-20">
               <Loader2 className="animate-spin mb-4" size={32} />
               <p className="text-[10px] font-black uppercase tracking-widest">Réception du flux...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-20 text-center opacity-20 italic text-xs uppercase tracking-widest">
               Aucune transmission sur le secteur...
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className={`${styles.card} p-5 rounded-[2rem] border animate-in slide-in-from-bottom-2 duration-500`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black border border-white/10 overflow-hidden">
                       <img src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author_id}`} alt="" />
                    </div>
                    <div className="text-left">
                       <p className={`text-xs font-black uppercase italic ${styles.text}`}>
                         {post.profiles?.nickname || post.profiles?.first_name || 'Inconnu'}
                       </p>
                       <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                         {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <button className="p-2 rounded-lg hover:bg-white/5 text-gray-600"><Heart size={14} /></button>
                  </div>
                </div>
                <p className={`text-sm font-medium leading-relaxed text-left ${isPro ? 'text-gray-700' : 'text-gray-300'}`}>
                   {post.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
