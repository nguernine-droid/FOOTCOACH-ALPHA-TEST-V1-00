import { CalendarDays, MapPin, Send, Users } from "lucide-react";

/**
 * Un aperçu de l'application, dessiné plutôt que photographié.
 *
 * ── Pourquoi pas une capture d'écran ────────────────────────────────────
 * Une image figée se périme au premier changement de couleur ou de libellé, et
 * personne ne s'en aperçoit — la vitrine finit par montrer une application qui
 * n'existe plus. Dessiné en HTML, l'aperçu utilise les MÊMES jetons de couleur
 * que l'application : il suit le thème clair ou sombre du visiteur, et il vieillit
 * avec le produit au lieu de vieillir contre lui.
 *
 * Il pèse aussi zéro octet de plus à télécharger, ce qui compte sur une page
 * d'accueil ouverte au bord d'un terrain, en 4G.
 *
 * ── Ce qu'il montre ─────────────────────────────────────────────────────
 * L'écran des disponibilités, parce que c'est ce que le produit fait de
 * différent : des équipes libres le même jour, proposées sans qu'on ait rien
 * cherché. Les données sont fictives et le disent — aucun vrai club n'apparaît
 * sur une page publique.
 */
export function AppPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]" aria-hidden>
      {/* Le cadre du téléphone : une bordure épaisse et un grand rayon suffisent
          à dire « ceci est un écran » sans dessiner un appareil reconnaissable. */}
      <div className="rounded-[2rem] border-8 border-structure-1 bg-surface-1 overflow-hidden shadow-pop">
        <div className="bg-structure-1 text-on-structure px-4 pt-3 pb-4">
          <p className="display text-sm">
            TEAM<span className="text-accent">NEXUS</span>
          </p>
        </div>

        <div className="p-3 space-y-2.5 bg-surface-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
            Équipes libres en face
          </p>

          <PreviewCard
            team="AS Voisine U13"
            city="Villeurbanne"
            distance="7 km"
            date="dimanche 12 octobre"
            host="Chez nous"
          />
          <PreviewCard
            team="FC Rivière U13"
            city="Décines"
            distance="12 km"
            date="dimanche 12 octobre"
            host="Chez eux"
          />

          <div className="rounded-lg bg-blue text-white px-3 py-2.5 flex items-center justify-center gap-1.5">
            <Send size={12} />
            <span className="text-[11px] font-bold">Prévenir cette équipe</span>
          </div>
        </div>

        {/* La barre basse : elle situe l'aperçu dans une application, pas dans
            une page web. */}
        <div className="bg-structure-1 text-on-structure flex items-center justify-around px-2 py-2.5">
          {[Users, CalendarDays, MapPin].map((Icon, i) => (
            <span key={i} className={i === 0 ? "text-accent" : "text-white/40"}>
              <Icon size={14} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewCard({
  team,
  city,
  distance,
  date,
  host,
}: {
  team: string;
  city: string;
  distance: string;
  date: string;
  host: string;
}) {
  return (
    <div className="card p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold truncate">{team}</span>
        <span className="chip bg-success-soft text-success text-[9px] shrink-0">{distance}</span>
      </div>
      <p className="text-[10px] text-ink-soft truncate">
        {city} · {date}
      </p>
      <div className="flex flex-wrap gap-1">
        <span className="chip bg-pitch-soft text-primary text-[9px]">U12-U13</span>
        <span className="chip bg-paper text-ink-soft text-[9px]">{host}</span>
      </div>
    </div>
  );
}
