/**
 * Simulation d'usage : cent coachs, une semaine, à travers la VRAIE API HTTP.
 *
 * Elle cherche deux choses que les tests unitaires ne voient pas : les bugs qui
 * n'apparaissent qu'en volume (5xx, courses entre deux coachs, états
 * incohérents) et ce que l'interface reçoit réellement à densité réelle
 * (poids des réponses, nombre de cartes, longueur des listes).
 *
 * ⚠️ Elle ÉCRIT dans la base visée : cent comptes, leurs équipes, leurs
 * annonces et leurs matchs. À réserver à un environnement de développement, et
 * à nettoyer ensuite avec `cleanup.sql` (voir le README).
 *
 * Usage : node tools/simulation/simulate.mjs
 * Réglages : FOOTCOACH_API, FOOTCOACH_SIM_COACHES, FOOTCOACH_SIM_DAYS
 */

const API = process.env.FOOTCOACH_API ?? "http://localhost:3002/api";
const COACHES = Number(process.env.FOOTCOACH_SIM_COACHES ?? 100);
const DAYS = Number(process.env.FOOTCOACH_SIM_DAYS ?? 7);
// Comptes jetables : le domaine .local et le préfixe sim les rendent
// reconnaissables d'un coup d'œil, et c'est sur eux que porte le nettoyage.
const PASSWORD = "Simul1234!";
const EMAIL_DOMAIN = "simul.local";

// PRNG déterministe : une anomalie doit être rejouable à l'identique.
let seed = 20260728;
function rnd() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (min, max) => min + Math.floor(rnd() * (max - min + 1));
const chance = (p) => rnd() < p;

const CITIES = ["paris","marseille","lyon","toulouse","nice","nantes","montpellier","strasbourg","bordeaux","lille",
  "rennes","reims","saint-etienne","toulon","le havre","grenoble","dijon","angers","nimes","villeurbanne",
  "clermont-ferrand","le mans","aix-en-provence","brest","tours","amiens","limoges","annecy","perpignan","besancon",
  "metz","orleans","rouen","mulhouse","caen","nancy"];
// Concentration réaliste : la moitié des clubs dans cinq bassins, sinon le
// radar ne verrait jamais deux équipes à portée l'une de l'autre.
const HOTSPOTS = ["lyon","villeurbanne","saint-etienne","grenoble","annecy"];
const PREFIX = ["AS","FC","US","ES","Olympique","Racing","Stade","Entente","CS","SC","Union"];
// Liste FFF complète, valeurs sans accent comme en base
const CATEGORIES = ["U6","U7","U8","U9","U10","U11","U12","U13","U14","U15","U16","U17","U18","U19","U20","Seniors","Veterans"];
const GENDERS = ["masculin","feminin","mixte"];
const FORMATS = ["5v5","8v8","11v11"];
const LEVELS = ["loisir","competition"];
const REASONS = ["blessure","meteo","terrain","personnel"];
const LONG_COMMENT =
  "Vestiaires disponibles 45 minutes avant le coup d'envoi, prévoir les deux jeux de maillots car nos couleurs sont proches. " +
  "Parking gratuit derrière la tribune, entrée par la rue des Sports. Buvette tenue par les parents, restauration sur place. " +
  "Merci de confirmer le nombre d'accompagnateurs la veille pour l'organisation du goûter d'après-match.";

const iso = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

// ---------- Client HTTP instrumenté ----------
const timings = new Map();
const anomalies = [];
const rejets = new Map();
let requests = 0;

function record(route, ms) {
  const list = timings.get(route) ?? [];
  list.push(ms);
  timings.set(route, list);
}

/**
 * `expect` : codes considérés comme normaux (règles métier, races). Le reste
 * est une anomalie. `teamId` envoie l'équipe active, comme le client web.
 */
