'use client';

import React, { useState } from 'react';
import {
  User, Share2, QrCode, X, Heart, Wallet, CheckCircle2, Clock, Radio, ChevronRight, Shield, Copy, Camera, ShoppingBag, Image, MessageSquare, Lock, CalendarDays, Trophy
} from 'lucide-react';
import { FifaCard } from '@/components/FifaCard';
import { useTeam } from '@/lib/context/TeamContext';
import { TerminalControl } from './terminal-control';
import { ModalPartage } from '@/components/ui/ModalPartage'; // 1. Import de la Modale

// ==========================================
// MOCK DATA SUPPORTER
// ==========================================
const supporterData = { firstName: "Janine", lastName: "RCX", photo: null, relation: "Grand-parent" };

const initialFollowedKids = [
  { id: '1', firstName: 'Lucas', club: 'AS Frontignan', category: 'U14', photo: null, cvAccess: true, stats: { phy: 75, tec: 60, eng: 85 }, poste: 'Attaquant', niveau: 'D1', saison: '24/25' },
  { id: '2', firstName: 'Mia', club: 'FC Sète', category: 'U12', photo: null, cvAccess: false, stats: null, poste: null, niveau: null, saison: '24/25' }
];

const initialCagnottes = [
  { id: '1', title: 'Tournoi Madrid Lucas', amount: '300€', status: 'orange' as 'orange' | 'green', kidId: '1', lydiaLink: 'https://lydia.app/pay/1' },
  { id: '2', title: 'Déplacement Sète', amount: '20€', status: 'green' as 'orange' | 'green', kidId: '2', lydiaLink: 'https://lydia.app/pay/2' }
];

