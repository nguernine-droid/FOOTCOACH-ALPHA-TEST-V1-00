"use client";

import { useState } from "react";
import { CircleCheck, Download, Share, Smartphone, SquarePlus } from "lucide-react";
import { promptInstall, useInstallOffer } from "@/lib/install";
import { Button } from "@/components/ui/Button";

/**
 * Ajouter l'application à l'écran d'accueil, dit dans les termes du système de
 * celui qui regarde.
 *
 * Android reçoit un bouton : le navigateur nous prête sa boîte d'installation,
 * une touche suffit. iOS reçoit le geste illustré, parce qu'Apple n'expose
 * aucune API et que « Partager puis Sur l'écran d'accueil » ne se devine pas.
 *
 * Et quand il n'y a rien à proposer — déjà installée, navigateur qui ne sait
 * pas faire — le composant ne rend RIEN. Une invitation sans issue laisse le
 * coach chercher un bouton qui n'existe pas.
 */
export function InstallAppCard() {
  const offer = useInstallOffer();
  const [done, setDone] = useState(false);

  if (offer === "none" && !done) return null;

  if (done) {
    return (
      <Frame>
        <p className="text-xs font-bold text-success flex items-center gap-2">
          <CircleCheck size={14} className="shrink-0" aria-hidden />
          FootCoach est sur votre écran d&apos;accueil.
        </p>
      </Frame>
    );
  }

  if (offer === "button") {
    return (
      <Frame>
        <Header>Installez FootCoach sur votre téléphone</Header>
        <p className="text-xs text-ink-soft">
          Elle s&apos;ouvrira comme une application, en plein écran, et vous recevrez les alertes de match même
          l&apos;application fermée.
        </p>
        <Button
          type="button"
          variant="soft"
          className="w-full"
          onClick={async () => {
            // Un refus ne se rattrape pas : l'événement est consommé, et le
            // composant retombe alors sur `none`. C'est voulu — insister
            // reviendrait à ne pas entendre la réponse.
            if ((await promptInstall()) === "accepted") setDone(true);
          }}
        >
          <Download size={15} /> Installer l&apos;application
        </Button>
      </Frame>
    );
  }

  // iOS : aucune API, seulement un chemin à montrer. Les trois gestes dans
  // l'ordre, avec les icônes du système plutôt que leurs noms — c'est le
  // dessin qu'on cherche des yeux dans la barre, pas le mot.
  return (
    <Frame>
      <Header>Ajoutez FootCoach à votre écran d&apos;accueil</Header>
      <p className="text-xs text-ink-soft">
        Sur iPhone, c&apos;est la seule façon de recevoir les alertes de match — Safari ne les autorise qu&apos;aux
        applications installées.
      </p>
      <ol className="space-y-2">
        <Step index={1} icon={<Share size={14} aria-hidden />}>
          Appuyez sur <span className="font-bold text-ink">Partager</span>, dans la barre de Safari.
        </Step>
        <Step index={2} icon={<SquarePlus size={14} aria-hidden />}>
          Faites défiler jusqu&apos;à <span className="font-bold text-ink">Sur l&apos;écran d&apos;accueil</span>.
        </Step>
        <Step index={3} icon={<CircleCheck size={14} aria-hidden />}>
          Confirmez avec <span className="font-bold text-ink">Ajouter</span>. L&apos;icône rejoint vos applications.
        </Step>
      </ol>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line bg-paper px-4 py-4 space-y-3">{children}</div>;
}

function Header({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold flex items-center gap-2">
      <Smartphone size={15} className="text-blue shrink-0" aria-hidden />
      {children}
    </p>
  );
}

function Step({ index, icon, children }: { index: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-xs text-ink-soft">
      <span
        className="w-6 h-6 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0"
        aria-hidden
      >
        {icon}
      </span>
      <span className="pt-0.5">
        <span className="sr-only">Étape {index} : </span>
        {children}
      </span>
    </li>
  );
}
