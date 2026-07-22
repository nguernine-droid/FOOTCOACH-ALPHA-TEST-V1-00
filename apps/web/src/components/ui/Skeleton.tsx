import { cn } from "@/lib/utils";

/** Bloc de chargement animé — à composer en silhouettes d'écran. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-line/70", className)} aria-hidden />;
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
