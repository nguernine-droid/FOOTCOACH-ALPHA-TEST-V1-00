"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { VButtonLink } from "@/components/public/primitives";

/**
 * La barre de navigation des pages publiques.
 *
 * Elle ne se pose sur son verre qu'une fois le haut de page dépassé. Le
 * déclencheur est une sentinelle d'un pixel placée au-dessus d'elle, surveillée
 * par un `IntersectionObserver` — et non un écouteur de défilement, qui
 * réveillerait le fil principal à chaque pixel parcouru pour une information
 * booléenne qui change deux fois par visite.
 */
export function VitrineNav() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />
      {/* `pt-[env(safe-area-inset-top)]` n'est pas une précaution : le document
          déclare `viewport-fit=cover` et l'application installée demande une
          barre d'état TRANSLUCIDE (`black-translucent` dans `layout.tsx`). Sur
          un iPhone, le contenu passe donc SOUS l'heure, le wifi et la batterie.
          Sans ce retrait, la première ligne de la vitrine est illisible — c'est
          exactement pour cette raison que l'en-tête de l'espace coach le porte
          déjà (`RoleGuard`). Vaut zéro partout où il n'y a rien à contourner. */}
      <header className={cn("v-nav pt-[env(safe-area-inset-top)]", stuck && "v-nav-stuck")}>
        {/* Les trois éléments tiennent sur UNE ligne à 320 px : d'où les tailles
            resserrées sur petit écran et le `whitespace-nowrap`. Sans eux, « Se
            connecter » et « Créer un compte » se coupent chacun en deux et la
            barre double de hauteur — le premier écran d'un visiteur venu d'un
            lien partagé. */}
        <div className="max-w-[1100px] mx-auto px-4 min-[420px]:px-5 h-16 flex items-center justify-between gap-2 min-[420px]:gap-4">
          <Link href="/" className="display text-lg min-[420px]:text-xl text-primary shrink-0">
            TEAM<span className="text-accent">NEXUS</span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Accès au compte">
            {/* Sous 400 px, les trois éléments ne tiennent plus : c'est « Se
                connecter » qui cède, pas l'inscription. Un visiteur qui a déjà
                un compte trouve le lien dans le pied de page et sur l'écran
                d'inscription ; celui qui n'en a pas n'a que ce bouton, et un
                bouton tronqué ne s'appuie pas. */}
            <Link
              href="/login"
              className="hidden min-[400px]:flex text-[13px] min-[420px]:text-sm font-bold text-secondary
                hover:text-primary px-2 min-[420px]:px-3 py-2 min-h-11 items-center transition whitespace-nowrap"
            >
              Se connecter
            </Link>
            {/* `cn` fusionne par tailwind-merge : ces classes arrivent après
                celles de la taille et l'emportent, sans marqueur d'importance. */}
            <VButtonLink
              href="/register"
              className="px-4 min-[420px]:px-5 text-[13px] min-[420px]:text-sm whitespace-nowrap"
            >
              Créer un compte
            </VButtonLink>
          </nav>
        </div>
      </header>
    </>
  );
}
