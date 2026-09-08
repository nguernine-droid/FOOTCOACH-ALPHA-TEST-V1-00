"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Download, House, Share, SquarePlus } from "lucide-react";
import { promptInstall, useInstallOffer } from "@/lib/install";
import { INSTALL_INVITE_KEY, inviteMemo, isInviteSnoozed } from "@/lib/installInvite";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";

/**
 * ————— « Vous êtes dans le navigateur » —————
 *
 * Beaucoup de coachs arrivent par une recherche, restent dans Safari ou Chrome,
 * et s'en tiennent là. Certains ont même déjà posé l'icône sur leur écran
 * d'accueil sans jamais s'en servir : ils rouvrent l'onglet, par habitude.
 *
 * Ce qu'ils y perdent n'est pas du confort. Sur iPhone, les notifications
 * n'existent QUE dans l'application installée : un coach resté dans Safari ne
 * saura jamais qu'on lui a répondu, et il conclura que personne ne répond.
 *
 * Trois principes tiennent cet écran :
 *
 * 1. **On ne sait pas si elle est installée.** iOS n'expose rien là-dessus. Au
 *    lieu de deviner, on dit les deux choses dans l'ordre utile : d'abord
 *    « ouvrez-la par son icône », ensuite « pas encore installée ? voici
 *    comment ». La première ligne parle à ceux qu'on ne peut pas détecter.
 * 2. **On n'insiste jamais deux fois de la même façon.** « Plus tard » range la
 *    proposition pour une semaine, « Ne plus me le proposer » définitivement.
 *    Un coach qui tient à son navigateur a le droit d'y rester : le harceler le
 *    ferait partir pour de bon, pas installer.
 * 3. **Pas d'invitation sans issue.** Si le navigateur ne sait pas installer —
 *    ou si l'on tourne DÉJÀ depuis l'écran d'accueil — `useInstallOffer` rend
 *    `none` et rien ne s'affiche.
 */

/** L'app se peint d'abord : une fenêtre qui saute au visage avant le contenu se ferme sans être lue */
const APPEAR_AFTER_MS = 1200;

/**
 * Le stockage peut LEVER au lieu de répondre — navigation privée, site data
 * bloqué, capture d'aperçu. Les deux accès sont donc gardés, et la décision
 * elle-même vit dans `lib/installInvite`, où elle s'éprouve sans navigateur.
 */
function isSnoozed(): boolean {
  try {
    return isInviteSnoozed(localStorage.getItem(INSTALL_INVITE_KEY), Date.now());
  } catch {
    // Dans le doute on parle : rater une invitation est un moindre mal
    return false;
  }
}

function remember(choice: "later" | "never") {
  try {
    localStorage.setItem(INSTALL_INVITE_KEY, inviteMemo(choice, Date.now()));
  } catch {
    /* Rien à mémoriser : la fenêtre reviendra, c'est le moindre mal */
  }
}

