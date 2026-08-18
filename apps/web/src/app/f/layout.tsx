import { VitrineShell } from "@/components/public/VitrineShell";

/**
 * L'habillage des pages publiques d'annonces.
 *
 * Volontairement à part de l'espace coach : pas de barre d'onglets, pas de
 * garde de rôle, pas d'équipe active. Un visiteur qui arrive d'un moteur de
 * recherche n'a rien à quoi se rattacher — lui montrer la coquille d'une
 * application dans laquelle il n'est pas connecté serait le perdre au premier
 * écran.
 *
 * La coquille est la MÊME que celle de la page d'accueil (`VitrineShell`) :
 * même barre, même pied de page, même thème sombre imposé. Un visiteur qui
 * suit un lien d'annonce partagé dans un groupe WhatsApp puis remonte vers
 * l'accueil doit rester chez le même service.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <VitrineShell>
      <div className="max-w-[1100px] mx-auto px-5 py-10 md:py-14">{children}</div>
    </VitrineShell>
  );
}
