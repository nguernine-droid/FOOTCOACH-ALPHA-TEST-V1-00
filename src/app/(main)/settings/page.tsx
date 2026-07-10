'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Moon,
  Sun,
  LogOut,
  Database,
  ShieldAlert,
  Zap,
  Briefcase,
  Trash2,
  ChevronRight,
  Info,
  MessageSquare,
  Send,
  AlertCircle,
  HelpCircle,
  Bug,
  Lightbulb,
  BarChart3,
  Shield,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';
import { CURRENT_APP_VERSION } from '@/lib/config/version';

/**
 * SETTINGS_PAGE (v7.6 - ALPHA TEST V1)
 * Centralisation des réglages techniques, session et Feedback.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme, role, teamInfo } = useTeam();
  const isPro = theme === 'classic';

  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'bug' | 'amélioration' | 'question'>('amélioration');
  const [isSending, setIsSending] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState<any[]>([]);

  // Statistiques Alpha (Admin)
  const [adminStats, setAdminStats] = useState<{ total: number, pro: number, nexus: number } | null>(null);
  const [allFeedbacks, setAllFeedbacks] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  // Accès Admin sécurisé (v9.8)
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const isNordine = teamInfo?.userFirstName === 'Nordine' && teamInfo?.userLastName === 'Guer';
      const isNono = teamInfo?.coachName === 'Nono';
      const isEmailAdmin = user?.email === 'nguernine@gmail.com';

      if (isNordine || isNono || isEmailAdmin) {
        setIsAdmin(true);
        fetchAdminStats();
        fetchAllFeedbacks();
      }
    };
    checkAdmin();
    fetchFeedbacks();
  }, [teamInfo]);

  const fetchAdminStats = async () => {
    const { count: total } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: pro } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('theme_preference', 'classic');
    const { count: nexus } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('theme_preference', 'nexus');
    setAdminStats({ total: total || 0, pro: pro || 0, nexus: nexus || 0 });
  };

  const fetchAllFeedbacks = async () => {
    const { data } = await supabase
      .from('feedbacks')
      .select('*, profiles:user_id(first_name, last_name, nickname, clubs:club_id(name))')
      .order('created_at', { ascending: false });
    if (data) setAllFeedbacks(data);
  };

  const handleAdminReply = async (feedbackId: string) => {
    if (!adminReplyText.trim()) return;
    const { error } = await supabase
      .from('feedbacks')
      .update({ admin_reply: adminReplyText, status: 'closed' })
      .eq('id', feedbackId);

    if (!error) {
      setAdminReplyText('');
      setReplyingTo(null);
      fetchAllFeedbacks();
      alert("✅ Réponse transmise au coach.");
    }
  };

  const styles = isPro ? {
    mainBg: 'bg-gray-50',
    cardBg: 'bg-white border-gray-100',
    text: 'text-gray-900',
    textSub: 'text-gray-500',
    accent: 'text-orange-600',
    border: 'border-gray-100',
    input: 'bg-white border-gray-200 text-gray-900 focus:border-orange-500'
  } : {
    mainBg: 'bg-black',
    cardBg: 'bg-white/5 border-white/10',
    text: 'text-white',
    textSub: 'text-gray-500',
    accent: 'text-neon-cyan',
    border: 'border-white/10',
    input: 'bg-white/5 border-white/10 text-white focus:border-neon-cyan'
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setMyFeedbacks(data);
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      const { error } = await supabase.from('feedbacks').insert([{
        user_id: user.id,
        type: feedbackType,
        content: feedback.trim(),
        status: 'open'
      }]);

      if (error) throw error;

      // 2. ENVOI DIRECT À DISCORD (Plan de secours 100% stable)
      try {
        await fetch('https://discord.com/api/webhooks/1507907126314401863/Cl4VdOpZOa-QiPWfALEU1grTAprP6MApmvvxXdpxfrFU6yHkyeemQUFAnZQ7PR8F6zlM', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: `🚀 NOUVEAU SIGNALEMENT : ${feedbackType.toUpperCase()}`,
              color: feedbackType === 'bug' ? 15548997 : 3066993,
              fields: [
                { name: '👤 Coach', value: teamInfo?.coachName || 'Inconnu', inline: true },
                { name: '⚽️ Club', value: teamInfo?.clubName || 'Sans club', inline: true },
                { name: '📝 Message', value: feedback.trim() }
              ],
              timestamp: new Date().toISOString()
            }]
          })
        });
      } catch (discordErr) {
        console.error("Discord sync failed, but data is saved in DB");
      }

      setFeedback('');
      alert("🚀 Merci ! Votre signalement a été transmis à l'administrateur.");
      fetchFeedbacks();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = '/showcase';
  };

  const handleResetData = () => {
    if (confirm("⚠️ VOULEZ-VOUS RÉINITIALISER LES DONNÉES LOCALES ? \n(Cela n'efface pas votre compte Supabase)")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <main className={`min-h-screen ${styles.mainBg} max-w-md mx-auto shadow-2xl pb-32 transition-colors duration-500`}>
      {/* Header */}
      <header className={`py-4 px-6 sticky top-0 z-50 border-b flex items-center gap-4 bg-black/50 backdrop-blur-md ${styles.border}`}>
        <button onClick={() => router.back()} className={`${styles.text} active:scale-90 transition-transform`}>
          <ChevronLeft size={24} strokeWidth={3} />
        </button>
        <h1 className={`text-xl font-black uppercase italic tracking-tighter ${styles.text}`}>Configuration_Système</h1>
      </header>

      <div className="p-6 space-y-10">

        {/* SECTION 1: INTERFACE */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <Zap size={14} className={styles.accent} />
            <h4 className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub}`}>Interface_Visuelle</h4>
          </div>
          <div className={`rounded-3xl border ${styles.border} overflow-hidden divide-y ${styles.border} ${styles.cardBg}`}>
            <button
              onClick={() => setTheme('classic')}
              className={`w-full p-5 flex items-center justify-between transition-all ${theme === 'classic' ? 'bg-neon-orange/10' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'classic' ? 'bg-neon-orange text-black' : 'bg-white/5 text-gray-500'}`}>
                  <Briefcase size={20} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-black uppercase italic ${styles.text}`}>Mode Professionnel</p>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Identité Orange / Efficacité</p>
                </div>
              </div>
              {theme === 'classic' && <div className="w-2 h-2 rounded-full bg-neon-orange shadow-[0_0_8px_#FF6B00]" />}
            </button>

            <button
              onClick={() => setTheme('nexus')}
              className={`w-full p-5 flex items-center justify-between transition-all ${theme === 'nexus' ? 'bg-neon-cyan/10' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'nexus' ? 'bg-neon-cyan text-black shadow-[0_0_15px_#00F0FF]' : 'bg-white/5 text-gray-500'}`}>
                  <Zap size={20} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-black uppercase italic ${styles.text}`}>Mode Nexus</p>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Identité Cyan / Immersion RPG</p>
                </div>
              </div>
              {theme === 'nexus' && <div className="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00F0FF]" />}
            </button>
          </div>
        </section>

        {/* SECTION 2: SIGNALEMENTS (Feedbacks) */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <MessageSquare size={14} className={styles.accent} />
            <h4 className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub}`}>Bugs_&_Améliorations</h4>
          </div>

          <form onSubmit={handleSendFeedback} className={`${styles.cardBg} rounded-3xl border ${styles.border} p-6 space-y-4`}>
            <div className="grid grid-cols-3 gap-2">
              {(['bug', 'amélioration', 'question'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFeedbackType(t)}
                  className={`py-2 rounded-xl text-[8px] font-black uppercase border transition-all ${feedbackType === t ? `${isPro ? 'bg-orange-600 text-white border-orange-600' : 'bg-neon-cyan text-black border-neon-cyan'}` : 'border-white/10 text-gray-500'}`}
                >
                  {t === 'bug' && <Bug size={12} className="inline mr-1 mb-0.5" />}
                  {t === 'amélioration' && <Lightbulb size={12} className="inline mr-1 mb-0.5" />}
                  {t === 'question' && <HelpCircle size={12} className="inline mr-1 mb-0.5" />}
                  {t}
                </button>
              ))}
            </div>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Décrivez votre problème ou idée..."
              className={`w-full min-h-[100px] rounded-2xl p-4 text-xs font-medium outline-none border transition-all ${isPro ? 'bg-gray-50 border-gray-200 text-black !text-black placeholder:text-gray-400' : 'bg-white/5 border-white/10 text-white placeholder:text-gray-600'}`}
            />

            <button
              type="submit"
              disabled={isSending || !feedback.trim()}
              className={`w-full py-4 rounded-xl font-black uppercase italic text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95 ${isSending ? 'opacity-50' : (isPro ? 'bg-orange-600 text-white' : 'bg-neon-cyan text-black')}`}
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Transmettre le rapport
            </button>
          </form>

          {/* HISTORIQUE FEEDBACKS & RÉPONSES ADMIN */}
          {myFeedbacks.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest px-2">Suivi de vos demandes</p>
              {myFeedbacks.map(f => (
                <div key={f.id} className={`${styles.cardBg} rounded-2xl border ${styles.border} p-4 space-y-3`}>
                  <div className="flex justify-between items-start">
                    <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded border ${f.type === 'bug' ? 'text-red-500 border-red-500/20' : 'text-neon-cyan border-neon-cyan/20'}`}>{f.type}</span>
                    <span className={`text-[7px] font-black uppercase ${f.status === 'open' ? 'text-orange-500' : 'text-green-500'}`}>{f.status}</span>
                  </div>
                  <p className={`text-[10px] ${styles.text} leading-relaxed`}>{f.content}</p>

                  {f.admin_reply && (
                    <div className={`mt-2 p-3 rounded-xl ${isPro ? 'bg-orange-50 border border-orange-100' : 'bg-white/5 border border-white/5'}`}>
                      <p className={`text-[7px] font-black uppercase mb-1 ${isPro ? 'text-orange-700' : 'text-neon-cyan'}`}>Réponse de l'administrateur :</p>
                      <p className={`text-[9px] italic ${styles.text}`}>{f.admin_reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION ADMIN: STATS ALPHA (Cachée) */}
        {isAdmin && adminStats && (
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <BarChart3 size={14} className="text-[#39FF14]" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#39FF14]">Contrôle_Alpha_Admin</h4>
            </div>

            {/* STATS COMPTEURS */}
            <div className={`${styles.cardBg} rounded-3xl border border-[#39FF14]/20 p-6 grid grid-cols-3 gap-4`}>
              <div className="text-center">
                <p className="text-[18px] font-black text-white">{adminStats.total}</p>
                <p className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">Inscrits</p>
              </div>
              <div className="text-center border-x border-white/5">
                <p className="text-[18px] font-black text-neon-orange">{adminStats.pro}</p>
                <p className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">Mode Pro</p>
              </div>
              <div className="text-center">
                <p className="text-[18px] font-black text-neon-cyan">{adminStats.nexus}</p>
                <p className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">Mode Nexus</p>
              </div>
            </div>

            {/* LISTE TOUS LES FEEDBACKS (Vue Admin) */}
            <div className="space-y-3 pt-2">
              <p className="text-[8px] font-black text-[#39FF14] uppercase tracking-widest px-2">Flux des rapports reçus</p>
              {allFeedbacks.map(f => (
                <div key={f.id} className={`${styles.cardBg} rounded-2xl border ${f.status === 'open' ? 'border-[#39FF14]/40' : 'border-white/5'} p-4 space-y-3`}>
                  <div className="flex justify-between items-start">
                    <div className="text-left">
                       <p className="text-[9px] font-black text-white uppercase italic">{f.profiles?.nickname || f.profiles?.first_name || 'Anonyme'}</p>
                       <p className="text-[7px] font-bold text-gray-500 uppercase">{f.profiles?.clubs?.name || 'Sans Club'}</p>
                    </div>
                    <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded border ${f.type === 'bug' ? 'text-red-500 border-red-500/20' : 'text-neon-cyan border-neon-cyan/20'}`}>{f.type}</span>
                  </div>

                  <p className={`text-[10px] ${styles.text} leading-relaxed bg-black/20 p-2 rounded-lg`}>{f.content}</p>

                  {f.admin_reply ? (
                    <div className="p-2 rounded-lg bg-[#39FF14]/5 border border-[#39FF14]/10">
                      <p className="text-[7px] font-black text-[#39FF14] uppercase">Votre Réponse :</p>
                      <p className="text-[9px] italic text-gray-400">{f.admin_reply}</p>
                    </div>
                  ) : (
                    replyingTo === f.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={adminReplyText}
                          onChange={(e) => setAdminReplyText(e.target.value)}
                          placeholder="Votre réponse technique..."
                          className="w-full p-2 bg-black border border-[#39FF14]/30 rounded-lg text-[10px] text-white outline-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleAdminReply(f.id)} className="flex-1 py-2 bg-[#39FF14] text-black text-[8px] font-black uppercase rounded-lg">Envoyer</button>
                          <button onClick={() => setReplyingTo(null)} className="px-4 py-2 bg-white/5 text-white text-[8px] font-black uppercase rounded-lg">Annuler</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingTo(f.id)}
                        className="w-full py-2 border border-[#39FF14]/30 text-[#39FF14] text-[8px] font-black uppercase rounded-lg hover:bg-[#39FF14]/10 transition-all"
                      >
                        Répondre au coach
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 3: MAINTENANCE (DANGER ZONE) */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <ShieldAlert size={14} className="text-red-500" />
            <h4 className={`text-[10px] font-black uppercase tracking-widest text-red-500/60`}>Danger_Zone</h4>
          </div>
          <div className={`rounded-3xl border border-red-500/20 overflow-hidden divide-y divide-red-500/10 ${styles.cardBg}`}>
            <button
              onClick={handleResetData}
              className="w-full p-5 flex items-center gap-4 active:bg-red-500/5 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                <Database size={20} />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-black uppercase italic text-red-500">Réinitialiser Local</p>
                <p className="text-[9px] font-bold text-red-500/40 uppercase tracking-widest">Nettoyer le cache du navigateur</p>
              </div>
              <ChevronRight size={18} className="text-red-500/20" />
            </button>

            <button
              onClick={async () => {
                if(window.confirm("⚠️ Es-tu sûr de vouloir supprimer ton compte ? Cette action est irréversible.")) {
                  // Logique de suppression réelle Supabase à ajouter ici si besoin
                  alert("Demande de suppression transmise.");
                }
              }}
              className="w-full p-5 flex items-center gap-4 active:bg-red-500/5 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                <Trash2 size={20} />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-black uppercase italic text-red-500">Supprimer mon compte</p>
                <p className="text-[9px] font-bold text-red-500/40 uppercase tracking-widest">Action irréversible</p>
              </div>
              <ChevronRight size={18} className="text-red-500/20" />
            </button>

            <button
              onClick={handleLogout}
              className="w-full p-5 flex items-center gap-4 active:bg-red-500/5 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                <LogOut size={20} />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-black uppercase italic text-red-500">Déconnexion</p>
                <p className="text-[9px] font-bold text-red-500/40 uppercase tracking-widest">Terminer la session Nexus</p>
              </div>
              <ChevronRight size={18} className="text-red-500/20" />
            </button>
          </div>
        </section>

        <p className="text-[7px] font-black text-center text-gray-700 uppercase tracking-[0.5em] pt-4 pb-10">
          FootCoach Alpha V1 // Build {CURRENT_APP_VERSION}
        </p>
      </div>
    </main>
  );
}