export default function SupporterView() {
  const { teamInfo } = useTeam();

  // States
  const [selectedKid, setSelectedKid] = useState<string | null>(initialFollowedKids[0].id);
  const [cagnottes, setCagnottes] = useState(initialCagnottes);
  const [showShareModal, setShowShareModal] = useState(false); // 2. State Modale

  // 3. Lien de partage dynamique
  const shareLink = `https://nexus-os.app/supporteur/${(teamInfo?.userFirstName || 'janine').toLowerCase()}-${(teamInfo?.userLastName || 'rcx').toLowerCase()}`;

  const activeKid = initialFollowedKids.find(k => k.id === selectedKid);

  const handleDeclarePayment = (cagnotteId: string) => {
    setCagnottes(cagnottes.map(c => c.id === cagnotteId ? { ...c, status: 'green' as 'green' } : c));
  };

  return (
    <div className="space-y-8 text-left">

      {/* ── CARTE D'IDENTITÉ SUPPORTER ── */}
      <section className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
        <div className="relative z-10 flex items-center gap-4 w-full">
          <div className="w-16 h-16 rounded-xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Camera size={28} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-gray-900 uppercase">
              {teamInfo?.userFirstName || 'JANINE'} {teamInfo?.userLastName || 'RCX'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-amber-300 text-amber-700 bg-amber-50">SUPPORTER</span>
              <span className="text-[9px] text-gray-500 font-bold uppercase">{supporterData.relation}</span>
            </div>
          </div>
          {/* Bouton d'ouverture de la modale */}
          <button
            onClick={() => setShowShareModal(true)}
            className="p-3 bg-gray-50 rounded-xl text-gray-500 hover:text-amber-600 border border-gray-200 hover:border-amber-300 transition-all"
          >
            <Share2 size={20} />
          </button>
        </div>
      </section>

      {/* ── VUE CONDITIONNELLE RGPD DE L'UNITÉ SUIVIE ── */}
      {activeKid && (
        <section className="animate-in zoom-in duration-500">
          {activeKid.cvAccess ? (
            <FifaCard
              name={activeKid.firstName}
              team={`${activeKid.club} ${activeKid.category}`}
              score={activeKid.stats ? Math.round((activeKid.stats.phy + activeKid.stats.tec + activeKid.stats.eng)/3) : 0}
              label={activeKid.poste || "UNITÉ"}
              stats={[
                { label: 'PHY', value: activeKid.stats?.phy || 0 },
                { label: 'TEC', value: activeKid.stats?.tec || 0 },
                { label: 'ENG', value: activeKid.stats?.eng || 0 },
                { label: 'NIV', value: activeKid.niveau || '-' },
                { label: 'SAI', value: activeKid.saison },
                { label: 'UNIT', value: activeKid.id }
              ]}
              color="from-[#00F0FF] via-[#004455] to-black"
              textColor="text-white"
            />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                <Lock size={32} />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 uppercase">{activeKid.firstName} {activeKid.club}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Accès aux stats restreint par les parents</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3 text-left space-y-2">
                <p className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-2"><CalendarDays size={12} className="text-gray-400"/> Calendrier des matchs (Public)</p>
                <p className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-2"><Trophy size={12} className="text-gray-400"/> Catégorie : {activeKid.category}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── MES UNITÉS SUIVIES ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b-2 border-gray-100 pb-2 px-2">
           <Heart size={16} className="text-amber-600" />
           <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Mes_Unités_Suivies</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 px-2">
          {initialFollowedKids.map((kid) => (
            <button
              key={kid.id}
              onClick={() => setSelectedKid(kid.id)}
              className={`p-4 rounded-2xl border transition-all text-left relative overflow-hidden ${
                selectedKid === kid.id
                  ? 'border-amber-500 bg-amber-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                   selectedKid === kid.id ? 'border-amber-500 text-amber-600' : 'border-gray-200 text-gray-400'
                 }`}>
                    <User size={20} />
                 </div>
                 {!kid.cvAccess && <Lock size={12} className="text-gray-400" />}
              </div>
              <p className="text-sm font-black text-gray-900 uppercase truncate">{kid.firstName}</p>
              <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{kid.club}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── CONTRIBUTIONS ── */}
      <section className="space-y-4 px-2">
        <div className="flex items-center gap-3 border-b-2 border-gray-100 pb-2">
           <Wallet size={16} className="text-amber-600" />
           <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Contributions</h3>
        </div>
        <div className="space-y-3">
          {cagnottes.map((cagnotte) => {
            const kid = initialFollowedKids.find(k => k.id === cagnotte.kidId);
            return (
              <div key={cagnotte.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs font-black text-gray-900 uppercase">{cagnotte.title}</p><p className="text-[8px] text-gray-500 font-bold uppercase">Pour {kid?.firstName}</p></div>
                  <span className="text-lg font-black text-gray-900 font-mono">{cagnotte.amount}</span>
                </div>
                {cagnotte.status === 'green' ? (
                  <div className="w-full py-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-[10px] font-black uppercase flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> Contribution Validée
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <a href={cagnotte.lydiaLink} target="_blank" className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase text-center hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                      <Wallet size={14}/> Participer
                    </a>
                    <button onClick={() => handleDeclarePayment(cagnotte.id)} className="flex-1 py-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-600 text-[10px] font-black uppercase transition-all active:scale-95">
                      C'est fait ✋
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── BOUTIQUE CLUB ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b-2 border-gray-100 pb-2">
           <ShoppingBag size={16} className="text-amber-600" />
           <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Boutique_Club</h3>
        </div>
        <button className="w-full p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-amber-300 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><ShoppingBag size={20} /></div>
            <div className="text-left">
              <p className="text-xs font-black text-gray-900 uppercase">Acheter un équipement</p>
              <p className="text-[9px] text-gray-500 font-medium">Pour l'enfant suivi</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400 group-hover:text-amber-600" />
        </button>
      </section>

      {/* ── FAN ZONE ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b-2 border-gray-100 pb-2">
           <Radio size={16} className="text-amber-600" />
           <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Fan_Zone</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center gap-2 hover:border-amber-300 transition-all">
            <MessageSquare size={20} className="text-gray-500" />
            <span className="text-[8px] font-black text-gray-600 uppercase">Reporter</span>
          </button>
          <button className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center gap-2 hover:border-amber-300 transition-all">
            <Image size={20} className="text-gray-500" />
            <span className="text-[8px] font-black text-gray-600 uppercase">Galerie</span>
          </button>
          <button className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center gap-2 hover:border-amber-300 transition-all">
            <Trophy size={20} className="text-gray-500" />
            <span className="text-[8px] font-black text-gray-600 uppercase">Résultats</span>
          </button>
        </div>
      </section>

      <TerminalControl hideThemeToggle={true} />

      {/* 4. Composant ModalPartage (Remplace l'ancienne modale en dur) */}
      <ModalPartage
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Régiment Nexus"
        subtitle="Recruter des Supporters"
        shareLink={shareLink}
        accentColor="amber" // Couleur Ambre dédiée Supporter
      />

    </div>
  );
}

