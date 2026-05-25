'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { CoachCard } from '@/components/CoachCard';
import { supabase } from '@/lib/supabase/client';
import {
  ChevronLeft, User, Shield, MapPin, Navigation,
  Phone, Layers, Trophy, Edit3, CheckCircle2, Star, Zap,
  Save, X, Loader2, Camera, Flame, Check
} from 'lucide-react';

interface CoachViewProps {
  onActivateParent?: () => void;
}

type EditingSection = 'user' | 'club' | 'logistics' | 'ranges' | null;

/**
 * COACH_VIEW (v22.0 - MASTER CLASSIC INTEGRATED EDIT)
 * Vue 1 : Carte de Prestige XXL.
 * Vue 2 : Dossier Profil avec Édition Inline.
 */
export function CoachView({ onActivateParent }: CoachViewProps) {
  const router = useRouter();
  const { teamInfo, refreshData } = useTeam();
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // --- ÉTATS LOCAUX POUR FORMULAIRE ---
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', nickname: '', phone: '', licenseNumber: '', bio: '', coachStatus: 'actif',
    clubName: '', category: '', level: '', refCatsText: '',
    city: '', stadium: '',
    matchDist: 30, plateauDist: 20, tournamentReach: 'departemental'
  });

  // Sync Data
  useEffect(() => {
    if (teamInfo) {
      setFormData({
        firstName: teamInfo.userFirstName || '',
        lastName: teamInfo.userLastName || '',
        nickname: teamInfo.coachName || '',
        phone: teamInfo.phone || '',
        licenseNumber: teamInfo.licenseNumber || '',
        bio: teamInfo.bio || '',
        coachStatus: teamInfo.coachStatus || 'actif',
        clubName: teamInfo.clubName || '',
        category: teamInfo.category || '',
        level: teamInfo.level || '',
        refCatsText: teamInfo.refCategories?.join(', ') || '',
        city: teamInfo.clubCity || '',
        stadium: teamInfo.clubStadium || '',
        matchDist: teamInfo.matchDistMax || 30,
        plateauDist: teamInfo.plateauDistMax || 20,
        tournamentReach: teamInfo.tournamentReach || 'departemental'
      });
    }
  }, [teamInfo]);

  // Stats simulées
  const stats = { matchesPlayed: 12, announcementsSent: 8, contactsMade: 15, engagementRate: 100 };

  const handleSaveSection = async (section: EditingSection) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      const updates: any = { id: user.id };

      if (section === 'user') {
        updates.first_name = formData.firstName;
        updates.last_name = formData.lastName;
        updates.nickname = formData.nickname;
        updates.phone = formData.phone;
        updates.license_number = formData.licenseNumber;
        updates.coach_status = formData.coachStatus;
        updates.bio = formData.bio.toUpperCase();
      } else if (section === 'club') {
        updates.coach_category = formData.category.toUpperCase();
        updates.coach_level = formData.level.toUpperCase();
        updates.ref_categories = formData.refCatsText.split(',').map(s => s.trim()).filter(s => s !== '');
      } else if (section === 'ranges') {
        updates.match_dist_max = formData.matchDist;
        updates.plateau_dist_max = formData.plateauDist;
        updates.tournament_reach = formData.tournamentReach;
      }

      const { error } = await supabase.from('profiles').upsert([updates]);
      if (error) throw error;

      // Logistique (Table Clubs)
      if (section === 'logistics' && teamInfo?.id) {
        await supabase.from('clubs').update({
          city: formData.city.toUpperCase(),
          stadium: formData.stadium.toUpperCase()
        }).eq('id', teamInfo.id);
      }

      await refreshData();
      setEditingSection(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const bucket = type === 'avatar' ? 'coach-avatars' : 'club-logos';
      const folder = type === 'avatar' ? 'avatars' : 'logos';
      const id = type === 'avatar' ? user?.id : teamInfo?.id;

      const fileExt = file.name.split('.').pop();
      const fileName = `${id}-${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);

      if (type === 'avatar') {
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user?.id);
      } else {
        await supabase.from('clubs').update({ logo_url: publicUrl }).eq('id', teamInfo?.id);
      }

      await refreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // --- RENDU 1 : LA CARTE DE PRESTIGE ---
  if (!showFullProfile) {
    return (
      <div className="fixed inset-0 z-10 flex flex-col items-center justify-center bg-[#050510] overflow-hidden animate-in fade-in duration-1000">
        <button onClick={() => router.push('/dashboard')} className="absolute top-12 left-6 p-3 rounded-2xl bg-white/5 border border-white/10 text-white active:scale-90 z-[60]"><ChevronLeft size={24} strokeWidth={3} /></button>
        <div className="w-full flex justify-center px-6 cursor-pointer transition-all duration-300 active:scale-95 group" onClick={() => setShowFullProfile(true)}>
          <CoachCard
            name={teamInfo?.coachName || teamInfo?.userFirstName || 'COACH'}
            clubName={teamInfo?.clubName || 'UNITÉ_TACTIQUE'}
            clubLogo={teamInfo?.clubLogo}
            coachPhoto={teamInfo?.coachPhoto}
            category={teamInfo?.category || 'SÉNIORS'}
            level={teamInfo?.level || 'D1'}
            points={teamInfo?.xp || 0}
            status={teamInfo?.coachStatus || 'actif'}
            matchesPlayed={stats.matchesPlayed}
            announcementsSent={stats.announcementsSent}
            contactsMade={stats.contactsMade}
            engagementRate={stats.engagementRate}
          />
        </div>
        <p className="mt-8 text-white/20 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Toucher pour ouvrir le dossier</p>
      </div>
    );
  }

  const inputStyle = "w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-black uppercase outline-none focus:border-orange-500 transition-all";

  // --- RENDU 2 : LE DOSSIER INTERACTIF ---
  return (
    <div className="fixed inset-0 z-[70] bg-gray-50 overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="bg-white border-b border-gray-200 p-6 sticky top-0 z-[80] flex items-center gap-4 shadow-sm">
        <button onClick={() => setShowFullProfile(false)} className="text-gray-900 active:scale-90 p-2 bg-gray-100 rounded-xl"><ChevronLeft size={24} strokeWidth={3} /></button>
        <h1 className="text-xl font-black uppercase italic tracking-tighter text-gray-900">Profil_Dossier</h1>
      </header>

      <main className="p-5 max-w-2xl mx-auto space-y-8 pb-48 text-left">

        {/* 1. UTILISATEUR */}
        <section className="space-y-4">
           <div className="flex items-center justify-between">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><User size={14} className="text-orange-600" /> Utilisateur</label>
             {editingSection !== 'user' ? (
               <button onClick={() => setEditingSection('user')} className="p-2 bg-orange-100 text-orange-600 rounded-lg text-xs font-black flex items-center gap-1"><Edit3 size={12} /> ÉDITER</button>
             ) : (
               <div className="flex gap-2">
                 <button onClick={() => setEditingSection(null)} className="p-2 bg-gray-100 text-gray-400 rounded-lg"><X size={14}/></button>
                 <button onClick={() => handleSaveSection('user')} className="p-2 bg-green-600 text-white rounded-lg"><Check size={14}/></button>
               </div>
             )}
           </div>

           <div className="bg-white rounded-[2.5rem] p-6 border border-gray-200 shadow-md">
              {editingSection === 'user' ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                   <div className="flex justify-center mb-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-3xl border-4 border-orange-100 overflow-hidden flex items-center justify-center bg-gray-50">
                          {teamInfo?.coachPhoto ? <img src={teamInfo.coachPhoto} className="w-full h-full object-cover" /> : <User size={30} className="text-gray-200" />}
                        </div>
                        <label className="absolute -bottom-2 -right-2 bg-orange-600 text-white p-2 rounded-xl cursor-pointer shadow-lg"><Camera size={14}/><input type="file" className="hidden" onChange={e => handleUpload(e, 'avatar')} /></label>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Prénom" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className={inputStyle} />
                      <input placeholder="Nom" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className={inputStyle} />
                   </div>
                   <input placeholder="Surnom" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} className={inputStyle} />
                   <input placeholder="Téléphone (Privé)" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputStyle} />
                   <div className="grid grid-cols-3 gap-1 pt-2">
                      {['inactif', 'actif', 'toujours_pret'].map(s => (
                        <button key={s} onClick={() => setFormData({...formData, coachStatus: s as any})} className={`py-2 rounded-lg text-[7px] font-black ${formData.coachStatus === s ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{s.toUpperCase()}</button>
                      ))}
                   </div>
                </div>
              ) : (
                <div className="flex items-center gap-5">
                   <div className="w-24 h-24 rounded-3xl border-4 border-orange-100 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                      {teamInfo?.coachPhoto ? <img src={teamInfo.coachPhoto} className="w-full h-full object-cover" /> : <User size={40} className="text-gray-300" />}
                   </div>
                   <div className="space-y-1">
                      <p className="text-lg font-black uppercase text-gray-900 leading-tight">{teamInfo?.userFirstName} {teamInfo?.userLastName}</p>
                      <p className="text-xs font-bold text-orange-600 uppercase italic">👤 {teamInfo?.coachName}</p>
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[8px] font-black uppercase inline-block">{teamInfo?.coachGrade || 'Coach Engagé'}</span>
                   </div>
                </div>
              )}
           </div>
        </section>

        {/* 2. LE CLUB */}
        <section className="space-y-4">
           <div className="flex items-center justify-between">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><Shield size={14} className="text-orange-600" /> Mon Club</label>
             {editingSection !== 'club' ? (
               <button onClick={() => setEditingSection('club')} className="p-2 bg-orange-100 text-orange-600 rounded-lg text-xs font-black flex items-center gap-1"><Edit3 size={12} /> ÉDITER</button>
             ) : (
               <div className="flex gap-2">
                 <button onClick={() => setEditingSection(null)} className="p-2 bg-gray-100 text-gray-400 rounded-lg"><X size={14}/></button>
                 <button onClick={() => handleSaveSection('club')} className="p-2 bg-green-600 text-white rounded-lg"><Check size={14}/></button>
               </div>
             )}
           </div>

           <div className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-md flex flex-col items-center text-center space-y-4">
              {editingSection === 'club' ? (
                <div className="w-full space-y-4 animate-in fade-in duration-300">
                   <div className="relative mb-4">
                      <div className="w-20 h-20 rounded-3xl border-2 border-gray-100 overflow-hidden flex items-center justify-center bg-white mx-auto">
                        {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} className="w-full h-full object-contain p-2" /> : <Shield size={30} className="text-gray-100" />}
                      </div>
                      <label className="absolute bottom-0 right-1/2 translate-x-12 bg-orange-600 text-white p-2 rounded-xl cursor-pointer shadow-lg"><Camera size={14}/><input type="file" className="hidden" onChange={e => handleUpload(e, 'logo')} /></label>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Catégorie" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value.toUpperCase()})} className={inputStyle} />
                      <input placeholder="Niveau" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value.toUpperCase()})} className={inputStyle} />
                   </div>
                   <input placeholder="Catégories de Référence (virgule)" value={formData.refCatsText} onChange={e => setFormData({...formData, refCatsText: e.target.value.toUpperCase()})} className={inputStyle} />
                </div>
              ) : (
                <>
                  <div className="w-40 h-40 bg-white rounded-[2.5rem] p-4 border-4 border-orange-100 shadow-lg flex items-center justify-center">
                     {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} className="w-full h-full object-contain" /> : <Shield size={80} className="text-gray-200" />}
                  </div>
                  <div className="space-y-2">
                     <h2 className="text-2xl font-black uppercase italic text-gray-900 tracking-tighter">{teamInfo?.clubName}</h2>
                     <div className="flex justify-center gap-6 text-[10px] font-black uppercase pt-2">
                       <span className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg">🏛️ {teamInfo?.category}</span>
                       <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">⚡ {teamInfo?.level}</span>
                     </div>
                  </div>
                </>
              )}
           </div>
        </section>

        {/* 3. LOGISTIQUE */}
        <section className="space-y-4">
           <div className="flex items-center justify-between">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><MapPin size={14} className="text-orange-600" /> Logistique_QG</label>
             {editingSection !== 'logistics' ? (
               <button onClick={() => setEditingSection('logistics')} className="p-2 bg-orange-100 text-orange-600 rounded-lg text-xs font-black flex items-center gap-1"><Edit3 size={12} /> ÉDITER</button>
             ) : (
               <div className="flex gap-2">
                 <button onClick={() => setEditingSection(null)} className="p-2 bg-gray-100 text-gray-400 rounded-lg"><X size={14}/></button>
                 <button onClick={() => handleSaveSection('logistics')} className="p-2 bg-green-600 text-white rounded-lg"><Check size={14}/></button>
               </div>
             )}
           </div>

           <div className="bg-white rounded-[2.5rem] p-6 border border-gray-200 shadow-md space-y-4">
              {editingSection === 'logistics' ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                   <input placeholder="Ma Ville" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value.toUpperCase()})} className={inputStyle} />
                   <input placeholder="Mon Stade" value={formData.stadium} onChange={e => setFormData({...formData, stadium: e.target.value.toUpperCase()})} className={inputStyle} />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                     <span className="text-[10px] font-black uppercase text-gray-500">📍 Ma Ville</span>
                     <span className="text-sm font-black text-gray-900 uppercase italic">{teamInfo?.clubCity || "À définir"}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                     <span className="text-[10px] font-black uppercase text-gray-500">🏟️ Mon Stade</span>
                     <span className="text-sm font-black text-gray-900 uppercase italic text-right truncate ml-4">{teamInfo?.clubStadium || "À définir"}</span>
                  </div>
                </>
              )}
           </div>
        </section>

        {/* 4. RAYONS D'ACTION */}
        <section className="space-y-4">
           <div className="flex items-center justify-between">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><Navigation size={14} className="text-orange-600" /> Rayons d'Action</label>
             {editingSection !== 'ranges' ? (
               <button onClick={() => setEditingSection('ranges')} className="p-2 bg-orange-100 text-orange-600 rounded-lg text-xs font-black flex items-center gap-1"><Edit3 size={12} /> ÉDITER</button>
             ) : (
               <div className="flex gap-2">
                 <button onClick={() => setEditingSection(null)} className="p-2 bg-gray-100 text-gray-400 rounded-lg"><X size={14}/></button>
                 <button onClick={() => handleSaveSection('ranges')} className="p-2 bg-green-600 text-white rounded-lg"><Check size={14}/></button>
               </div>
             )}
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editingSection === 'ranges' ? (
                <div className="col-span-full space-y-6 bg-white p-6 rounded-[2rem] border border-gray-200 animate-in fade-in duration-300">
                   <div>
                      <div className="flex justify-between text-[10px] font-black mb-2 uppercase"><span>Match Amical</span> <span className="text-orange-600">{formData.matchDist} KM</span></div>
                      <input type="range" min="5" max="100" step="5" value={formData.matchDist} onChange={e => setFormData({...formData, matchDist: parseInt(e.target.value)})} className="w-full h-2 bg-gray-100 rounded-lg appearance-none accent-orange-600" />
                   </div>
                   <div>
                      <div className="flex justify-between text-[10px] font-black mb-2 uppercase"><span>Plateau</span> <span className="text-blue-600">{formData.plateauDist} KM</span></div>
                      <input type="range" min="5" max="100" step="5" value={formData.plateauDist} onChange={e => setFormData({...formData, plateauDist: parseInt(e.target.value)})} className="w-full h-2 bg-gray-100 rounded-lg appearance-none accent-blue-600" />
                   </div>
                   <div className="grid grid-cols-2 gap-2 pt-2">
                      {['departemental', 'regional', 'national'].map(r => (
                        <button key={r} type="button" onClick={() => setFormData({...formData, tournamentReach: r as any})} className={`py-3 rounded-xl text-[8px] font-black border-2 transition-all ${formData.tournamentReach === r ? 'bg-yellow-500 border-yellow-500 text-black' : 'bg-gray-100 border-transparent text-gray-400'}`}>{r.toUpperCase()}</button>
                      ))}
                   </div>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-[2rem] border-2 border-green-200 shadow-md">
                     <p className="text-[8px] font-black uppercase text-green-600 mb-2">⚽ Match Amical</p>
                     <p className="text-2xl font-black text-green-600 italic">{teamInfo?.matchDistMax || 30} KM</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-[2rem] border-2 border-blue-200 shadow-md">
                     <p className="text-[8px] font-black uppercase text-blue-600 mb-2">🎪 Plateau</p>
                     <p className="text-2xl font-black text-blue-600 italic">{teamInfo?.plateauDistMax || 20} KM</p>
                  </div>
                  <div className="col-span-full bg-gradient-to-br from-orange-50 to-white p-6 rounded-[2rem] border-2 border-orange-200 shadow-md flex justify-between items-center">
                     <div>
                       <p className="text-[8px] font-black uppercase text-orange-600 mb-2">🏆 Tournoi</p>
                       <p className="text-sm font-black text-orange-600 uppercase italic">{teamInfo?.tournamentReach}</p>
                     </div>
                     <Trophy size={32} className="text-orange-400" />
                  </div>
                </>
              )}
           </div>
        </section>

      </main>

      {/* LOADER GLOBAL */}
      {(isSaving || isUploading) && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
           <Loader2 size={48} className="animate-spin text-orange-500 mb-4" />
           <p className="text-xs font-black uppercase tracking-[0.3em]">Synchronisation_QG...</p>
        </div>
      )}
    </div>
  );
}