async function call(coach, method, path, body, expect = [200, 201], teamId) {
  const route = `${method} ${path.replace(/\/[0-9a-f-]{36}/g, "/:id").split("?")[0]}`;
  const started = Date.now();
  let res, text;
  try {
    res = await fetch(API + path, {
      method,
      headers: {
        // Comme le client web : l'en-tête JSON seulement s'il y a un corps.
        // Fastify refuse en 400 un content-type JSON sur un corps vide.
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(coach ? { Authorization: `Bearer ${coach.token}` } : {}),
        ...(teamId ? { "X-Team-Id": teamId } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    text = await res.text();
  } catch (err) {
    anomalies.push({ kind: "réseau", route, error: String(err) });
    return { ok: false, status: 0, data: null };
  }
  requests++;
  record(route, Date.now() - started);

  // Jeton expiré au fil de la simulation : on le renouvelle et on rejoue
  if (res.status === 401 && coach?.refresh) {
    const r = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: coach.refresh }),
    });
    if (r.ok) {
      const fresh = await r.json();
      coach.token = fresh.accessToken;
      coach.refresh = fresh.refreshToken;
      return call(coach, method, path, body, expect);
    }
  }

  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* réponse non JSON */ }

  if (res.status >= 500) {
    anomalies.push({ kind: "erreur serveur", route, status: res.status, body: text.slice(0, 300) });
  } else if (!expect.includes(res.status)) {
    anomalies.push({ kind: "code inattendu", route, status: res.status, body: text.slice(0, 200) });
  }
  // Même « attendus », les refus sont comptés par motif : un premier essai a
  // échoué en silence parce que 400 était toléré sans qu'on lise le message.
  if (res.status >= 400) {
    const key = `${route} · ${data?.error ?? data?.message ?? res.status}`;
    rejets.set(key, (rejets.get(key) ?? 0) + 1);
  }
  return { ok: res.ok, status: res.status, data };
}

