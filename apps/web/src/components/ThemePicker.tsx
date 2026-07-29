"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { THEME_LABELS, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemeChoice; icon: LucideIcon; hint: string }[] = [
  { value: "system", icon: Monitor, hint: "Suit votre appareil" },
  { value: "light", icon: Sun, hint: "Toujours clair" },
  { value: "dark", icon: Moon, hint: "Toujours sombre" },
];

/**
 * Aperçu du tableau de bord en réduction : en-tête, carte de mise en avant,
 * carte de la carte des matchs, barre d'onglets.
 *
 * Il n'imite pas les couleurs du thème — il les EMPRUNTE. L'attribut
 * `data-theme` posé sur ce bloc réécrit les jetons pour lui seul, exactement
 * comme il le fait sur `<html>`. L'aperçu ne peut donc pas mentir : s'il
 * ressemble à l'écran, c'est qu'il est peint avec la même palette.
 */
function BoardPreview({ theme }: { theme: "light" | "dark" }) {
  return (
    <span
      data-theme={theme}
      aria-hidden
      className="block h-full w-full overflow-hidden"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* En-tête */}
      <span className="block h-2.5 w-full" style={{ background: "var(--header-bg)" }} />
      <span className="block px-1.5 pt-1.5 space-y-1">
        {/* Carte de mise en avant */}
        <span
          className="block h-5 w-full rounded-[3px]"
          style={{
            backgroundImage: "linear-gradient(165deg, var(--spotlight-from), var(--spotlight-to))",
            border: "0.5px solid var(--spotlight-border)",
          }}
        >
          <span
            className="mt-3 mx-auto block h-1.5 w-3/5 rounded-full"
            style={{ backgroundColor: "var(--cta)" }}
          />
        </span>
        {/* Carte de la carte des matchs, avec son point doré au centre */}
        <span
          className="relative flex h-6 w-full items-center justify-center rounded-[3px]"
          style={{ backgroundColor: "var(--card-bg)", border: "0.5px solid var(--card-border)" }}
        >
          <span
            className="block h-3.5 w-3.5 rounded-full"
            style={{ border: "0.5px solid var(--map-ring)" }}
          />
          <span
            className="absolute block h-1 w-1 rounded-full"
            style={{ backgroundColor: "var(--accent-solid)" }}
          />
        </span>
      </span>
      {/* Barre d'onglets */}
      <span
        className="mt-1.5 flex h-2.5 w-full items-center justify-center gap-1"
        style={{ background: "var(--tabbar-bg)", borderTop: "0.5px solid var(--structure-line)" }}
      >
        <span className="block h-1 w-1 rounded-full" style={{ backgroundColor: "var(--accent-solid)" }} />
        <span
          className="block h-1 w-1 rounded-full"
          style={{ backgroundColor: "var(--text-on-structure-dim)" }}
        />
        <span
          className="block h-1 w-1 rounded-full"
          style={{ backgroundColor: "var(--text-on-structure-dim)" }}
        />
      </span>
    </span>
  );
}

/**
 * Réglage de l'apparence : trois choix exclusifs, chacun montrant à quoi
 * ressemblera l'écran. Un `radiogroup` plutôt qu'une liste de boutons — les
 * flèches du clavier parcourent les options, et un lecteur d'écran annonce
 * « 2 sur 3 » sans qu'on ait à l'écrire.
 */
export function ThemePicker() {
  const { choice, resolved, setChoice } = useTheme();

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Apparence de l'application"
        className="grid grid-cols-3 gap-2"
      >
        {OPTIONS.map((option) => {
          const active = choice === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setChoice(option.value)}
              className={cn(
                "group flex flex-col items-center gap-2 rounded-btn border p-2 transition",
                "focus-visible:!outline-accent active:scale-[0.97]",
                active
                  ? "border-accent-solid bg-accent-surface"
                  : "border-subtle bg-glass hover:border-defined",
              )}
            >
              {/* Aperçu. « Système » en montre deux moitiés : c'est bien ce que
                  fait ce réglage — l'un ou l'autre, selon l'appareil. */}
              <span
                className={cn(
                  "flex h-14 w-full overflow-hidden rounded-[6px] border",
                  active ? "border-accent-solid" : "border-subtle",
                )}
              >
                {option.value === "system" ? (
                  <>
                    <span className="w-1/2">
                      <BoardPreview theme="light" />
                    </span>
                    <span className="w-1/2">
                      <BoardPreview theme="dark" />
                    </span>
                  </>
                ) : (
                  <span className="w-full">
                    <BoardPreview theme={option.value} />
                  </span>
                )}
              </span>

              <span
                className={cn(
                  "flex items-center gap-1.5 text-xs font-bold",
                  active ? "text-accent" : "text-secondary",
                )}
              >
                <option.icon size={13} aria-hidden />
                {THEME_LABELS[option.value]}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-muted">
        {choice === "system"
          ? `Réglé sur votre appareil — actuellement ${resolved === "dark" ? "sombre" : "clair"}.`
          : OPTIONS.find((o) => o.value === choice)?.hint}
      </p>
    </div>
  );
}
