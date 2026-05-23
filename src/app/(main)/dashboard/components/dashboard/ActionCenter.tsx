'use client';

import React from 'react';
import { Zap, UserCheck, MessageSquare, Megaphone } from 'lucide-react';

// ==========================================
// TYPES
// ==========================================
export type ActionType = 'convocation' | 'message' | 'annonce';

interface ActionCenterProps {
  isPro: boolean;
  onAction: (type: ActionType) => void;
}

export function ActionCenter({ isPro, onAction }: ActionCenterProps) {
  // Configuration des 3 boutons pour éviter la répétition de code
  const actions = [
    {
      type: 'convocation' as ActionType,
      icon: UserCheck,
      label: 'Convoquer',
      stylePro: 'bg-orange-600 text-white hover:bg-orange-700',
      styleCyber: 'bg-neon-orange text-black shadow-[0_0_15px_#FF6B00] hover:bg-orange-500',
    },
    {
      type: 'message' as ActionType,
      icon: MessageSquare,
      label: 'Message',
      stylePro: 'bg-blue-600 text-white hover:bg-blue-700',
      styleCyber: 'bg-neon-cyan text-black shadow-[0_0_15px_#00F0FF] hover:bg-cyan-300',
    },
    {
      type: 'annonce' as ActionType,
      icon: Megaphone,
      label: 'Briefing',
      stylePro: 'bg-purple-600 text-white hover:bg-purple-700',
      styleCyber: 'bg-neon-magenta text-white shadow-[0_0_15px_#FF00FF] hover:bg-pink-500',
    },
  ];

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
              onClick={() => onAction(action.type)}
              className={`p-4 rounded-2xl flex flex-col items-center gap-2 border-2 border-transparent transition-all active:scale-95 ${
                isPro ? action.stylePro : action.styleCyber
              }`}
            >
              <Icon size={24} />
              <span className="text-[9px] font-black uppercase">{action.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
