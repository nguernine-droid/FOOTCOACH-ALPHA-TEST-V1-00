"use client";

import { useState } from "react";
import { CircleCheck, Download, Share, Smartphone, SquarePlus } from "lucide-react";
import { promptInstall, useInstallOffer } from "@/lib/install";

/**
 * L'invitation à installer, posée sur la vitrine elle-même.
 *
 * L'écoute de `beforeinstallprompt` vit à la racine (InstallPromptListener),
 * donc l'événement est déjà attrapé quand ce composant se monte — un visiteur
 * Android peut installer TeamNexus AVANT MÊME d'avoir un compte, en une touche,
 * depuis la page d'accueil. C'est le chemin le plus court qui existe entre
 * « je découvre » et « c'est sur mon téléphone ».
 *
 * Trois états, jamais d'impasse :
 * - Chromium prête sa boîte d'installation : un vrai bouton ;
 * - iOS n'a pas d'API : le geste, illustré avec les icônes du système ;
 * - rien à proposer (déjà installée, navigateur de bureau sans PWA) : on dit
 *   où l'ouvrir, plutôt que d'afficher un bouton qui ne ferait rien.
 */
export function InstallShowcase() {
  const offer = useInstallOffer();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="text-sm font-bold text-success flex items-center gap-2">
        <CircleCheck size={16} className="shrink-0" aria-hidden />
        TeamNexus est sur votre écran d&apos;accueil.
      </p>
    );
  }

  if (offer === "button") {
    return (
      <div className="space-y-3">
        <button
          type="button"
          className="btn btn-accent inline-flex items-center justify-center gap-2 font-bold rounded-lg
            px-6 py-4 text-[17px] min-h-14 w-full min-[640px]:w-auto transition active:scale-[0.97]"
          onClick={async () => {
            // Un refus ne se rattrape pas : l'événement est consommé. Insister
            // reviendrait à ne pas entendre la réponse.
            if ((await promptInstall()) === "accepted") setDone(true);
          }}
        >
          <Download size={18} /> Installer l&apos;application
        </button>
        <p className="text-[11px] text-ink-faint">
          Une touche, aucun magasin d&apos;applications, moins d&apos;un mégaoctet.
        </p>
      </div>
    );
  }

  if (offer === "ios-tutorial") {
    return (
      <ol className="space-y-2.5">
        <Step index={1} icon={<Share size={14} aria-hidden />}>
          Appuyez sur <strong className="text-ink font-bold">Partager</strong>, dans la barre de Safari.
        </Step>
        <Step index={2} icon={<SquarePlus size={14} aria-hidden />}>
          Choisissez <strong className="text-ink font-bold">Sur l&apos;écran d&apos;accueil</strong>.
        </Step>
        <Step index={3} icon={<CircleCheck size={14} aria-hidden />}>
          Confirmez : l&apos;icône rejoint vos applications, alertes de match comprises.
        </Step>
      </ol>
    );
  }

  // Bureau, ou déjà installée : le téléphone est le bon endroit, on le dit.
  return (
    <p className="text-sm text-ink-soft flex items-start gap-2.5">
      <Smartphone size={16} className="shrink-0 mt-0.5 text-blue" aria-hidden />
      <span>
        Ouvrez <strong className="text-ink font-bold">teamnexus.fr</strong> sur votre téléphone : l&apos;installation
        vous y sera proposée en une touche.
      </span>
    </p>
  );
}

function Step({ index, icon, children }: { index: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-ink-soft">
      <span className="w-6 h-6 rounded-full bg-blue-soft text-primary flex items-center justify-center text-[11px] font-black shrink-0">
        {index}
      </span>
      <span className="min-w-0 flex items-start gap-1.5">
        <span className="text-blue mt-0.5 shrink-0">{icon}</span>
        <span>{children}</span>
      </span>
    </li>
  );
}
