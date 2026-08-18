import Link from "next/link";
import { VitrineNav } from "@/components/public/VitrineNav";

/**
 * La coquille des pages publiques — la seule partie du site qui ne suit PAS le
 * thème du visiteur.
 *
 * ── Pourquoi le sombre est imposé ici ───────────────────────────────────
 * Une page de présentation se regarde une fois, de l'extérieur, souvent après
 * avoir cliqué un lien dans un groupe WhatsApp : elle doit toujours présenter
 * le même visage. L'application, elle, s'ouvre tous les jours au bord d'un
 * terrain et doit suivre le réglage de celui qui s'en sert. Les deux besoins
 * sont contraires, et c'est la vitrine qui cède.
 *
 * L'attribut est posé sur ce conteneur plutôt que sur `<html>` : le script
 * anti-flash de `layout.tsx` reste maître de la racine, les jetons cascadent
 * jusqu'ici sans que rien n'ait à se disputer l'attribut.
 */
export function VitrineShell({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" className="vitrine-root flex flex-col">
      {/* Filet de sécurité des entrées au défilement : sans script, l'état de
          départ (invisible) n'aurait jamais rien pour le lever, et la page
          entière resterait blanche. */}
      <noscript>
        <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
      </noscript>

      <VitrineNav />
      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--v-rim-soft)]">
        <div className="max-w-[1100px] mx-auto px-5 py-10 space-y-4 text-xs text-muted">
          <p className="max-w-[65ch] leading-relaxed">
            TeamNexus met en relation les coachs de football amateur pour organiser des matchs amicaux. Les
            annonces sont publiées par les clubs eux-mêmes.
          </p>
          <p className="max-w-[65ch] leading-relaxed">
            Vos coordonnées ne sont jamais partagées sans votre accord : les autres coachs ne voient que votre
            surnom, votre équipe et votre palier. Vous pouvez consulter, corriger ou supprimer vos données depuis
            les réglages de votre compte.
          </p>
          <p className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            <Link href="/f" className="hover:text-primary transition underline underline-offset-4">
              Annonces par département
            </Link>
            <Link href="/login" className="hover:text-primary transition underline underline-offset-4">
              Se connecter
            </Link>
            <Link href="/register" className="hover:text-primary transition underline underline-offset-4">
              Créer un compte
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
