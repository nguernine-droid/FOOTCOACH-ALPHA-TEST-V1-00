'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { CoachCard } from '@/components/CoachCard';
import { supabase } from '@/lib/supabase/client';
import {
  ChevronLeft, User, Shield, MapPin, Navigation,
  Phone, Layers, Trophy, Edit3, CheckCircle2, Star, Zap,
  Save, X, Loader2, Camera, Flame, Check, Fingerprint, Info
} from 'lucide-react';

interface CoachViewProps {
  onActivateParent?: () => void;
}

type EditingSection = 'user' | 'club' | 'logistics' | 'ranges' | null;

/**
 * COACH_VIEW (v25.0 - MASTER QUALITY CONTROL)
 * Steps 3, 4, 5 Verifiées et Validées.
 * Affichage intégral de tous les renseignements en mode consultation.
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

      if (section === 'logistics' && teamInfo?.id) {
        await supabase.from('clubs').update({
          city: formData.city.toUpperCase(),
          stadium: formData.stadium.toUpperCase()
        }).eq('id', teamInfo.id);
      }

      await refreshData(); // Action 3 : Sync Cerveau
      setEditingSection(null); // Action 4 : Retour Consultation
      if (navigator.vibrate) navigator.vibrate([10, 50, 10]); // Vibration Succès
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
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
    } catch (err: any) { alert(err.message); } finally { setIsUploading(false); }
  };

  const handleBack = () => {
    if (editingSection) {
      setEditingSection(null);
    } else {
      setShowFullProfile(false);
      if (navigator.vibrate) navigator.vibrate(10);
    }
  };

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
        <p className="mt-12 text-white/20 font-black uppercase text-[11px] tracking-[0.5em] animate-pulse text-center">Toucher_Pour_Ouvrir</p>
      </div>
    );
  }

  const inputStyle = "w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-5 text-sm font-black uppercase outline-none focus:border-orange-500 transition-all text-gray-900 placeholder:text-gray-300 shadow-inner";

  return (
    <div className="fixed inset-0 z-[70] bg-gray-100 overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-700">

      {/* HEADER RÉTRACTABLE */}
      <div
        onClick={handleBack}
        className="p-8 pb-4 flex items-center justify-between bg-gray-100/80 backdrop-blur-md sticky top-0 z-[90] cursor-pointer active:bg-gray-200/50 transition-colors"
      >
         <button className="text-gray-900 p-3 bg-white rounded-2xl shadow-sm active:scale-90 transition-all"><ChevronLeft size={24} strokeWidth={3} /></button>
         <h1 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 drop-shadow-sm">Profil_Dossier</h1>
         <div className="w-12 h-12 rounded-xl bg-orange-600/10 flex items-center justify-center border border-orange-600/20"><User size={20} className="text-orange-600" /></div>
      </div>

      <main className="p-5 max-w-2xl mx-auto space-y-10 pb-48 text-left">

        {/* 1. UTILISATEUR */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-2">
             <label className="text-[11px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><User size={14} className="text-orange-600" /> Identité Coach</label>
             {editingSection !== 'user' ? (
               <button onClick={(e) => { e.stopPropagation(); setEditingSection('user'); }} className="p-2.5 bg-orange-600 text-white rounded-xl text-[9px] font-black flex items-center gap-1 shadow-lg active:scale-90 transition-all"><Edit3 size={12} /> ÉDITER</button>
             ) : (
               <div className="flex gap-2">
                 <button onClick={() => setEditingSection(null)} className="p-2.5 bg-gray-200 text-gray-400 rounded-xl active:scale-90"><X size={16}/></button>
                 <button onClick={() => handleSaveSection('user')} className="p-2.5 bg-[#39FF14] text-black rounded-xl shadow-lg active:scale-90"><Check size={16} strokeWidth={3}/></button>
               </div>
             )}
           </div>

           <div className="bg-white rounded-[3rem] p-8 border-2 border-white shadow-xl">
              {editingSection === 'user' ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                   <div className="flex justify-center mb-6">
                      <div className="relative">
                        <div className="w-28 h-28 rounded-[2.5rem] border-4 border-orange-100 overflow-hidden flex items-center justify-center bg-gray-50 shadow-2xl relative">
                          {teamInfo?.coachPhoto ? <img src={teamInfo.coachPhoto} className="w-full h-full object-cover" /> : <User size={40} className="text-gray-200" />}
                          {isUploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-white" /></div>}
                        </div>
                        <label className="absolute -bottom-2 -right-2 bg-orange-600 text-white p-3 rounded-2xl cursor-pointer shadow-2xl active:scale-90"><Camera size={18}/><input type="file" className="hidden" onChange={e => handleUpload(e, 'avatar')} /></label>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Prénom" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className={inputStyle} />
                      <input placeholder="Nom" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className={inputStyle} />
                   </div>
                   <input placeholder="Surnom" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} className={inputStyle} />
                   <input placeholder="Numéro de Licence" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} className={inputStyle} />
                   <input placeholder="Slogan / Phrase d'accroche" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className={inputStyle} />
                   <input placeholder="Téléphone (Privé)" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputStyle} />

                   <div className="grid grid-cols-3 gap-2 pt-2 bg-gray-100 p-1.5 rounded-2xl border-2 border-gray-200 shadow-inner">
                      {[
                        { id: 'inactif', label: 'INACTIF', color: 'bg-blue-500', text: 'text-white' },
                        { id: 'actif', label: 'ACTIF', color: 'bg-[#39FF14]', text: 'text-black' },
                        { id: 'toujours_pret', label: 'PRÊT 🔥', color: 'bg-red-600', text: 'text-white' }
                      ].map(s => (
                        <button key={s.id} type="button" onClick={() => setFormData({...formData, coachStatus: s.id as any})} className={`py-4 rounded-xl text-[9px] font-black transition-all ${formData.coachStatus === s.id ? `${s.color} ${s.text} shadow-lg scale-105` : 'text-gray-400 hover:text-gray-600'}`}>{s.label}</button>
                      ))}
                   </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-[2rem] border-4 border-orange-100 overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-lg">
                        {teamInfo?.coachPhoto ? <img src={teamInfo.coachPhoto} className="w-full h-full object-cover" /> : <User size={44} className="text-gray-300" />}
                    </div>
                    <div className="space-y-1.5 flex-1">
                        <p className="text-2xl font-black uppercase text-gray-900 leading-none">{teamInfo?.userFirstName} {teamInfo?.userLastName}</p>
                        <p className="text-sm font-bold text-orange-600 uppercase italic">👤 {teamInfo?.coachName}</p>
                        <div className="flex gap-2 pt-1">
                          <span className="px-4 py-1.5 bg-orange-100 text-orange-700 rounded-full text-[9px] font-black uppercase shadow-sm">{teamInfo?.coachGrade || 'Coach Engagé'}</span>
                        </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100 shadow-inner">
                     <div className="flex items-center gap-3">
                        <Trophy size={14} className="text-orange-500" />
                        <p className="text-[10px] font-black text-gray-900 uppercase">Slogan: <span className="italic text-gray-500 ml-1">"{teamInfo?.bio || "Droit au but !"}"</span></p>
                     </div>
                     <div className="flex items-center gap-3">
                        <Fingerprint size={14} className="text-orange-500" />
                        <p className="text-[10px] font-black text-gray-900 uppercase">Licence: <span className="text-gray-500 ml-1">{teamInfo?.licenseNumber || "Non renseignée"}</span></p>
                     </div>
                     <div className="flex items-center gap-3 border-t border-gray-200 pt-3 mt-1">
                        <Phone size={14} className="text-gray-400" />
                        <p className="text-[10px] font-black text-gray-900 uppercase">Contact Privé: <span className="text-gray-500 ml-1">{teamInfo?.phone || "Masqué"}</span> <span className="ml-2 text-[8px] text-gray-300">🔒 (Invisible aux tiers)</span></p>
                     </div>
                  </div>
                </div>
              )}
           </div>
        </section>

        {/* 2. LE CLUB */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-2">
             <label className="text-[11px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><Shield size={14} className="text-orange-600" /> Mon Club</label>
             {editingSection !== 'club' ? (
               <button onClick={(e) => { e.stopPropagation(); setEditingSection('club'); }} className="p-2.5 bg-orange-600 text-white rounded-xl text-[9px] font-black flex items-center gap-1 shadow-lg active:scale-90 transition-all"><Edit3 size={12} /> ÉDITER</button>
             ) : (
               <div className="flex gap-2">
                 <button onClick={() => setEditingSection(null)} className="p-2.5 bg-gray-200 text-gray-400 rounded-xl active:scale-90"><X size={16}/></button>
                 <button onClick={() => handleSaveSection('club')} className="p-2.5 bg-[#39FF14] text-black rounded-xl shadow-lg active:scale-90"><Check size={16} strokeWidth={3}/></button>
               </div>
             )}
           </div>

           <div className="bg-white rounded-[3rem] p-10 border-2 border-white shadow-xl flex flex-col items-center text-center space-y-6">
              {editingSection === 'club' ? (
                <div className="w-full space-y-6 animate-in fade-in duration-300">
                   <div className="relative mb-4">
                      <div className="w-24 h-24 rounded-[2rem] border-2 border-gray-100 overflow-hidden flex items-center justify-center bg-white mx-auto shadow-2xl relative">
                        {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} className="w-full h-full object-contain p-2" /> : <Shield size={40} className="text-gray-100" />}
                        {isUploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-white" /></div>}
                      </div>
                      <label className="absolute bottom-0 right-1/2 translate-x-12 bg-orange-600 text-white p-3 rounded-2xl cursor-pointer shadow-2xl active:scale-90"><Camera size={18}/><input type="file" className="hidden" onChange={e => handleUpload(e, 'logo')} /></label>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Catégorie" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value.toUpperCase()})} className={inputStyle} />
                      <input placeholder="Niveau" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value.toUpperCase()})} className={inputStyle} />
                   </div>
                   <input placeholder="Catégories de Référence (virgule)" value={formData.refCatsText} onChange={e => setFormData({...formData, refCatsText: e.target.value.toUpperCase()})} className={inputStyle} />
                </div>
              ) : (
                <>
                  <div className="w-44 h-44 bg-white rounded-[3rem] p-6 border-4 border-orange-50 shadow-2xl flex items-center justify-center">
                     {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} className="w-full h-full object-contain" /> : <Shield size={90} className="text-gray-200" />}
                  </div>
                  <div className="space-y-3">
                     <h2 className="text-3xl font-black uppercase italic text-gray-900 tracking-tighter">{teamInfo?.clubName || 'VOTRE CLUB'}</h2>
                     <div className="flex justify-center gap-6 text-[10px] font-black uppercase pt-2">
                       <span className="px-5 py-3 bg-orange-50 text-orange-700 rounded-2xl shadow-sm border border-orange-100">🏛️ {teamInfo?.category}</span>
                       <span className="px-5 py-3 bg-blue-50 text-blue-700 rounded-2xl shadow-sm border border-blue-100">⚡ {teamInfo?.level}</span>
                     </div>
                     {teamInfo?.refCategories && teamInfo.refCategories.length > 0 && (
                       <div className="flex flex-wrap justify-center gap-2 mt-4 pt-4 border-t border-gray-100">
                          {teamInfo.refCategories.map(cat => (
                            <span key={cat} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-[8px] font-black text-gray-500 uppercase">{cat}</span>
                          ))}
                       </div>
                     )}
                  </div>
                </>
              )}
           </div>
        </section>

        {/* 3. LOGISTIQUE */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-2">
             <label className="text-[11px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><MapPin size={14} className="text-orange-600" /> Logistique_QG</label>
             {editingSection !== 'logistics' ? (
               <button onClick={(e) => { e.stopPropagation(); setEditingSection('logistics'); }} className="p-2.5 bg-orange-600 text-white rounded-xl text-[9px] font-black flex items-center gap-1 shadow-lg active:scale-90 transition-all"><Edit3 size={12} /> ÉDITER</button>
             ) : (
               <div className="flex gap-2">
                 <button onClick={() => setEditingSection(null)} className="p-2.5 bg-gray-200 text-gray-400 rounded-xl active:scale-90"><X size={16}/></button>
                 <button onClick={() => handleSaveSection('logistics')} className="p-2.5 bg-[#39FF14] text-black rounded-xl shadow-lg active:scale-90"><Check size={16} strokeWidth={3}/></button>
               </div>
             )}
           </div>

           <div className="bg-white rounded-[3rem] p-8 border-2 border-white shadow-xl space-y-4">
              {editingSection === 'logistics' ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                   <input placeholder="Ma Ville" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value.toUpperCase()})} className={inputStyle} />
                   <input placeholder="Mon Stade" value={formData.stadium} onChange={e => setFormData({...formData, stadium: e.target.value.toUpperCase()})} className={inputStyle} />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl shadow-inner border border-gray-100 transition-all hover:bg-gray-100">
                     <span className="text-[10px] font-black uppercase text-gray-400">📍 Ma Ville</span>
                     <span className="text-sm font-black text-gray-900 uppercase italic tracking-wider">{teamInfo?.clubCity || "À définir"}</span>
                  </div>
                  <div className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl shadow-inner border border-gray-100 transition-all hover:bg-gray-100">
                     <span className="text-[10px] font-black uppercase text-gray-400">🏟️ Mon Stade</span>
                     <span className="text-sm font-black text-gray-900 uppercase italic text-right truncate ml-4 tracking-wider">{teamInfo?.clubStadium || "À définir"}</span>
                  </div>
                </>
              )}
           </div>
        </section>

        {/* 4. RAYONS D'ACTION */}
        <section className="space-y-4 pb-20">
           <div className="flex items-center justify-between px-2">
             <label className="text-[11px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><Navigation size={14} className="text-orange-600" /> Rayons d'Action</label>
             {editingSection !== 'ranges' ? (
               <button onClick={(e) => { e.stopPropagation(); setEditingSection('ranges'); }} className="p-2.5 bg-orange-600 text-white rounded-xl text-[9px] font-black flex items-center gap-1 shadow-lg active:scale-90 transition-all"><Edit3 size={12} /> ÉDITER</button>
             ) : (
               <div className="flex gap-2">
                 <button onClick={() => setEditingSection(null)} className="p-2.5 bg-gray-200 text-gray-400 rounded-xl active:scale-90"><X size={16}/></button>
                 <button onClick={() => handleSaveSection('ranges')} className="p-2.5 bg-[#39FF14] text-black rounded-xl shadow-lg active:scale-90"><Check size={16} strokeWidth={3}/></button>
               </div>
             )}
           </div>

           <div className="grid grid-cols-1 gap-4">
              {editingSection === 'ranges' ? (
                <div className="space-y-10 bg-white p-10 rounded-[3rem] border-2 border-white shadow-xl animate-in fade-in duration-300">
                   <div className="space-y-4">
                      <div className="flex justify-between text-[11px] font-black mb-2 uppercase"><span>Match Amical</span> <span className="text-orange-600 text-lg">{formData.matchDist} KM</span></div>
                      <input type="range" min="5" max="100" step="5" value={formData.matchDist} onChange={e => setFormData({...formData, matchDist: parseInt(e.target.value)})} className="w-full h-3 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-600" />
                   </div>
                   <div className="space-y-4">
                      <div className="flex justify-between text-[11px] font-black mb-2 uppercase"><span>Plateau</span> <span className="text-blue-600 text-lg">{formData.plateauDist} KM</span></div>
                      <input type="range" min="5" max="100" step="5" value={formData.plateauDist} onChange={e => setFormData({...formData, plateauDist: parseInt(e.target.value)})} className="w-full h-3 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                   </div>
                   <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-100">
                      {['departemental', 'regional', 'national'].map(r => (
                        <button key={r} type="button" onClick={() => setFormData({...formData, tournamentReach: r as any})} className={`py-4 rounded-2xl text-[9px] font-black border-2 transition-all ${formData.tournamentReach === r ? 'bg-yellow-500 border-yellow-500 text-black shadow-xl scale-105' : 'bg-gray-50 border-transparent text-gray-400'}`}>{r.toUpperCase()}</button>
                      ))}
                   </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-[2.5rem] border-2 border-green-200 shadow-xl transition-transform hover:scale-105">
                     <p className="text-[9px] font-black uppercase text-green-600 mb-2 flex items-center gap-2">⚽ Match Amical</p>
                     <p className="text-3xl font-black text-green-600 italic leading-none">{teamInfo?.matchDistMax || 30} <span className="text-[10px] uppercase not-italic ml-1">KM</span></p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-[2.5rem] border-2 border-blue-200 shadow-xl transition-transform hover:scale-105">
                     <p className="text-[9px] font-black uppercase text-blue-600 mb-2 flex items-center gap-2">🎪 Plateau</p>
                     <p className="text-3xl font-black text-blue-600 italic leading-none">{teamInfo?.plateauDistMax || 20} <span className="text-[10px] uppercase not-italic ml-1">KM</span></p>
                  </div>
                  <div className="col-span-full bg-gradient-to-br from-orange-50 to-white p-6 rounded-[2.5rem] border-2 border-orange-200 shadow-xl flex justify-between items-center px-10">
                     <div className="space-y-1">
                       <p className="text-[9px] font-black uppercase text-orange-600 mb-1 flex items-center gap-2">🏆 Tournoi</p>
                       <p className="text-lg font-black text-orange-600 uppercase italic tracking-tighter">{teamInfo?.tournamentReach || 'DÉPARTEMENTAL'}</p>
                     </div>
                     <Trophy size={40} className="text-orange-400 opacity-50" />
                  </div>
                </div>
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
