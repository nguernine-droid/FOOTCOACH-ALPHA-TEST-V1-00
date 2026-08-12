import type { AgendaItemDto } from "@footcoach/shared";

/**
 * Génération du flux iCalendar (RFC 5545) auquel s'abonne le calendrier du
 * téléphone. Format texte simple : pas de dépendance, on écrit les lignes.
 *
 * Les horaires sont émis en heure locale « flottante » (sans TZID ni Z) : les
 * heures de FootCoach sont celles du terrain, saisies et lues en France. Un
 * VTIMEZONE Europe/Paris serait plus rigoureux mais n'apporterait une
 * différence que pour un coach qui consulte son calendrier depuis un autre
 * fuseau — et il ferait 40 lignes de plus à maintenir (règles d'heure d'été).
 */

/** Échappement des valeurs texte : \ ; , et retours à la ligne (RFC 5545 §3.3.11) */
function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Pliage des lignes longues à 75 octets, continuation par espace (RFC 5545 §3.1) */
function fold(line: string): string[] {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return [line];
  const parts: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    // Marge sous 75 pour ne jamais couper au milieu d'un caractère UTF-8
    let end = Math.min(start + (start === 0 ? 74 : 73), bytes.length);
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push((start === 0 ? "" : " ") + bytes.subarray(start, end).toString("utf8"));
    start = end;
  }
  return parts;
}

/** "2026-08-12" + "15:00" → "20260812T150000" (heure locale flottante) */
function toLocalStamp(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

/** Heure de fin : celle de l'item, sinon début + 2 h (durée type d'un match/plateau) */
function endStamp(item: AgendaItemDto): string {
  if (item.endTime) return toLocalStamp(item.occurrenceDate, item.endTime);
  const [h, m] = item.startTime.split(":").map(Number);
  const end = Math.min(h + 2, 23);
  return toLocalStamp(item.occurrenceDate, `${String(end).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
}

export interface CalendarEntry {
  item: AgendaItemDto;
  /** Nom de l'équipe, préfixé au titre quand le coach en encadre plusieurs */
  teamLabel: string | null;
}

export function buildIcsFeed(entries: CalendarEntry[]): string {
  // DTSTAMP identique pour tout le flux : c'est la date de génération, pas une
  // donnée de l'événement, et les calendriers s'en servent peu.
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FootCoach//Agenda//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    // Nom du calendrier tel qu'il apparaît dans l'app du téléphone
    "X-WR-CALNAME:FootCoach",
    "X-WR-CALDESC:Matchs\\, entraînements et tournois de vos équipes FootCoach",
    // Suggestion d'intervalle de relecture (respectée par certains clients)
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  for (const { item, teamLabel } of entries) {
    const title = teamLabel ? `${teamLabel} — ${item.title}` : item.title;
    lines.push(
      "BEGIN:VEVENT",
      // L'id d'item est déjà unique et stable (match-<id>, <event>@<date>…) :
      // le calendrier reconnaît l'événement d'une relecture à l'autre.
      `UID:${escapeText(item.id)}@footcoach.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toLocalStamp(item.occurrenceDate, item.startTime)}`,
      `DTEND:${endStamp(item)}`,
      `SUMMARY:${escapeText(title)}`,
    );
    if (item.location) lines.push(`LOCATION:${escapeText(item.location)}`);
    if (item.description) lines.push(`DESCRIPTION:${escapeText(item.description)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // CRLF imposé par la RFC ; le pliage s'applique ligne par ligne
  return lines.flatMap(fold).join("\r\n") + "\r\n";
}
