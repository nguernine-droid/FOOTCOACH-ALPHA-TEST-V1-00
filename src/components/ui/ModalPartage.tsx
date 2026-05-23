'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Share2, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTeam } from '@/lib/context/TeamContext';

interface ModalPartageProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  shareLink: string;
  accentColor?: 'cyan' | 'orange' | 'magenta' | 'amber'; // Couleur selon le rôle
}

export function ModalPartage({ isOpen, onClose, title, subtitle, shareLink, accentColor = 'cyan' }: ModalPartageProps) {
  const { theme } = useTeam();
  const isPro = theme === 'classic';
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Gestion des couleurs d'accent
  const accentStyles = {
    cyan: { text: 'text-neon-cyan', border: 'border-neon-cyan/30', bg: 'bg-neon-cyan', shadow: 'shadow-[0_0_20px_#00F0FF]' },
    orange: { text: 'text-neon-orange', border: 'border-neon-orange/30', bg: 'bg-neon-orange', shadow: 'shadow-[0_0_20px_#FF6B00]' },
    magenta: { text: 'text-neon-magenta', border: 'border-neon-magenta/30', bg: 'bg-neon-magenta', shadow: 'shadow-[0_0_20px_#FF00FF]' },
    amber: { text: 'text-amber-600', border: 'border-amber-300', bg: 'bg-amber-500', shadow: 'shadow-md' }
  };

  const currentAccent = isPro ? accentStyles.amber : accentStyles[accentColor];

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Découvre mon profil sur FOOTCOACH ALPHA !`,
          url: shareLink,
        });
      } catch (error) {
        // L'utilisateur a annulé le partage natif
      }
    } else {
      handleCopy(); // Fallback si pas de partage natif (ex: desktop)
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/60 backdrop-blur-lg animate-in fade-in duration-300 p-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className={`relative w-full max-w-sm ${isPro ? 'bg-white rounded-[2rem] shadow-xl' : 'bg-[#0A0A0A] rounded-[3rem] border-2 shadow-2xl'} ${currentAccent.border} p-8`}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 text-left">
          <div>
            <h2 className={`text-xl font-black ${isPro ? 'text-gray-900' : 'text-white'} uppercase tracking-tighter`}>{title}</h2>
            <p className={`text-[9px] font-mono uppercase tracking-[0.3em] mt-1 ${currentAccent.text}`}>{subtitle}</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isPro ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-white/5 text-gray-500 hover:text-white border border-white/10'}`}>
            <X size={20} />
          </button>
        </div>

        {/* QR Code Container */}
        <div className={`flex flex-col items-center space-y-6`}>
          <div className={`${isPro ? 'bg-gray-50 p-4 rounded-2xl' : 'bg-white p-4 rounded-2xl'} ${isPro ? '' : currentAccent.shadow} transition-all`}>
            <QRCodeSVG
              value={shareLink}
              size={180}
              bgColor={isPro ? "#F9FAFB" : "#FFFFFF"}
              fgColor={isPro ? "#111827" : "#000000"}
              level={"H"} // High quality
              includeMargin={false}
            />
          </div>

          {/* Lien copiable */}
          <div className={`w-full ${isPro ? 'bg-gray-100 border-gray-200' : 'bg-black/40 border-white/10'} border rounded-xl p-3 flex items-center justify-between`}>
            <p className={`text-xs font-mono truncate ${isPro ? 'text-gray-600' : 'text-white'}`}>{shareLink}</p>
            <button onClick={handleCopy} className={`${currentAccent.text} ml-2 hover:opacity-80 transition-opacity`}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>

          {/* Bouton de Partage Natif / Secondaire */}
          <button
            onClick={handleNativeShare}
            className={`w-full py-4 rounded-xl ${currentAccent.bg} text-white font-black uppercase italic text-xs ${isPro ? '' : currentAccent.shadow} hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2`}
          >
            <Share2 size={16} /> {copied ? 'Lien Copié !' : 'Partager le Nexus'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}