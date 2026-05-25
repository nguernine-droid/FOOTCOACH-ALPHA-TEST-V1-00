'use client';

import React from 'react';
import { User } from 'lucide-react';

interface CoachCardProps {
  name: string;
  clubName: string;
  clubLogo?: string;
  coachPhoto?: string;
  category: string;
  level?: string;
  points: number;
  status: 'inactif' | 'actif' | 'toujours_pret';
  matchesPlayed: number;
  announcementsSent: number;
  contactsMade: number;
  engagementRate: number;
  grade?: string;
  matchDist?: number;
  plateauDist?: number;
  tournamentReach?: string;
}

/**
 * COACH_CARD (v22.0 - FIFA ULTIMATE TEAM STYLE)
 * Carte prestige FIFA avec rareté selon grade.
 * - Silver: Coach Engagé
 * - Gold: Coach Contributeur
 * - Elite: Coach Ambassadeur
 */
export function CoachCard({
  name, clubName, clubLogo, coachPhoto, category, points, status,
  matchesPlayed, announcementsSent, contactsMade, engagementRate, 
  grade = 'Coach Engagé', level = 'D1'
}: CoachCardProps) {

  // Mapping des stats FIFA (0-99)
  const stats = {
    pac: Math.min(99, matchesPlayed * 5),        // Pace: matchesPlayed
    dri: Math.min(99, announcementsSent * 8),    // Dribbling: initiatives
    sho: Math.min(99, engagementRate),            // Shooting: engagement rate
    def: Math.min(99, parseInt(level.replace(/[D]/g, '')) * 15 + 70), // Defense: niveau
    pas: Math.min(99, Math.floor(points / 10)),   // Passing: points/expérience
    phy: Math.min(99, contactsMade * 4)           // Physical: contacts
  };

  const overall = Math.round((stats.pac + stats.dri + stats.sho + stats.def + stats.pas + stats.phy) / 6);

  // Système de rareté
  const rarityThemes = {
    'Coach Engagé': {
      border: 'border-gray-400',
      bg: 'from-gray-600 to-gray-700',
      accent: 'text-gray-200',
      bgCard: 'bg-gradient-to-br from-gray-700 to-gray-800',
      rarityBadge: '🥈 Silver'
    },
    'Coach Contributeur': {
      border: 'border-yellow-500',
      bg: 'from-yellow-600 to-yellow-700',
      accent: 'text-yellow-100',
      bgCard: 'bg-gradient-to-br from-yellow-700 to-yellow-800',
      rarityBadge: '🟡 Gold'
    },
    'Coach Ambassadeur': {
      border: 'border-orange-400',
      bg: 'from-orange-600 to-orange-700',
      accent: 'text-orange-100',
      bgCard: 'bg-gradient-to-br from-orange-700 to-orange-800',
      rarityBadge: '🏆 Elite'
    }
  };

  const rarity = rarityThemes[grade as keyof typeof rarityThemes] || rarityThemes['Coach Engagé'];

  return (
    <div className={`w-full max-w-[320    <div className={`w-full max-w-[320    <div className={`w-full max-w-[320    <div className={`w-full m{rarity.border} relative group cursor-pointer transform transition-all duration-500 hover:scale-105 hover:shadow-2xl animate-in zoom-in-95 fade-in duration-1000`}>
      
      {/* Texture Pattern */}
      <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" hei      <div className="absolute inset-0 op"100\" height=\"100\"/><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"%23000\" opacity=\"0.05\"/></svg>      <div className="absoame="relativ      <div classNameol">
        
        {/* HEADER */}
                        flex justify-between items-start p-4 pb-2">
          {/* Position & Overall */}
          <div className="flex flex-col items-center">
            <div className="text-xs font-black text-white/70 uppercase tracking-wider">COACH</div>
            <div className={`text-4xl font-            <div className={`text-4xl font-            <div className={`text-4xl font-            <div className={`text-4xl font-            <div className={`text-4xl font-            <div className={`text-4xl font-            <div className={`text-4xl font-            <div classNaclubLogo} className="w-full h-full object-contain" alt="Club" />
            ) : (
              <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                <User size={20} className="text-gray-600" />
              </div>
            )}
          </div>
        </div>

        {/* PLAYER NAME & CATEGORY */}
        <div className="px-4 py-2">
          <h2 className={`text-lg font-black uppercas          <h2 className={`text-lg font-black uppercas          <h2            <h2 className={`text-lg f        <p className="text-[10px] font-bold text-white/60          <h2 className={`text-lg font-black uppercas          <h2 className={`text-lg font-b   {/*          <h2 className={`text-lg font-black uppercas          <h2 className={`text-lg font-black uppercas          <h2            <h2 className={`text-lg f        <p className="text-[10px] font-bold text-white/60          <h2 className={`text-lg font-black uppercas          <h2 className={`text-lg font-b   {/*          <h2 className={`text-lg font-black uppercas          <h2 classNamect-cover" alt={name} />
            ) : (
              <User size={60} className="text-white/20" />
            )}
          </div>
        </div>

        {/* STATS GRID (2x3) */}
        <div className="px-3 pb-4 space-y-2">
          {/* Row 1 */}
          <div className="grid grid-cols-3 gap-1.5">
            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatBo            <StatB     {/* Grade Info */}
        <div className="px-3 pb-3">
          <p className="text-[9px] font-black text-white/80 uppercase tracking-widest text-center">
            {grade}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Composant StatBox pour afficher une stat FIFA
 */
function StatBox({ label, value }: { label: string; value: number }) {
  const getStatColor = (val: number) => {
    if (val >= 85) return 'text-green-400 font-black';
    if (val >= 70) return 'text-yellow-300 font-black';
    if (val >= 50) return 'text-orange-400 font-black';
    return 'text-red-400 font-black';
  };

  return (
    <div className="bg-black/40 rounded-lg p-2 border border-white/10 flex flex-col items-center">
      <p className="text-[8px] font-bold text-white/70 uppercase tracking-wider">{label}</p>
      <p className={`text-base font-black mt-1 ${getStatColor(value)}`}>{Math.min(99, value)}</p>
    </div>
  );
}