export function InstallInvite() {
  const offer = useInstallOffer();
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // `offer` vaut `none` au premier rendu (le serveur ne connaît ni le système
    // ni l'état d'installation) : l'effet se rejoue dès que l'hydratation tranche.
    if (offer === "none" || isSnoozed()) return;
    const timer = setTimeout(() => setOpen(true), APPEAR_AFTER_MS);
    return () => clearTimeout(timer);
  }, [offer]);

  if (!open) return null;

  function close(choice: "later" | "never") {
    remember(choice);
    setOpen(false);
  }

  if (installed) {
    return (
      <BottomSheet
        label="Application installée"
        onClose={() => close("never")}
        footer={
          <Button type="button" className="w-full" onClick={() => close("never")}>
            Parfait
          </Button>
        }
      >
        <div className="p-5 text-center space-y-2">
          <span className="w-12 h-12 rounded-xl bg-success-surface text-success flex items-center justify-center mx-auto">
            <CircleCheck size={24} aria-hidden />
          </span>
          <h2 className="display text-lg">C&apos;est fait</h2>
          <p className="text-sm text-ink-soft">
            FootCoach est sur votre écran d&apos;accueil. Ouvrez-la par son icône la prochaine fois, pas par le
            navigateur.
          </p>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      label="Ouvrir FootCoach comme une application"
      onClose={() => close("later")}
      footer={
        <div className="space-y-2">
          {offer === "button" && (
            <Button
              type="button"
              className="w-full"
              onClick={async () => {
                // Un refus consomme l'événement : l'offre disparaît d'elle-même,
                // et on n'a pas à repasser derrière pour insister.
                if ((await promptInstall()) === "accepted") setInstalled(true);
                else close("later");
              }}
            >
              <Download size={16} /> Installer l&apos;application
            </Button>
          )}
          <Button type="button" variant="ghost" className="w-full" onClick={() => close("later")}>
            Plus tard
          </Button>
          <button
            type="button"
            onClick={() => close("never")}
            className="w-full min-h-11 text-xs font-semibold text-ink-faint transition hover:text-ink-soft"
          >
            Ne plus me le proposer
          </button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <div className="text-center space-y-1.5">
          <span className="w-12 h-12 rounded-xl bg-accent-surface text-accent flex items-center justify-center mx-auto">
            <House size={22} aria-hidden />
          </span>
          <h2 className="display text-lg">Vous êtes dans votre navigateur</h2>
          <p className="text-sm text-ink-soft">
            FootCoach marche mieux lancée depuis votre écran d&apos;accueil, comme une vraie application.
          </p>
        </div>

        {/* D'abord ceux qui l'ont DÉJÀ installée : on ne peut pas les
            reconnaître, alors on leur parle en premier. */}
        <div className="rounded-lg bg-paper p-3.5 space-y-1">
          <p className="text-xs font-black text-ink">Vous l&apos;avez déjà ajoutée ?</p>
          <p className="text-xs text-ink-soft leading-relaxed">
            Fermez cet onglet et ouvrez FootCoach par son icône, sur votre écran d&apos;accueil. C&apos;est la
            même application, mais c&apos;est là que tout fonctionne.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-black text-ink">Pourquoi ça vaut le coup</p>
          <ul className="space-y-1.5 text-xs text-ink-soft">
            <Reason>Elle s&apos;ouvre en une touche, en plein écran, sans barre de navigateur.</Reason>
            <Reason>Vous restez connecté : plus de mot de passe à retaper.</Reason>
            <Reason>
              Vous êtes prévenu quand un coach répond à votre annonce.{" "}
              <span className="font-bold text-ink">
                Sur iPhone, c&apos;est la seule façon de recevoir ces alertes.
              </span>
            </Reason>
          </ul>
        </div>

        {offer === "ios-tutorial" && (
          <div className="space-y-2">
            <p className="text-xs font-black text-ink">Pas encore installée ? Trois gestes</p>
            <ol className="space-y-2">
              <Step icon={<Share size={14} aria-hidden />} index={1}>
                Appuyez sur <span className="font-bold text-ink">Partager</span>, l&apos;icône en bas de Safari.
              </Step>
              <Step icon={<SquarePlus size={14} aria-hidden />} index={2}>
                Descendez jusqu&apos;à <span className="font-bold text-ink">Sur l&apos;écran d&apos;accueil</span>.
              </Step>
              <Step icon={<CircleCheck size={14} aria-hidden />} index={3}>
                Appuyez sur <span className="font-bold text-ink">Ajouter</span>. L&apos;icône rejoint vos
                applications.
              </Step>
            </ol>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

function Reason({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden />
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function Step({ index, icon, children }: { index: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-xs text-ink-soft">
      <span
        className="w-6 h-6 rounded-lg bg-accent-surface text-accent flex items-center justify-center shrink-0"
        aria-hidden
      >
        {icon}
      </span>
      <span className="pt-0.5 leading-relaxed">
        <span className="sr-only">Étape {index} : </span>
        {children}
      </span>
    </li>
  );
}
