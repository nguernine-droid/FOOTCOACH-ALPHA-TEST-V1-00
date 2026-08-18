import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { Fillable } from "@/lib/legal";

/**
 * La mise en page commune aux trois documents légaux.
 *
 * Un titre, un sommaire qui colle au défilement sur grand écran, et une colonne
 * de texte. Rien de plus : ces pages se lisent, elles ne se parcourent pas.
 * L'habillage (barre, pied de page, thème sombre) vient du layout du groupe.
 */
export function LegalPage({
  eyebrow,
  title,
  lede,
  updated,
  version,
  toc,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  updated: string;
  version: string;
  /** Les ancres du sommaire, dans l'ordre du document */
  toc: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[1100px] mx-auto px-5 py-14 md:py-20">
      <div className="space-y-4 max-w-[65ch]">
        <p className="section-title text-[12px] text-accent">{eyebrow}</p>
        <h1 className="display text-4xl md:text-5xl leading-[0.95] text-primary">{title}</h1>
        <p className="text-base md:text-lg text-secondary leading-relaxed">{lede}</p>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted pt-2">
          <span>
            <b className="text-secondary">Dernière mise à jour :</b>{" "}{updated}
          </span>
          <span>
            <b className="text-secondary">Version :</b>{" "}{version}
          </span>
        </p>
      </div>

      <div className="mt-14 grid gap-10 min-[900px]:grid-cols-[220px_1fr] min-[900px]:gap-14 items-start">
        <nav
          aria-label="Sommaire"
          className="min-[900px]:sticky min-[900px]:top-24 v-card p-5 min-[900px]:bg-transparent
            min-[900px]:border-0 min-[900px]:shadow-none min-[900px]:p-0"
        >
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">Sommaire</h2>
          <ol className="mt-4 space-y-2.5 text-sm">
            {toc.map((item, i) => (
              <li key={item.id} className="flex gap-2.5">
                <span className="text-muted tabular-nums shrink-0">{i + 1}.</span>
                <a href={`#${item.id}`} className="text-secondary hover:text-accent transition">
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="v-prose min-w-0">{children}</div>
      </div>
    </div>
  );
}

/**
 * Une information légale qui manque encore.
 *
 * Elle s'affiche, et elle se voit : masquer un champ obligatoire derrière une
 * tournure vague donnerait l'illusion d'une page complète. Ici le lecteur sait
 * qu'il manque quelque chose, et l'éditeur aussi.
 */
export function Missing({ children }: { children: string }) {
  return (
    <mark
      className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[0.85em] font-bold align-baseline"
      style={{ backgroundColor: "var(--warning-surface)", color: "var(--warning)" }}
    >
      <AlertTriangle size={11} aria-hidden className="shrink-0" />À compléter — {children}
    </mark>
  );
}

/** Affiche une valeur, ou le marqueur de ce qui manque à sa place. */
export function Value({ of, label }: { of: Fillable; label: string }) {
  return of ? <>{of}</> : <Missing>{label}</Missing>;
}

/**
 * Le bandeau d'avertissement en tête des pages incomplètes. Il vise l'éditeur,
 * pas le visiteur — mais il est visible des deux, ce qui est la seule façon
 * honnête de publier un document légal à trous.
 */
export function IncompleteNotice() {
  return (
    <div
      className="v-card p-5 mb-10 flex items-start gap-3"
      style={{ borderColor: "var(--warning)" }}
    >
      <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: "var(--warning)" }} aria-hidden />
      <p className="text-sm text-secondary leading-relaxed max-w-[65ch]">
        <b className="text-primary">Ce document est incomplet.</b>{" "}Les informations d&apos;identification
        exigées par la loi n&apos;y figurent pas encore : les champs manquants sont signalés dans le texte.
        Cette page est temporairement exclue des moteurs de recherche.{" "}
        <Link href="/" className="text-accent underline underline-offset-4">
          Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  );
}

/** Un tableau qui défile seul plutôt que d'élargir la page */
export function LegalTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="v-table-scroll">
      <table>{children}</table>
    </div>
  );
}

/** L'encadré « en résumé » qui ouvre les CGU et la politique */
export function SummaryBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="v-card p-6" style={{ borderColor: "var(--v-halo-edge)" }}>
      <h2 className="display text-lg text-primary" style={{ marginTop: 0 }}>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </aside>
  );
}

/** L'encadré de contact qui referme chaque document */
export function ContactCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="v-card p-6 mt-12">
      <h2 className="display text-lg text-primary" style={{ marginTop: 0 }}>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </aside>
  );
}
