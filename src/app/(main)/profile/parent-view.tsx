'use client';

import React, { useState } from 'react';
import {
  Users, Heart, Baby, Share2, Wallet, Check, Clock, ArrowLeft,
  QrCode, CalendarDays, Mic, Camera
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { TerminalControl } from './terminal-control';
import { ModalPartage } from '@/components/ui/ModalPartage'; // 1. Import de la Modale

interface ParentViewProps {
  onBackToCoach?: () => void;
  showBackButton?: boolean;
}

export function ParentView({ onBackToCoach, showBackButton = false }: ParentViewProps) {
  const { teamInfo } = useTeam();

  // ==========================================
  // STATES & DATA
  // ==========================================
  const [parentData, setParentData] = useState({
    firstName: "Sarah", lastName: "RCX",
    children: [
      { id: '1', firstName: 'Lucas', club: 'AS Frontignan', category: 'U14', level: 'D1', poste: 'Attaquant', allowChildShare: true },
      { id: '2', firstName: 'Mia', club: 'FC Sète', category: 'U12', level: 'Niv 2', poste: 'Milieu', allowChildShare: false }
    ],
    payments: [
      { id: '1', title: 'Tournoi Madrid', amount: '300€', status: 'orange' as 'orange' | 'green', childName: 'Lucas' },
      { id: '2', title: 'Maillot Extérieur', amount: '45€', status: 'green' as 'orange' | 'green', childName: 'Lucas' },
    ]
  });

  const [isReporterActive, setIsReporterActive] = useState(false);

  // 2. States pour la Modale de Partage
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMode, setShareMode] = useState<'parent' | 'child'>('parent');
  const [activeKidId, setActiveKidId] = useState<string | null>(null);

  // 3. Logique de lien dynamique RGPD
  const parentLink = `https://nexus-os.app/parent/${(teamInfo?.userFirstName || 'sarah').toLowerCase()}-${(teamInfo?.userLastName || 'rcx').toLowerCase()}`;
  const activeKid = parentData.children.find(c => c.id === activeKidId);
  const childLink = activeKid ? `https://nexus-os.app/player/${activeKid.firstName.toLowerCase()}-${(teamInfo?.userLastName || 'rcx').toLowerCase()}` : '';

  const currentShareLink = shareMode === 'child' ? childLink : parentLink;

  // ==========================================
  // LOGIQUE
  // ==========================================
  const toggleChildShare = (id: string) => {
    setParentData(prev => ({
      ...prev,
      children: prev.children.map(c => c.id === id ? { ...c, allowChildShare: !c.allowChildShare } : c)
    }));
  };

  const handleOpenParentShare = () => {
    setShareMode('parent');
    setActiveKidId(null);
    setShowShareModal(true);
  };

  const handleOpenChildShare = (kidId: string) => {
    const kid = parentData.children.find(c => c.id === kidId);
    if (kid?.allowChildShare) {
      setShareMode('child');
      setActiveKidId(kidId);
      setShowShareModal(true);
    } else {
      // Optionnel : Déclencher une alerte ou un toast "Activez le partage RGPD d'abord"
      alert("Veuillez activer le partage pour cet enfant d'abord.");
    }
  };

  return (
    <div className="space-y-8 text-left">

      {/* CARTE D'IDENTITÉ PARENT (THÈME CLASSIQUE) */}
      <section className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-600" />
        <div className="relative z-10 flex items-center gap-4 w-full">
          <div className="w-16 h-16 rounded-xl bg-purple-100 border-2 border-purple-200 flex items-center justify-center text-purple-600">
            <Camera size={28} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-gray-900 uppercase">
                {teamInfo?.userFirstName || 'SARAH'} {teamInfo?.userLastName || 'RCX'}
              </h2>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[8px] font-black uppercase rounded-md tracking-wider">Parent</span>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {teamInfo?.clubName || 'Club Non Défini'}
            </p>
          </div>
          {showBackButton && (
            <button onClick={onBackToCoach} className="p-2 bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200 transition-all">
              <ArrowLeft size={18} />
            </button>
          )}
        </div>
      </section>

      {/* OPTION PARTAGE PARENT */}
      <button
        onClick={handleOpenParentShare}
        className="w-full p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-purple-300 transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <QrCode size={20} />
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-gray-900 uppercase">Partager ma Carte</p>
            <p className="text-[9px] text-gray-500 font-medium">Réseautage, covoiturage...</p>
          </div>
        </div>
        <Share2 size={18} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
      </button>

      {/* SECTION MES ENFANTS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-gray-100 pb-2">
          <div className="flex items-center gap-3">
            <Heart size={16} className="text-purple-600" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Mes_Enfants</h3>
          </div>
        </div>
        <div className="space-y-3">
          {parentData.children.map((child) => (
            <div key={child.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                    <Baby size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-gray-900 uppercase">{child.firstName}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{child.club} // {child.category}</p>
                  </div>
                </div>
                {/* Bouton Partage Enfant (Vérifie le RGPD au clic) */}
                <button
                  onClick={() => handleOpenChildShare(child.id)}
                  className={`p-2 rounded-xl transition-all ${child.allowChildShare ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                >
                  <Share2 size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="text-left">
                  <p className="text-[9px] text-gray-500 font-black uppercase">Poste: <span className="text-gray-900">{child.poste}</span> | Niv: <span className="text-gray-900">{child.level}</span></p>
                </div>
                {/* Verrou RGPD (Le Toggle) */}
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black uppercase ${child.allowChildShare ? 'text-green-600' : 'text-gray-400'}`}>
                    {child.allowChildShare ? 'Partagé' : 'Bloqué'}
                  </span>
                  <button
                    onClick={() => toggleChildShare(child.id)}
                    className={`w-8 h-4 rounded-full relative transition-all ${child.allowChildShare ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${child.allowChildShare ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SUIVI LOGISTIQUE & CALENDRIER */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b-2 border-gray-100 pb-2">
          <Wallet size={16} className="text-purple-600" />
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Logistique_&_Paiements</h3>
        </div>
        <div className="space-y-3">
          {parentData.payments.map((pay) => (
            <div key={pay.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 ${
                  pay.status === 'green' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-orange-50 border-orange-200 text-orange-500'
                }`}>
                  {pay.status === 'green' ? <Check size={20} /> : <Clock size={20} />}
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-gray-900 uppercase">{pay.title}</p>
                  <p className="text-[8px] text-gray-500 font-bold uppercase">Pour {pay.childName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-gray-900 font-mono">{pay.amount}</p>
                <p className={`text-[8px] font-black uppercase tracking-widest ${pay.status === 'green' ? 'text-green-600' : 'text-orange-500'}`}>
                  {pay.status === 'green' ? 'Validé' : 'En attente'}
                </p>
              </div>
            </div>
          ))}

          <button className="w-full p-4 bg-white rounded-2xl border border-dashed border-gray-300 flex items-center justify-center gap-4 group hover:border-purple-400 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:text-purple-600 transition-colors">
              <CalendarDays size={20} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-gray-900 uppercase">Calendrier Familial</p>
              <p className="text-[9px] text-gray-500 font-medium">Prochains matchs et entraînements</p>
            </div>
          </button>
        </div>
      </section>

      {/* MODE REPORTER */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b-2 border-gray-100 pb-2">
          <Mic size={16} className="text-purple-600" />
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Mode_Reporter</h3>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="text-left">
            <p className="text-xs font-black text-gray-900 uppercase">Flux Commentaires</p>
            <p className="text-[9px] text-gray-500 font-medium">Commenter le match en direct</p>
          </div>
          <button
            onClick={() => setIsReporterActive(!isReporterActive)}
            className={`w-10 h-5 rounded-full relative transition-all ${isReporterActive ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isReporterActive ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      </section>

      <TerminalControl hideThemeToggle={true} />

      {/* 4. Composant ModalPartage */}
      <ModalPartage
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={shareMode === 'parent' ? "Mon Profil" : `Profil de ${activeKid?.firstName}`}
        subtitle={shareMode === 'parent' ? "Réseau Parent" : "CV Sportif Enfant"}
        shareLink={currentShareLink}
        accentColor="magenta" // Couleur dédiée Parent
      />

    </div>
  );
}

