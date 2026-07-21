'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Loader2, Camera, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTeam } from '@/lib/context/TeamContext';

// --- PONT IMAGE (temporaire, sans colonne DB dédiée) --------------------------
// La table feed_posts n'a pas encore de colonne `image_url` (cf. BACKEND-TODO.md).
// En attendant, on encode l'URL de l'image dans `content` via un marqueur, puis on
// la ré-extrait à l'affichage. À migrer vers une vraie colonne `image_url` plus tard.
const IMG_MARKER = '::img::';
const FEED_BUCKET = 'feed-media'; // bucket Storage à créer (cf. BACKEND-TODO.md)

function encodeContent(text: string, imageUrl: string | null): string {
  const t = text.trim();
  if (!imageUrl) return t;
  return `${t}\n\n${IMG_MARKER}${imageUrl}`;
}

function decodeContent(raw: string | null): { text: string; image: string | null } {
  if (!raw) return { text: '', image: null };
  const i = raw.lastIndexOf(IMG_MARKER);
  if (i === -1) return { text: raw, image: null };
  const image = raw.slice(i + IMG_MARKER.length).trim();
  const text = raw.slice(0, i).replace(/\s+$/, '');
  return { text, image: image || null };
}

// "14:32" si aujourd'hui, sinon "12 juil. 14:32"
function formatPostDate(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const isToday = d.toDateString() === new Date().toDateString();
  return isToday ? time : `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${time}`;
}

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  // 3. ENVOI DE MESSAGE (texte et/ou image)
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    // On autorise l'envoi si texte OU image présent.
    if ((!newMessage.trim() && !imageFile) || isSending) return;

    const text = newMessage.trim();
    const fileToUpload = imageFile;
    setIsSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload de l'image si présente
      let imageUrl: string | null = null;
      if (fileToUpload) {
        const fileExt = fileToUpload.name.split('.').pop();
        const filePath = `posts/${user.id}-${Date.now()}.${fileExt}`;
        const { error: upErr } = await supabase.storage
          .from(FEED_BUCKET)
          .upload(filePath, fileToUpload, { upsert: true, cacheControl: '3600' });
        if (upErr) {
          // Le plus souvent : bucket 'feed-media' inexistant (cf. BACKEND-TODO.md).
          throw new Error(
            "Envoi de l'image impossible. Le stockage des photos n'est pas encore configuré " +
            "(bucket 'feed-media'). Voir BACKEND-TODO.md."
          );
        }
        imageUrl = supabase.storage.from(FEED_BUCKET).getPublicUrl(filePath).data.publicUrl;
      }

      const content = encodeContent(text, imageUrl);
      const { error } = await supabase.from('feed_posts').insert([
        { content, author_id: user.id }
      ]);
      if (error) throw error;

      // Succès : on nettoie le composer
      setNewMessage('');
      clearImage();
    } catch (error: any) {
      alert(error?.message || "Erreur de transmission...");
      fetchPosts(); // On rafraîchit en cas d'erreur
    } finally {
      setIsSending(false);
    }
  };

  const styles = isPro ? {
    bg: 'bg-gray-50',
    header: 'bg-white/90 border-gray-100',
    card: 'bg-white border-gray-100 shadow-sm',
    accent: 'bg-orange-600',
    accentIcon: 'text-white',
    text: 'text-gray-900',
    input: 'text-gray-900 placeholder:text-gray-400',
    inputIcon: 'bg-gray-50 border-gray-100 text-gray-400'
  } : {
    bg: 'bg-[#15171C]',
    header: 'bg-[#15171C]/80 border-white/10',
    card: 'bg-white/5 border-white/10',
    accent: 'bg-neon-cyan',
    accentIcon: 'text-black',
    text: 'text-white',
    input: 'text-white placeholder:text-gray-600',
    inputIcon: 'bg-white/5 border-white/10 text-gray-500'
  };

  return (
    <main className={`min-h-screen pb-32 ${styles.bg} transition-colors duration-500`}>
      {/* HEADER LIVE */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b p-5 flex justify-between items-center ${styles.header}`}>
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
           <h1 className={`text-xl font-black uppercase italic tracking-tighter ${styles.text}`}>
             {isPro ? 'Fil d\'actualité' : 'Radio_Nexus_Live'}
           </h1>
        </div>
        <div className="text-[9px] font-black uppercase text-gray-500 tracking-[0.3em] truncate max-w-[40%]">
          {teamInfo?.clubName || 'Mon club'}
        </div>
      </header>

      <div className="p-4 max-w-md lg:max-w-3xl mx-auto space-y-6">

        {/* COMPOSER */}
        <form onSubmit={handlePost} className={`${styles.card} p-4 rounded-3xl border-2 shadow-2xl space-y-3`}>
           <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden ${styles.inputIcon}`}>
                {teamInfo?.coachPhoto
                  ? <img src={teamInfo.coachPhoto} alt="" className="w-full h-full object-cover" />
                  : <Camera size={18} />}
             </div>
             <input
               type="text"
               value={newMessage}
               onChange={(e) => setNewMessage(e.target.value)}
               placeholder={isPro ? "Partagez une info, un résultat..." : "Émettre un signal..."}
               className={`flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-bold ${styles.input}`}
             />
             {/* Bouton photo */}
             <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
             <button
               type="button"
               aria-label="Ajouter une photo"
               onClick={() => fileInputRef.current?.click()}
               className={`p-3 rounded-2xl border active:scale-90 transition-all ${styles.inputIcon}`}
             >
               <ImageIcon size={18} />
             </button>
             <button
               type="submit"
               aria-label="Publier"
               disabled={(!newMessage.trim() && !imageFile) || isSending}
               className={`${styles.accent} p-3 rounded-2xl ${styles.accentIcon} active:scale-90 transition-all shadow-lg disabled:opacity-20`}
             >
               {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} strokeWidth={3} />}
             </button>
           </div>

           {/* Aperçu de l'image sélectionnée */}
           {imagePreview && (
             <div className="relative w-full">
               <img src={imagePreview} alt="Aperçu" className="w-full max-h-72 object-cover rounded-2xl border border-white/10" />
               <button
                 type="button"
                 onClick={clearImage}
                 aria-label="Retirer la photo"
                 className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm active:scale-90"
               >
                 <X size={16} />
               </button>
             </div>
           )}
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
            posts.map((post) => {
              const { text, image } = decodeContent(post.content);
              return (
              <div key={post.id} className={`${styles.card} p-5 rounded-[2rem] border animate-in slide-in-from-bottom-2 duration-500`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border overflow-hidden ${styles.inputIcon}`}>
                       <img src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author_id}`} alt="" />
                    </div>
                    <div className="text-left">
                       <p className={`text-xs font-black uppercase italic ${styles.text}`}>
                         {post.profiles?.nickname || post.profiles?.first_name || 'Inconnu'}
                       </p>
                       <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                         {formatPostDate(post.created_at)}
                       </p>
                    </div>
                  </div>
                </div>
                {text && (
                  <p className={`text-sm font-medium leading-relaxed text-left whitespace-pre-wrap ${isPro ? 'text-gray-700' : 'text-gray-300'}`}>
                     {text}
                  </p>
                )}
                {image && (
                  <img
                    src={image}
                    alt=""
                    className={`w-full max-h-[30rem] object-cover rounded-2xl border ${text ? 'mt-3' : ''} ${isPro ? 'border-gray-100' : 'border-white/10'}`}
                  />
                )}
              </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
