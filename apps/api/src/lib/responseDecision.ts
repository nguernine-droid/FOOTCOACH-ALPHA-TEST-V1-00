/**
 * ————— Qui doit encore signer, et peut-il seulement le faire ? —————
 *
 * Un match naît de DEUX signatures, une par coach, dans n'importe quel ordre.
 * Savoir de quel côté du fil on se trouve, si ma signature manque, et si elle
 * est encore recevable, se décidait jusqu'ici à l'intérieur de la route qui
 * sert un fil de discussion. C'était une place trop étroite : la même question
 * se pose désormais dans la liste des conversations et sur le tableau de bord
 * du coach, et une règle recopiée trois fois diverge à la première correction.
 *
 * Elle a d'ailleurs déjà divergé. `decidable` ne regardait pas la date du
 * match, là où `POST /announcements/:id/responses/:rid/accept` la refuse : sur
 * une annonce encore ouverte mais dont la date était passée, le bouton
 * « Valider le match » s'affichait et échouait à chaque appui. D'où
 * `blockedReason`, qui nomme les deux refus du serveur au lieu de les laisser
 * découvrir par l'erreur.
 */

export type DecisionSide = "owner" | "responder" | null;

export interface DecisionInput {
  /** Mon équipe active — `null` si je n'en encadre aucune */
  myTeamId: string | null;
  announcementTeamId: string;
  announcementStatus: string;
  /** Date du match, YYYY-MM-DD */
  announcementDate: string;
  responseTeamId: string;
  responseStatus: string;
  ownerConfirmedAt: Date | null;
  responderConfirmedAt: Date | null;
  /** Aujourd'hui, YYYY-MM-DD — injecté pour que la règle soit éprouvable */
  today: string;
}

export interface DecisionState {
  /** De quel côté du fil je me trouve ; `null` si la proposition ne me concerne pas */
  side: DecisionSide;
  /** J'ai donné mon accord */
  iConfirmed: boolean;
  /** L'autre coach a donné le sien */
  otherConfirmed: boolean;
  /** Je peux valider ici et maintenant */
  decidable: boolean;
  /** Ce qui empêche toute validation, de mon côté comme de l'autre */
  blockedReason: "closed" | "expired" | null;
}

export function decisionState(input: DecisionInput): DecisionState {
  const isOwner = input.myTeamId !== null && input.announcementTeamId === input.myTeamId;
  const isResponder = input.myTeamId !== null && input.responseTeamId === input.myTeamId;
  const side: DecisionSide = isOwner ? "owner" : isResponder ? "responder" : null;

  const iConfirmed =
    side === "owner"
      ? input.ownerConfirmedAt !== null
      : side === "responder"
        ? input.responderConfirmedAt !== null
        : false;
  const otherConfirmed =
    side === "owner"
      ? input.responderConfirmedAt !== null
      : side === "responder"
        ? input.ownerConfirmedAt !== null
        : false;

  /**
   * Les deux refus du serveur, dans son ordre à lui : l'annonce d'abord, la
   * date ensuite. Ils ne valent que tant que la proposition est en attente —
   * une proposition déjà acceptée ou déclinée n'est pas « bloquée », elle est
   * tranchée, et le dire autrement inquiéterait pour rien.
   */
  let blockedReason: "closed" | "expired" | null = null;
  if (input.responseStatus === "pending") {
    if (input.announcementStatus !== "open") blockedReason = "closed";
    else if (input.announcementDate < input.today) blockedReason = "expired";
  }

  return {
    side,
    iConfirmed,
    otherConfirmed,
    decidable:
      side !== null && !iConfirmed && input.responseStatus === "pending" && blockedReason === null,
    blockedReason,
  };
}

/** Aujourd'hui au format des colonnes `date`, dans le fuseau du serveur */
export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}
