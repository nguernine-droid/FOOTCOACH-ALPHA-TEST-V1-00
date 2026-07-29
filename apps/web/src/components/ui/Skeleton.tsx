import { cn } from "@/lib/utils";

/**
 * Bloc de chargement — à composer en silhouettes d'écran.
 * Un reflet le traverse plutôt qu'un clignotement d'opacité : le mouvement
 * suggère un chargement en cours là où le clignotement suggère une panne.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-defined", className)} aria-hidden>
      {/* Le reflet est un jeton : un balayage blanc à 60 % passe inaperçu sur
          un fond sombre, et brûle sur un fond clair. */}
      <span className="animate-shimmer shimmer-sheen absolute inset-0" />
    </div>
  );
}

/** Silhouette de grille de cartes (listes de matchs, annonces, effectif…) */
export function CardGridSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start" aria-busy aria-label="Chargement">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex items-center justify-around">
            <Skeleton className="w-12 h-12 rounded-full" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="w-12 h-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
