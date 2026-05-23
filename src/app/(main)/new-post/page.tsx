'use client';

import React, { useState, useRef } from 'react';
import {
  ChevronLeft,
  Image as ImageIcon,
  Camera,
  MapPin,
  Send,
  X,
  Users,
  Globe,
  Smile,
  Trophy,
  Minus,
  Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewPostPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<'team' | 'public'>('team');

  // Attachments State
  const [showScore, setShowScore] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Data State
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeTeam, setHomeTeam] = useState('FC Saint-Cloud');
  const [awayTeam, setAwayTeam] = useState('');
  const [locationName, setLocationName] = useState('');

  const canPublish = content.trim() || showScore || selectedImages.length > 0;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const imageUrl = URL.createObjectURL(files[0]);
      setSelectedImages([...selectedImages, imageUrl]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...selectedImages];
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };

  const handlePublish = () => {
    const newPost = {
      id: Date.now(),
      author: 'Coach Nordine',
      role: audience === 'team' ? 'Coach (Privé)' : 'Coach Public',
      time: 'À l\'instant',
      content: content,
      likes: 0,
      comments: 0,
      image: selectedImages[0] || null, // On prend la première image pour la démo
      score: showScore ? { homeTeam, awayTeam, homeScore, awayScore } : null,
      location: showLocation ? locationName : null,
      timestamp: new Date().toISOString()
    };

    const existingPosts = JSON.parse(localStorage.getItem('team_posts') || '[]');
    localStorage.setItem('team_posts', JSON.stringify([newPost, ...existingPosts]));

    router.push('/');
  };

  return (
    <main className="min-h-screen bg-background-gray max-w-md mx-auto shadow-2xl pb-20 font-sans">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageSelect}
      />

      {/* Header */}
      <header className="bg-white py-4 px-6 sticky top-0 z-10 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-900 active:scale-90 transition-transform">
            <ChevronLeft size={24} strokeWidth={3} />
          </button>
          <h1 className="text-xl font-black text-gray-900 uppercase italic">Nouveau Post</h1>
        </div>
        <button
          disabled={!canPublish}
          onClick={handlePublish}
          className={`px-6 py-2 rounded-full font-black text-sm transition-all flex items-center gap-2 ${
            canPublish ? 'bg-brand-orange text-white shadow-lg active:scale-95' : 'bg-gray-100 text-gray-400'
          }`}
        >
          PUBLIER
          <Send size={14} />
        </button>
      </header>

      <div className="p-4 space-y-6">

        {/* Profile Info */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-orange to-yellow-500 flex items-center justify-center font-black text-white shadow-md text-lg">
            N
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm text-gray-900 uppercase tracking-tight">Coach Nordine</span>
            <button
              onClick={() => setAudience(audience === 'team' ? 'public' : 'team')}
              className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-[9px] font-black text-gray-500 uppercase tracking-widest border border-gray-200"
            >
              {audience === 'team' ? <Users size={10} /> : <Globe size={10} />}
              {audience === 'team' ? 'Équipe Uniquement' : 'Visible par tous'}
            </button>
          </div>
        </div>

        {/* Text Area Card */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100">
          <textarea
            autoFocus
            placeholder="Quoi de neuf dans l'équipe aujourd'hui ?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[100px] text-lg font-medium text-gray-800 placeholder:text-gray-300 outline-none resize-none leading-relaxed"
          />

          {/* Image Previews */}
          {selectedImages.length > 0 && (
            <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative flex-shrink-0 w-32 h-32 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <img src={img} className="w-full h-full object-cover" alt="Preview" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full backdrop-blur-sm"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300 gap-1"
              >
                <Plus size={20} />
                <span className="text-[8px] font-bold uppercase">Ajouter</span>
              </button>
            </div>
          )}

          {/* Location Badge */}
          {showLocation && (
            <div className="mt-4 bg-grass-green/5 border border-grass-green/20 rounded-2xl p-4 flex items-center gap-3 relative animate-in slide-in-from-left-2 duration-300">
              <MapPin size={18} className="text-grass-green" />
              <input
                placeholder="Ajouter un lieu..."
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="bg-transparent flex-1 text-sm font-bold text-grass-green-dark outline-none placeholder:text-grass-green/30"
              />
              <button onClick={() => setShowLocation(false)} className="text-grass-green/40 hover:text-grass-green"><X size={16} /></button>
            </div>
          )}

          {/* Attached Score Card */}
          {showScore && (
            <div className="mt-4 bg-gray-900 rounded-3xl p-6 relative animate-in zoom-in-95 duration-300">
              <button
                onClick={() => setShowScore(false)}
                className="absolute top-3 right-3 text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-black text-white/40 uppercase italic">Home</span>
                  <input
                    className="bg-transparent text-white text-[10px] font-bold text-center w-full outline-none uppercase"
                    value={homeTeam}
                    onChange={(e) => setHomeTeam(e.target.value)}
                  />
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => setHomeScore(Math.max(0, homeScore - 1))} className="text-white/20"><Minus size={16} /></button>
                    <span className="text-3xl font-black text-white">{homeScore}</span>
                    <button onClick={() => setHomeScore(homeScore + 1)} className="text-brand-orange"><Plus size={16} /></button>
                  </div>
                </div>

                <div className="text-white/10 font-black text-xl italic">VS</div>

                <div className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-black text-white/40 uppercase italic">Away</span>
                  <input
                    placeholder="Adversaire"
                    className="bg-transparent text-white text-[10px] font-bold text-center w-full outline-none uppercase placeholder:text-white/20"
                    value={awayTeam}
                    onChange={(e) => setAwayTeam(e.target.value)}
                  />
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => setAwayScore(Math.max(0, awayScore - 1))} className="text-white/20"><Minus size={16} /></button>
                    <span className="text-3xl font-black text-white">{awayScore}</span>
                    <button onClick={() => setAwayScore(awayScore + 1)} className="text-brand-orange"><Plus size={16} /></button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Attachment Options */}
        <div className="grid grid-cols-2 gap-3 px-1">
           <AttachmentButton
              active={selectedImages.length > 0}
              onClick={() => fileInputRef.current?.click()}
              icon={<ImageIcon className={selectedImages.length > 0 ? "text-white" : "text-sky-500"} />}
              label="Photo"
           />
           <AttachmentButton
              icon={<Camera className="text-match-red" />}
              label="Caméra"
           />
           <AttachmentButton
              active={showScore}
              onClick={() => setShowScore(true)}
              icon={<Trophy className={showScore ? "text-white" : "text-yellow-500"} />}
              label="Résultat"
           />
           <AttachmentButton
              active={showLocation}
              onClick={() => setShowLocation(true)}
              icon={<MapPin className={showLocation ? "text-white" : "text-grass-green"} />}
              label="Lieu"
           />
        </div>

        {/* Tips Section */}
        <section className="bg-brand-orange/5 border border-brand-orange/10 rounded-2xl p-4 flex gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange shrink-0">
            <Smile size={18} />
          </div>
          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
            <span className="font-bold text-brand-orange uppercase">Astuce :</span> Un post avec une photo ou un score génère 3x plus d'engagement !
          </p>
        </section>

      </div>
    </main>
  );
}

function AttachmentButton({ icon, label, onClick, active }: { icon: React.ReactNode, label: string, onClick?: () => void, active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-95 ${
        active
        ? "bg-brand-orange border-brand-orange shadow-lg shadow-brand-orange/30 text-white"
        : "bg-white border-gray-100 shadow-sm text-gray-700 active:bg-gray-50"
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? "bg-white/20" : "bg-gray-50"}`}>
        {icon}
      </div>
      <span className={`text-xs font-black uppercase tracking-tight ${active ? "text-white" : "text-gray-700"}`}>{label}</span>
    </button>
  );
}
