'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

export function PWAInstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Détecter si on est sur iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // 2. Détecter si l'app est déjà installée
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    // Vérifier si l'utilisateur a déjà fermé le popup récemment
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');

    // 3. Gestion Android/Chrome (événement beforeinstallprompt)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      if (!isStandalone && !dismissed) {
        setTimeout(() => setShowPrompt(true), 3000); // Affiche après 3 sec
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Gestion iOS (Pas d'événement, on vérifie juste si non installé)
    if (isIOSDevice && !isStandalone && !dismissed) {
      setIsInstallable(true);
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Affiche le prompt natif d'installation Android
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installée');
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Sauvegarde pour ne pas harceler l'utilisateur (expire après 24h ou session)
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt || !isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom duration-500">
      {/* Utilisation de la couleur Signature (Orange Tangerine) */}
      <div className="bg-brand-orange rounded-2xl p-4 shadow-xl border border-brand-orange-dark/20 text-white">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-extrabold mb-1 italic uppercase tracking-tight text-sm">
              🏟️ Installer FOOTCOACH ALPHA
            </h3>
            {isIOS ? (
              <p className="text-xs text-white/90 leading-relaxed">
                1. Appuyez sur <Share size={14} className="inline mx-1" /> en bas de l'écran<br/>
                2. Puis sur <span className="font-bold">"Sur l'écran d'accueil"</span>
              </p>
            ) : (
              <p className="text-xs text-white/90 leading-relaxed">
                Accédez au Radar et aux convocations directement depuis votre écran d'accueil.
              </p>
            )}
          </div>
          <button onClick={handleDismiss} className="text-white/60 hover:text-white mt-0.5 p-1">
            <X size={16} />
          </button>
        </div>

        {!isIOS && (
          <div className="flex gap-2 mt-3">
            <button onClick={handleDismiss} className="flex-1 px-4 py-2.5 rounded-xl bg-white/20 text-white font-semibold text-xs">
              Plus tard
            </button>
            <button onClick={handleInstall} className="flex-1 px-4 py-2.5 rounded-xl bg-white text-brand-orange font-bold text-xs flex items-center justify-center gap-2 shadow-sm">
              <Download size={14} /> Installer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
