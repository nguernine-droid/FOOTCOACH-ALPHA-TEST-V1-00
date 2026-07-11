'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Megaphone,
  Check,
  Users,
  Bell,
  BarChart2,
  AlertCircle,
  Camera,
  Plus
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';

type AnnouncementType = 'info' | 'sondage' | 'emergency' | 'admin';

export default function NewParentAnnouncementPage() {
  const router = useRouter();
  const { theme, teamInfo } = useTeam();
  const isPro = theme === 'classic';

  const [type, setType] = useState<AnnouncementType>('info');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handlePublish = () => {
    if (!title || !content) {
      alert('Veuillez remplir le titre et le contenu.');
      return;
    }

    const newAnnouncement = {
      id: Date.now(),
      type,
      title,
      content,
      author: teamInfo?.coachName || 'Coach',
      date: new Date().toLocaleDateString('fr-FR'),
      target: 'club',
      isRead: false
    };

    // --- CENTRALISATION DANS L'HISTORIQUE DES MESSAGES ---
    const newMessage = {
      id: Date.now() + 2,
      title: title,
      lastSender: teamInfo?.coachName || "Coach",
      lastMessage: content,
      type: type === 'emergency' ? 'urgence' : type === 'sondage' ? 'sondage' : 'alerte',
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      unread: 0,
      isSystem: true
    };
    const existingMessages = JSON.parse(localStorage.getItem('team_messages') || '[]');
    localStorage.setItem('team_messages', JSON.stringify([newMessage, ...existingMessages]));

    router.push('/comms');
  };

  const types = [
    { id: 'info', label: 'Info', icon: <Bell size={18} />, color: isPro ? 'bg-blue-500' : 'bg-neon-cyan' },
    { id: 'sondage', label: 'Sondage', icon: <BarChart2 size={18} />, color: isPro ? 'bg-orange-600' : 'bg-neon-orange' },
    { id: 'admin', label: 'Admin', icon: <Users size={18} />, color: 'bg-purple-600' },
    { id: 'emergency', label: 'Urgence', icon: <AlertCircle size={18} />, color: 'bg-red-600' },
  ];

  const styles = isPro ? {
    mainBg: 'bg-gray-50',
    cardBg: 'bg-white border-gray-100 shadow-sm',
    textMain: 'text-gray-900',
    textSub: 'text-gray-500',
    accent: 'text-orange-600',
    btnPrimary: 'bg-orange-600 text-white',
    inputBg: 'bg-gray-50'
  } : {
    mainBg: 'bg-[#15171C]',
    cardBg: 'bg-white/5 border-white/10 shadow-2xl',
    textMain: 'text-white',
    textSub: 'text-gray-500',
    accent: 'text-neon-green',
    btnPrimary: 'bg-neon-green text-black',
    inputBg: 'bg-white/5'
  };

  return (
    <main className={`min-h-screen max-w-md mx-auto shadow-2xl pb-32 font-sans relative transition-colors duration-500 ${styles.mainBg}`}>
      {/* Header */}
      <header className={`backdrop-blur-md py-5 px-6 sticky top-0 z-40 border-b flex items-center gap-4 shadow-sm ${isPro ? 'bg-white/95 border-gray-100' : 'bg-[#15171C]/80 border-white/5'}`}>
        <button onClick={() => router.back()} className={`${styles.textMain} active:scale-90 transition-transform`}>
          <ChevronLeft size={28} strokeWidth={3} />
        </button>
        <h1 className={`text-2xl font-black uppercase italic tracking-tighter ${styles.textMain}`}>Briefing Club</h1>
      </header>

      <div className="p-6 space-y-8">
        {/* Banner Tactique */}
        <section className={`${isPro ? 'bg-gray-900' : 'bg-white/5'} rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl text-left`}>
          <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
            <Megaphone size={120} strokeWidth={1} />
          </div>
          <div className="relative z-10 space-y-4">
             <div className={`w-12 h-12 ${isPro ? 'bg-orange-600' : 'bg-neon-green'} rounded-2xl flex items-center justify-center shadow-lg`}>
                <Megaphone size={24} className={isPro ? 'text-white' : 'text-black'} />
             </div>
             <div>
                <h2 className="text-3xl font-black italic uppercase leading-none tracking-tighter">Flash Info</h2>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Transmettez une info capitale aux troupes</p>
             </div>
          </div>
        </section>

        {/* Sélecteur de type */}
        <section className="space-y-4">
          <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 text-left ${styles.textSub}`}>Nature du Briefing</h3>
          <div className="grid grid-cols-4 gap-2">
            {types.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id as AnnouncementType)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2 ${
                  type === t.id ? (isPro ? 'border-orange-600 bg-orange-50 shadow-lg' : 'border-neon-green bg-neon-green/5') : (isPro ? 'border-gray-50 bg-white' : 'border-white/5 bg-white/5')
                }`}
              >
                <div className={`${type === t.id ? (isPro ? 'text-orange-600' : 'text-neon-green') : 'text-gray-400'}`}>{t.icon}</div>
                <span className={`text-[8px] font-black uppercase tracking-tighter ${type === t.id ? (isPro ? 'text-orange-600' : 'text-neon-green') : 'text-gray-500'}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Formulaire */}
        <div className="space-y-6 text-left">
          <div className={`${styles.cardBg} rounded-[2rem] p-6 border space-y-2`}>
            <label className={`text-[10px] font-black uppercase tracking-widest block ml-2 ${styles.textSub}`}>Objet du message</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Retard bus, Séance annulée..."
              className={`w-full ${styles.inputBg} rounded-2xl p-4 text-base font-black outline-none border-2 border-transparent focus:border-orange-500/20 transition-all ${isPro ? 'text-gray-900 placeholder:text-gray-300' : 'text-white placeholder:text-gray-700'}`}
            />
          </div>

          <div className={`${styles.cardBg} rounded-[2rem] p-6 border space-y-2`}>
            <label className={`text-[10px] font-black uppercase block ml-2 ${styles.textSub}`}>Message détaillé</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Rédigez votre briefing ici..."
              className={`w-full ${styles.inputBg} rounded-2xl p-4 text-sm font-medium outline-none min-h-[150px] resize-none border-2 border-transparent focus:border-orange-500/10 transition-all ${isPro ? 'text-gray-900 placeholder:text-gray-300' : 'text-white placeholder:text-gray-700'}`}
            />
          </div>

          <button className={`${styles.cardBg} rounded-2xl p-4 flex items-center justify-between w-full border active:scale-95 transition-transform group`}>
             <div className="flex items-center gap-3">
                <div className={`${isPro ? 'bg-gray-100 group-hover:bg-orange-50' : 'bg-white/5 group-hover:bg-neon-green/10'} p-2 rounded-xl transition-colors`}>
                   <Camera size={18} className={`${isPro ? 'text-gray-400 group-hover:text-orange-600' : 'text-gray-600 group-hover:text-neon-green'}`} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub}`}>Ajouter une photo</span>
             </div>
             <Plus size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Bouton Fixe Publier */}
      <div className="fixed bottom-24 left-0 right-0 z-40 px-6 py-4 pointer-events-none">
        <div className="max-w-md mx-auto w-full pointer-events-auto">
          <div className="p-4 -m-4 text-left">
            <button
              onClick={handlePublish}
              className={`w-full ${styles.btnPrimary} font-black py-6 rounded-[2.5rem] shadow-xl active:translate-y-1 active:shadow-lg transition-all flex items-center justify-center gap-3 uppercase italic tracking-tighter text-xl border-b-8 border-black/10`}
            >
              <Check size={28} strokeWidth={4} />
              Déployer le Briefing
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
