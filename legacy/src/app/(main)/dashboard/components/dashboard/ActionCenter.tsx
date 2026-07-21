'use client';

import React from 'react';
import { Zap, UserCheck, MessageSquare, Megaphone, Lock } from 'lucide-react';

// ==========================================
// TYPES
// ==========================================
export type ActionType = 'convocation' | 'message' | 'annonce';

interface ActionCenterProps {
  isPro: boolean;
  onAction: (type: ActionType) => void;
}

export function ActionCenter({ isPro, onAction }: ActionCenterProps) {
  // Configuration des 3 boutons
  // AJOUT DE LOCKED: true pour brider la version Alpha
  const actions = [
    {
      type: 'convocation' as ActionType,
      icon: UserCheck,
      label: 'Convoquer',
      stylePro: 'bg-orange-600 text-white hover:bg-orange-700',
      styleCyber: 'bg-neon-orange text-black shadow-[0_0_15px_#FF6B00] hover:bg-orange-500',
      locked: true
    },
    {
      type: 'message' as ActionType,
      icon: MessageSquare,
      label: 'Message',
      stylePro: 'bg-blue-600 text-white hover:bg-blue-700',
      styleCyber: 'bg-neon-cyan text-black shadow-[0_0_15px_#00F0FF] hover:bg-cyan-300',
      locked: true
    },
    {
      type: 'annonce' as ActionType,
      icon: Megaphone,
      label: 'Briefing',
      stylePro: 'bg-purple-600 text-white hover:bg-purple-700',
      styleCyber: 'bg-neon-magenta text-white shadow-[0_0_15px_#FF00FF] hover:bg-pink-500',
      locked: true
    },
  ];

  const handleActionClick = (action: any) => {
    if (action.locked) {
      alert("🚧 MODULE EN DÉVELOPPEMENT\nLes fonctions d'interaction directe seront activées après la phase de test du Radar.");
      return;
    }
    onAction(action.type);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Zap size={16} className={isPro ? 'text-orange-600' : 'text-neon-orange'} />
        <h3 className={`text-xs font-black uppercase tracking-widest ${isPro ? 'text-gray-900' : 'text-white'}`}>
          Actions Rapides
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.type}
              onClick={() => handleActionClick(action)}
              className={`p-4 rounded-2xl flex flex-col items-center gap-2 border-2 border-transparent transition-all active:scale-95 relative overflow-hidden ${
                isPro ? action.stylePro : action.styleCyber
              } ${action.locked ? 'opacity-40 grayscale-[0.5]' : ''}`}
            >
              {action.locked && (
                <div className="absolute top-1 right-2">
                  <Lock size={10} className="text-white/50" />
                </div>
              )}
              <Icon size={24} />
              <span className="text-[9px] font-black uppercase">{action.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
