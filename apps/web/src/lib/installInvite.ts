/**
 * Quand faut-il se taire ?
 *
 * La fenêtre qui invite à installer l'application est, par nature, une
 * interruption. Ce qui décide de la montrer ou non tient en deux fonctions
 * pures, séparées du composant pour une raison simple : c'est la partie qu'on
 * ne peut pas vérifier à l'œil. Une erreur d'unité ou de signe ici ne se voit
 * pas — elle se traduit par une fenêtre qui revient tous les jours chez
 * quelqu'un qui a dit non, et ce quelqu'un-là ne le signale pas, il s'en va.
 */

export const INSTALL_INVITE_KEY = "footcoach-install-invite";
export const INSTALL_INVITE_SNOOZE_DAYS = 7;

/** Ce que « Plus tard » et « Ne plus me le proposer » écrivent dans le stockage */
export function inviteMemo(choice: "later" | "never", now: number): string {
  return choice === "never" ? "never" : String(now + INSTALL_INVITE_SNOOZE_DAYS * 86_400_000);
}

/**
 * La proposition est-elle rangée ?
 *
 * `raw` est ce que porte le stockage — donc n'importe quoi : une valeur d'une
 * version précédente, une clé écrasée par un autre onglet, ou `null`. En cas de
 * doute on répond « non rangée » et la fenêtre s'affiche : rater une invitation
 * est un moindre mal comparé à ne jamais dire au coach resté dans Safari
 * pourquoi il ne reçoit aucune alerte.
 */
export function isInviteSnoozed(raw: string | null, now: number): boolean {
  if (raw === null || raw === "") return false;
  if (raw === "never") return true;
  const until = Number(raw);
  return Number.isFinite(until) && now < until;
}
