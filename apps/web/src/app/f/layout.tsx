import Link from "next/link";

/**
 * L'habillage des pages publiques.
 *
 * Volontairement à part de l'espace coach : pas de barre d'onglets, pas de
 * garde de rôle, pas d'équipe active. Un visiteur qui arrive d'un moteur de
 * recherche n'a rien à quoi se rattacher — lui montrer la coquille d'une
 * application dans laquelle il n'est pas connecté serait le perdre au premier
 * écran.
 *
 * Deux liens seulement : lire (ce qu'il fait déjà) et créer un compte, qui est
 * la seule chose qu'on lui demande.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-line">
        <div className="max-w-[900px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/f" className="display text-xl text-primary">
            TEAM<span className="text-pitch">NEXUS</span>
          </Link>
          <Link
            href="/register"
            className="btn btn-primary inline-flex items-center justify-center gap-2 font-bold rounded-lg
              px-5 py-2.5 text-sm min-h-11 min-[960px]:min-h-0"
          >
            Créer un compte
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-line">
        <div className="max-w-[900px] mx-auto px-4 py-6 space-y-2 text-xs text-ink-soft">
          <p>
            TeamNexus met en relation les coachs de football amateur pour organiser des matchs amicaux. Les annonces
            de cette page sont publiées par les clubs eux-mêmes.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/f" className="underline">
              Tous les départements
            </Link>
            <Link href="/login" className="underline">
              Se connecter
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