/** Exécution en parallèle bornée : on simule des coachs simultanés sans noyer l'API. */
async function pool(items, size, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

// ---------- Phase 1 : inscriptions ----------
const coaches = [];
async function register(i) {
  const city = chance(0.5) ? pick(HOTSPOTS) : pick(CITIES);
  // Un nom très long tous les dix clubs : de quoi éprouver les troncatures
  const name = chance(0.1)
    ? `Entente Sportive et Culturelle de ${city} et des Communes Voisines`.slice(0, 60)
    : `${pick(PREFIX)} ${city.charAt(0).toUpperCase() + city.slice(1)}`;
  const res = await call(null, "POST", "/auth/register-coach", {
    firstName: pick(["Alex","Bruno","Camille","David","Élodie","Farid","Gaëlle","Hugo","Inès","Julien","Karim","Léa"]),
    lastName: pick(["Martin","Bernard","Dubois","Thomas","Robert","Petit","Durand","Leroy","Moreau","Simon"]),
    email: `sim${i}@${EMAIL_DOMAIN}`,
    password: PASSWORD,
    teamName: name,
    teamCity: city,
    // Références de l'équipe : obligatoire pour la catégorie, un club sur cinq
    // sans stade attitré — de quoi éprouver le préremplissage ET son absence.
    teamCategory: pick(CATEGORIES),
    teamStadium: chance(0.8) ? `Stade ${pick(["Municipal","des Sports","Jean Jaurès","du Parc","de la Plaine"])}` : undefined,
    // Exigées par l'API depuis que l'inscription demande les deux acceptations :
    // sans elles, chaque inscription simulée repartait en 400 et la simulation
    // ne jouait plus rien du tout.
    acceptTerms: true,
    acceptResponsibility: true,
  }, [200, 201]);
  if (!res.data?.accessToken) return null;
  return {
    i, city, name,
    token: res.data.accessToken,
    refresh: res.data.refreshToken,
    teamId: res.data.user.teamId,
    teams: [res.data.user.teamId],
    announcements: [],
    matches: [],
  };
}

// ---------- Phase 2 : une semaine d'usage ----------
const stats = {
  equipesCreees: 0,
  annonces: 0, propositions: 0, retraits: 0, acceptations: 0, refus: 0,
  desistementsInvite: 0, desistementsHote: 0, annulations: 0,
  matchsJoues: 0, sosGeneres: 0, jokers: 0,
  // Rencontres validées au QR, points distribués, et celles qui n'ont rien
  // rapporté parce que les deux équipes s'étaient déjà croisées ce mois-ci.
  rencontresValidees: 0, pointsDistribues: 0, rencontresPlafonnees: 0,
};

/** Un coach sur cinq encadre une seconde équipe (les U13 et les U15) */
async function createSecondTeam(coach) {
  const res = await call(coach, "POST", "/coach/teams", {
    name: `${coach.name} B`.slice(0, 60),
    city: coach.city,
    category: pick(CATEGORIES),
    stadium: `Stade ${pick(["Municipal","des Sports","Jean Jaurès","du Parc","de la Plaine"])}`,
  }, [200, 201, 400]);
  if (res.data?.id) {
    coach.teams.push(res.data.id);
    stats.equipesCreees++;
  }
}

async function publish(coach) {
  // Trois familles d'annonces :
  // - à venir (le cas courant) ;
  // - aujourd'hui à une heure déjà passée : le match se crée puis devient
  //   immédiatement « score à saisir », seul moyen d'éprouver le cycle du QR ;
  // - franchement périmée : elle ne doit plus atteindre le radar.
  const kind = rnd();
  const passee = kind < 0.12;
  const aujourdhui = !passee && kind < 0.32;
  const date = passee ? iso(-int(1, 6)) : aujourdhui ? iso(0) : iso(int(2, 25));
  const res = await call(coach, "POST", "/announcements", {
    date,
    time: aujourdhui ? "07:00" : `${String(int(9, 20)).padStart(2, "0")}:${pick(["00","15","30","45"])}`,
    city: chance(0.85) ? coach.city : pick(CITIES),
    stadium: chance(0.15) ? "Complexe sportif intercommunal Jean-Baptiste Delaunay — terrain n°3" : `Stade ${pick(["Municipal","des Sports","Jean Jaurès","du Parc","de la Plaine"])}`,
    category: pick(CATEGORIES),
    // Genre obligatoire depuis l'ajout du champ : féminines et mixtes largement
    // représentées, pour éprouver le filtre autant que la valeur dominante.
    gender: chance(0.6) ? "masculin" : pick(GENDERS),
    level: pick(LEVELS),
    format: pick(FORMATS),
    comment: chance(0.2) ? LONG_COMMENT : chance(0.4) ? "Prévoir les deux jeux de maillots." : undefined,
    // Le coach multi-équipes publie tantôt pour l'une, tantôt pour l'autre
  }, [200, 201], coach.teams.length > 1 ? pick(coach.teams) : undefined);
  if (res.data?.id) {
    coach.announcements.push(res.data.id);
    stats.annonces++;
  }
}

async function browseAndRespond(coach) {
  const res = await call(coach, "GET", "/announcements/radar");
  const open = (res.data?.items ?? []).filter((a) => !a.isMine && a.myResponseStatus === null);
  if (open.length === 0) return;
  // Le coach répond à une ou deux annonces qu'il voit passer
  for (const a of [pick(open), chance(0.35) ? pick(open) : null].filter(Boolean)) {
    // 400 attendu : annonce matchée entre-temps, ou proposition déjà envoyée
    const r = await call(coach, "POST", `/announcements/${a.id}/respond`, null, [200, 201, 400]);
    if (r.status < 300) stats.propositions++;
    // Se raviser avant que le coach n'ait tranché
    if (r.status < 300 && chance(0.12)) {
      const w = await call(coach, "DELETE", `/announcements/${a.id}/respond`, null, [200, 400, 404]);
      if (w.status === 200) stats.retraits++;
    }
  }
}

async function handleMyAnnouncements(coach) {
  const res = await call(coach, "GET", "/announcements/mine");
  const mine = res.data ?? [];
  for (const a of mine) {
    const pending = a.responses.filter((r) => r.status === "pending");
    if (a.status === "open" && pending.length > 0) {
      // Décliner quelques propositions, en accepter une
      for (const p of pending.slice(1)) {
        if (chance(0.25)) {
          const d = await call(coach, "POST", `/announcements/${a.id}/responses/${p.id}/decline`, null, [200, 400, 404]);
          if (d.status === 200) stats.refus++;
        }
      }
      if (chance(0.6)) {
        const acc = await call(coach, "POST", `/announcements/${a.id}/responses/${pending[0].id}/accept`, null, [200, 201, 400, 404]);
        if (acc.data?.matchId) { coach.matches.push(acc.data.matchId); stats.acceptations++; }
      }
    } else if (a.status === "open" && chance(0.04)) {
      const c = await call(coach, "DELETE", `/announcements/${a.id}`, null, [200, 400]);
      if (c.status === 200) stats.annulations++;
    }
  }
}

async function playOrWithdraw(coach) {
  const res = await call(coach, "GET", "/matches");
  for (const m of res.data ?? []) {
    if (m.status === "cancelled" || m.status === "finished") continue;

    // Désistement : un match à venir sur dix tombe
    if (m.status === "scheduled" && !m.finalScoreDue && chance(0.1)) {
      const w = await call(coach, "POST", `/matches/${m.id}/withdraw`, {
        reason: pick(REASONS),
        details: chance(0.5) ? "Trois joueurs blessés et deux suspendus, impossible d'aligner une équipe." : undefined,
      }, [200, 400]);
      if (w.status === 200) {
        if (w.data?.announcementReopened) { stats.desistementsInvite++; stats.sosGeneres++; }
        else stats.desistementsHote++;
      }
      continue;
    }

    /**
     * Le jour du match : les deux coachs valident leur rencontre au stade —
     * l'hôte affiche son QR, le visiteur le scanne — puis le score se saisit.
     *
     * Le sens est imposé par l'API, la simulation le respecte : c'est le coach
     * de l'équipe DOMICILE qui affiche, celui de l'EXTÉRIEUR qui scanne.
     */
    if (m.encounterOpen && !m.encounterConfirmedAt && chance(0.75)) {
      const host = coaches.find((c) => c.teams.includes(m.homeTeam.id));
      const visitor = coaches.find((c) => c.teams.includes(m.awayTeam.id));
      if (host && visitor) {
        const qr = await call(host, "POST", `/matches/${m.id}/encounter-qr`, null, [200, 400, 403], m.homeTeam.id);
        if (qr.data?.token) {
          const ok = await call(
            visitor, "POST", `/matches/${m.id}/confirm-encounter`,
            { token: qr.data.token }, [200, 400, 403], m.awayTeam.id,
          );
          if (ok.status === 200) {
            stats.rencontresValidees++;
            stats.pointsDistribues += ok.data?.pointsAwarded ?? 0;
            if (ok.data?.cappedByCooldown) stats.rencontresPlafonnees++;
          }
        }
      }
    }

    // Le score clôt le match, saisi par l'un ou l'autre — plus de contre-signature
    if (m.finalScoreDue && chance(0.7)) {
      if (m.status === "scheduled") await call(coach, "POST", `/matches/${m.id}/kickoff`, null, [200, 400]);
      const fs = await call(coach, "POST", `/matches/${m.id}/final-score`, {
        homeScore: int(0, 5), awayScore: int(0, 4),
      }, [200, 400]);
      if (fs.status === 200) stats.matchsJoues++;
    }
  }
}

// ---------- Mesures pour l'interface ----------
async function measure() {
  // Un coach sur dix : assez pour voir la dispersion entre un coach isolé et
  // un coach d'un bassin dense, sans rejouer tous les appels.
  const sample = coaches.filter((_, i) => i % 10 === 0);
  const out = { parCoach: [] };

  // Deux appels distincts depuis le partage de la route fourre-tout : le
  // tableau de bord ne charge plus que ses propres annonces, le radar que ce
  // qu'il affiche. On pèse les deux.
  const octets = async (coach, path) => {
    const t0 = Date.now();
    const res = await fetch(API + path, { headers: { Authorization: `Bearer ${coach.token}` } });
    const raw = await res.text();
    return { ko: Math.round(raw.length / 102.4) / 10, ms: Date.now() - t0, data: JSON.parse(raw) };
  };

  for (const coach of sample) {
    const mine = await octets(coach, "/announcements/mine");
    const radar = await octets(coach, "/announcements/radar");
    const act = await (await fetch(`${API}/activity`, { headers: { Authorization: `Bearer ${coach.token}` } })).json();
    const mat = await (await fetch(`${API}/matches`, { headers: { Authorization: `Bearer ${coach.token}` } })).json();

    out.parCoach.push({
      coach: coach.name,
      ville: coach.city,
      payloadMesAnnoncesKo: mine.ko,
      payloadRadarKo: radar.ko,
      payloadTotalTableauDeBordKo: Math.round((mine.ko + radar.ko) * 10) / 10,
      latenceMesAnnoncesMs: mine.ms,
      latenceRadarMs: radar.ms,
      mesAnnonces: mine.data.length,
      radarCartes: radar.data.items.length,
      radarHorsPerimetre: radar.data.beyondRadius,
      radarSos: radar.data.items.filter((a) => a.isSos).length,
      radarVilleInconnue: radar.data.items.filter((a) => a.distanceKm === null).length,
      filActivite: act.length,
      mesMatchs: mat.length,
    });
  }
  return out;
}

// ---------- Déroulé ----------
console.log(`Inscription de ${COACHES} coachs…`);
const created = await pool([...Array(COACHES).keys()], 8, register);
coaches.push(...created.filter(Boolean));
console.log(`  ${coaches.length} comptes créés`);

// Casquettes : un coach sur quatre se déclare joker, un sur dix contributeur.
// Proportion volontairement basse — c'est justement ce qui met à l'épreuve le
// ciblage des SOS, qui ne réveille plus que les jokers du secteur.
await pool(coaches, 8, async (coach) => {
  const categories = [];
  if (chance(0.25)) categories.push("joker");
  if (chance(0.1)) categories.push("contributeur");
  if (categories.length === 0) return;
  await call(coach, "PATCH", "/me/categories", { categories }, [200]);
  if (categories.includes("joker")) stats.jokers++;
});
console.log(`  ${stats.jokers} jokers déclarés`);

for (let day = 0; day < DAYS; day++) {
  const t0 = Date.now();
  // Deuxième jour : un coach sur cinq déclare la seconde équipe qu'il encadre
  if (day === 1) await pool(coaches.filter(() => chance(0.2)), 8, createSecondTeam);
  // Journée type : un tiers publie, tout le monde consulte, les émetteurs tranchent
  const publishers = coaches.filter(() => chance(0.28));
  await pool(publishers, 8, publish);
  await pool(coaches, 8, browseAndRespond);
  await pool(coaches, 8, handleMyAnnouncements);
  await pool(coaches, 8, playOrWithdraw);
  console.log(`  jour ${day + 1}/${DAYS} — ${Math.round((Date.now() - t0) / 1000)} s`);
}

console.log("\nMesures interface…");
const ui = await measure();

// --- Contrôles de non-régression sur les correctifs du jour ---
console.log("Contrôles…");
const today = new Date().toISOString().slice(0, 10);
const controles = { annoncesPerimeesSurLeRadar: 0, pointsSuperposesMax: 0, clubExpose: 0, affiliationOuverte: 0 };
for (const coach of coaches.slice(0, 40)) {
  const radar = (await call(coach, "GET", "/announcements/radar")).data?.items ?? [];
  controles.annoncesPerimeesSurLeRadar += radar.filter((a) => a.date < today).length;

  // Points du radar : combien d'annonces tomberaient au même endroit
  const rayon = 50;
  const groupes = new Map();
  for (const a of radar) {
    if (a.isMine || a.distanceKm === null || a.bearingDeg === null || a.distanceKm > rayon) continue;
    const k = `${Math.max(0.08, a.distanceKm / rayon).toFixed(4)}|${a.bearingDeg.toFixed(1)}`;
    groupes.set(k, (groupes.get(k) ?? 0) + 1);
  }
  controles.pointsSuperposesMax = Math.max(controles.pointsSuperposesMax, ...groupes.values(), 0);

  const me = (await call(coach, "GET", "/me")).data;
  if (me?.clubName || me?.pendingClubName) controles.clubExpose++;
}
// L'affiliation ne doit plus exister
const aff = await call(coaches[0], "POST", "/coach/affiliation", { code: "CLUBAA" }, [404]);
if (aff.status !== 404) controles.affiliationOuverte++;

// Le contrat de publication : genre obligatoire, catégorie fermée
const base = {
  date: iso(12), time: "15:00", city: "Lyon", stadium: "Contrôle",
  level: "loisir", format: "11v11",
};
const sansGenre = await call(coaches[0], "POST", "/announcements", { ...base, category: "U13" }, [400]);
const categorieInconnue = await call(coaches[0], "POST", "/announcements", { ...base, category: "U21", gender: "masculin" }, [400]);
controles.publicationSansGenreAcceptee = sansGenre.status !== 400 ? 1 : 0;
controles.categorieInconnueAcceptee = categorieInconnue.status !== 400 ? 1 : 0;

// Répartition des genres et des catégories réellement servies par le radar
const vus = (await call(coaches[5], "GET", "/announcements/radar")).data?.items ?? [];
controles.genresSurLeRadar = [...new Set(vus.map((a) => a.gender))].sort().join(", ") || "aucune annonce";
controles.categoriesSurLeRadar = [...new Set(vus.map((a) => a.category))].length;

const p = (list, q) => { const s = [...list].sort((a, b) => a - b); return s[Math.floor(s.length * q)] ?? 0; };
const latences = [...timings.entries()]
  .map(([route, list]) => ({ route, appels: list.length, p50: p(list, 0.5), p95: p(list, 0.95), max: Math.max(...list) }))
  .sort((a, b) => b.p95 - a.p95)
  .slice(0, 10);

const refus = [...rejets.entries()].sort((a, b) => b[1] - a[1]).map(([motif, n]) => ({ motif, n }));
console.log(JSON.stringify({ requetes: requests, stats, controles, latences, ui, refus, anomalies }, null, 2));
