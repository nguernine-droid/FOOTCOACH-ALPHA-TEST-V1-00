'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, Copy, CheckCircle2, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface ReferralQRCodeProps {
  isPro: boolean;
}

export function ReferralQRCode({ isPro }: ReferralQRCodeProps) {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [sponsoredCount, setSponsoredCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadReferral(); }, []);

  const loadReferral = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code, first_name, last_name, nickname')
        .eq('id', user.id)
        .single();

      if (profile) {
        // Générer le code si absent
        let code = profile.referral_code;
        if (!code) {
          const name = (profile.nickname || profile.first_name || 'COACH').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
          code = `${name}${user.id.slice(0, 4).toUpperCase()}`;
          await supabase.from('profiles').update({ referral_code: code }).eq('id', user.id);
        }
        setReferralCode(code);

        // Compter les filleuls
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('referred_by', user.id);
        setSponsoredCount(count || 0);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  // QR universel : pointe vers la page publique du coach
  // Gère parrainage + échange de cartes + suivi selon le contexte
  const referralUrl = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://footcoach.app'}/public/coach/${referralCode}`
    : '';

  const handleCopy = async () => {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralUrl || !navigator.share) { handleCopy(); return; }
    await navigator.share({
      title: 'Rejoins FootCoach !',
      text:  'Je t\'invite à rejoindre FootCoach — l\'app de gestion et matchmaking pour coachs de foot amateur.',
      url:   referralUrl,
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 size={24} className="animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Compteur filleuls */}
      <div className={`flex items-center justify-between p-4 rounded-2xl ${isPro ? 'bg-orange-50 border border-orange-100' : 'bg-white/5 border border-white/10'}`}>
        <div className="flex items-center gap-3">
          <Users size={18} className={isPro ? 'text-orange-600' : 'text-neon-cyan'} />
          <div>
            <p className={`text-[11px] font-black uppercase ${isPro ? 'text-gray-900' : 'text-white'}`}>
              {isPro ? 'Mes filleuls' : 'Recrues parrainées'}
            </p>
            <p className={`text-[9px] font-bold uppercase ${isPro ? 'text-gray-400' : 'text-gray-500'}`}>
              {sponsoredCount === 0 ? 'Aucun pour l\'instant' : `${sponsoredCount} coach${sponsoredCount > 1 ? 's' : ''} rejoint${sponsoredCount > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <span className={`text-3xl font-black ${isPro ? 'text-orange-600' : 'text-neon-cyan'}`}>
          {sponsoredCount}
        </span>
      </div>

      {/* QR Code */}
      <div className={`rounded-3xl overflow-hidden border-2 ${isPro ? 'border-gray-100' : 'border-white/10'}`}>
        <div className={`px-5 py-3 flex items-center justify-between ${isPro ? 'bg-gray-50 border-b border-gray-100' : 'bg-white/5 border-b border-white/5'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest ${isPro ? 'text-gray-500' : 'text-gray-400'}`}>
            {isPro ? 'Mon QR de parrainage' : 'Signal_Parrainage'}
          </p>
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isPro ? 'bg-orange-100 text-orange-600' : 'bg-neon-cyan/10 text-neon-cyan'}`}>
            {referralCode}
          </span>
        </div>

        <div className="p-6 flex flex-col items-center gap-4 bg-white">
          <QRCodeSVG
            value={referralUrl}
            size={180}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
            imageSettings={{
              src: '/icons/icon-192x192.png',
              height: 36,
              width: 36,
              excavate: true,
            }}
          />
          <p className="text-[9px] font-bold text-gray-400 uppercase text-center">
            Fais scanner ce code pour inviter un coach
          </p>
        </div>

        {/* Actions */}
        <div className={`grid grid-cols-2 divide-x ${isPro ? 'divide-gray-100 border-t border-gray-100' : 'divide-white/5 border-t border-white/5'}`}>
          <button
            onClick={handleCopy}
            className={`py-4 flex items-center justify-center gap-2 font-black text-[10px] uppercase active:scale-95 transition-all
              ${isPro ? 'text-gray-600 hover:bg-gray-50' : 'text-gray-400 hover:bg-white/5'}`}
          >
            {copied
              ? <><CheckCircle2 size={16} className="text-green-500" /> Copié !</>
              : <><Copy size={16} /> Copier le lien</>
            }
          </button>
          <button
            onClick={handleShare}
            className={`py-4 flex items-center justify-center gap-2 font-black text-[10px] uppercase active:scale-95 transition-all
              ${isPro ? 'bg-orange-600 text-white' : 'bg-neon-cyan text-black'}`}
          >
            <Share2 size={16} /> Partager
          </button>
        </div>
      </div>

      <p className={`text-[9px] font-bold uppercase text-center ${isPro ? 'text-gray-300' : 'text-gray-600'}`}>
        🏅 Bonus XP pour chaque filleul actif — disponible en V2
      </p>
    </div>
  );
}
