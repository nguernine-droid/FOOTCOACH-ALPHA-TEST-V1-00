import type { Metadata } from "next";
import Link from "next/link";
import { VitrineShell } from "@/components/public/VitrineShell";
import { Shell, VButtonLink } from "@/components/public/primitives";

/**
 * Le titre reste utile même si aucun moteur ne l'indexera : c'est ce que lit
 * un visiteur dans son onglet et dans son historique, là où « TeamNexus —
 * trouvez un adversaire » lui promettrait le contraire de ce qu'il voit.
 */
export const metadata: Metadata = {
  title: "Page introuvable",
  // Pas de `robots` ici : Next pose déjà `noindex` sur cette page, et deux
  // balises `robots` dans le même `<head>` se lisent moins bien qu'une.
};

/**
 * La page des adresses qui n'existent pas.
 *
 * ── Pourquoi elle vaut la peine ──────────────────────────────────────────
 * Une annonce se termine, et son URL avec elle. Un lien collé dans un groupe
 * WhatsApp survit, lui, des mois : la page qu'on atteint en le suivant tombera
 * donc régulièrement dans le vide, et jusqu'ici elle affichait l'écran par
 * défaut de Next — noir sur blanc, en anglais, sans un seul lien. Un visiteur
 * qui découvre le service par là repart aussitôt, et un robot qui n'y trouve
 * aucun lien s'arrête net.
 *
 * Le statut HTTP reste 404 : c'est lui qui dit au moteur de retirer l'adresse
 * de son index, et aucune métadonnée n'a besoin de le répéter. Ce qui change
 * est ce qu'on met dedans — quatre chemins pour retomber sur ses pieds.
 */
export default function NotFound() {
  return (
    <VitrineShell>
      <Shell className="py-24 md:py-32">
        <div className="max-w-[60ch] space-y-6">
          <p className="section-title text-[12px] text-accent">Erreur 404</p>
          <h1 className="display text-4xl md:text-5xl leading-[0.95] text-primary">
            Cette page n&apos;existe pas — ou n&apos;existe plus
          </h1>
          <p className="text-sm md:text-base text-secondary leading-relaxed">
            Les annonces ne restent pas affichées une fois la date passée ou l&apos;adversaire trouvé. Si
            vous suivez un lien partagé il y a quelque temps, c&apos;est probablement ce qui s&apos;est
            passé — le match a été convenu.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <VButtonLink href="/f">Voir les annonces en cours</VButtonLink>
            <Link
              href="/"
              className="inline-flex items-center min-h-11 px-5 text-sm font-bold text-secondary
                hover:text-primary transition underline underline-offset-4"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
          <p className="text-xs text-muted pt-2">
            Vous encadrez une équipe ?{" "}
            <Link href="/register" className="underline underline-offset-4 hover:text-primary transition">
              Créez un compte coach
            </Link>{" "}
            —{" "}
            <Link href="/login" className="underline underline-offset-4 hover:text-primary transition">
              ou connectez-vous
            </Link>
            .
          </p>
        </div>
      </Shell>
    </VitrineShell>
  );
}
