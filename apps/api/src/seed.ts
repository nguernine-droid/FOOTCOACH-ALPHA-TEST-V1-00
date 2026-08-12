import { eq } from "drizzle-orm";
import { db, sql } from "./db/client.js";
import { MATCH_POINTS } from "@teamnexus/shared";
import {
  clubs,
  coachPoints,
  matchAnnouncements,
  matches,
  teamCoaches,
  teams,
  tournamentRegistrations,
  tournaments,
  users,
} from "./db/schema.js";
import { runMigrations } from "./db/migrate.js";
import { cityCoords } from "./lib/cities.js";
import { SeedRefused, assertSeedAllowed } from "./seedGuard.js";
import { hashPassword } from "./lib/passwordHash.js";

/**
 * Mot de passe commun des comptes de démonstration. Surchargeable pour ne pas
 * dépendre d'une valeur écrite dans le dépôt sur une base de recette partagée.
 */
const PASSWORD = process.env.FOOTCOACH_SEED_PASSWORD ?? "Demo1234!";

function plusDays(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

async function upsertUser(input: {
  email: string;
  role: "coach" | "player" | "parent" | "supporter" | "admin" | "club";
  /** Surnom affiché — à défaut, le prénom, comme le backfill de la migration */
  nickname?: string;
  firstName: string;
  lastName: string;
  teamId?: string | null;
}) {
  const passwordHash = await hashPassword(PASSWORD);
  const nickname = input.nickname ?? input.firstName;
  const [user] = await db
    .insert(users)
    .values({ ...input, nickname, passwordHash, teamId: input.teamId ?? null })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        role: input.role,
        nickname,
        firstName: input.firstName,
        lastName: input.lastName,
        teamId: input.teamId ?? null,
      },
    })
    .returning();
  return user;
}

async function upsertTeam(
  name: string,
  city: string,
  coachId: string,
  joinCode: string,
  // Références du préremplissage : les comptes de démo doivent montrer une
  // publication d'annonce déjà remplie, c'est là tout leur intérêt.
  references: { category: string; gender: string; stadium: string },
) {
  const coords = cityCoords(city);
  const values = {
    name,
    city,
    coachId,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    category: references.category,
    gender: references.gender,
    stadium: references.stadium,
  };
  const [team] = await db
    .insert(teams)
    .values({ ...values, joinCode })
    .onConflictDoUpdate({ target: teams.joinCode, set: values })
    .returning();
  // Affectation coach principal (idempotent via l'index unique (team_id, coach_id))
  await db.insert(teamCoaches).values({ teamId: team.id, coachId, role: "principal" }).onConflictDoNothing();
  return team;
}

async function main() {
  // Avant toute écriture, et avant même les migrations : ce jeu de données crée
  // un administrateur au mot de passe publié dans le README.
  assertSeedAllowed({
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    confirm: process.env.FOOTCOACH_SEED_CONFIRM,
  });

  await runMigrations();

  // Des surnoms distincts de l'état civil : les comptes de démo doivent montrer
  // que c'est bien le surnom, et lui seul, que les confrères voient.
  const coachA = await upsertUser({ email: "coach.a@demo.fr", role: "coach", nickname: "Coach Alex", firstName: "Alexandre", lastName: "Martin" });
  const coachB = await upsertUser({ email: "coach.b@demo.fr", role: "coach", nickname: "Bruno S.", firstName: "Bruno", lastName: "Silva" });
  const teamA = await upsertTeam("FC Nexus U13", "Lyon", coachA.id, "DEMOA1", {
    category: "U13",
    gender: "masculin",
    stadium: "Plaine des Jeux de Gerland",
  });
  const teamB = await upsertTeam("AS Cyber", "Villeurbanne", coachB.id, "DEMOB2", {
    category: "U13",
    gender: "masculin",
    stadium: "Stade des Iris",
  });
  // Coach A encadre une seconde équipe (U15) : démo du multi-équipes "Mes
  // équipes". En féminines, pour que l'écart de genre entre une équipe et une
  // annonce se voie sur les comptes de démo comme il se verra en vrai.
  await upsertTeam("FC Nexus U15", "Lyon", coachA.id, "DEMOA3", {
    category: "U15",
    gender: "feminin",
    stadium: "Plaine des Jeux de Gerland",
  });

  // Casquettes de démo : un joker (seul destinataire des SOS) et un
  // contributeur, pour que les deux badges se voient sur les fiches.
  await db.update(users).set({ coachCategories: ["joker"] }).where(eq(users.id, coachB.id));
  await db.update(users).set({ coachCategories: ["contributeur"] }).where(eq(users.id, coachA.id));

  await upsertUser({ email: "admin@demo.fr", role: "admin", firstName: "Alice", lastName: "Admin" });

  // Club de démo : compte role=club + une équipe qu'il possède (sans coach affecté
  // pour l'instant — l'affiliation des coachs viendra avec l'espace club).
  const clubOwner = await upsertUser({ email: "club@demo.fr", role: "club", firstName: "Camille", lastName: "Direction" });
  const clubCoords = cityCoords("Lyon");
  const [demoClub] = await db
    .insert(clubs)
    .values({
      name: "Étoile Sportive Démo",
      city: "Lyon",
      email: "club@demo.fr",
      ownerId: clubOwner.id,
      affiliationCode: "CLUBAA",
      lat: clubCoords?.lat ?? null,
      lng: clubCoords?.lng ?? null,
    })
    .onConflictDoUpdate({ target: clubs.ownerId, set: { name: "Étoile Sportive Démo", city: "Lyon" } })
    .returning();
  const teamCoords = cityCoords("Lyon");
  await db
    .insert(teams)
    .values({
      name: "Étoile U11",
      city: "Lyon",
      clubId: demoClub.id,
      joinCode: "DEMOC1",
      lat: teamCoords?.lat ?? null,
      lng: teamCoords?.lng ?? null,
      category: "U11",
      // Mixte jusqu'aux U11, comme sur le terrain
      gender: "mixte",
      stadium: "Stade Georges Lyvet",
    })
    .onConflictDoUpdate({
      target: teams.joinCode,
      set: {
        clubId: demoClub.id,
        name: "Étoile U11",
        category: "U11",
        gender: "mixte",
        stadium: "Stade Georges Lyvet",
      },
    });

  const existing = await db.select().from(matchAnnouncements);
  if (existing.length === 0) {
    // Annonce ouverte du coach B — pour démontrer le flux "répondre"
    await db.insert(matchAnnouncements).values({
      teamId: teamB.id,
      // J+14 : assez loin pour qu'on ait le temps de répondre à la démo
      date: plusDays(14),
      time: "15:00",
      city: "Villeurbanne",
      stadium: "Stade des Iris",
      category: "U13",
      level: "loisir",
      format: "8v8",
      comment: "Match amical, terrain synthétique. Vestiaires disponibles.",
    });

    // Annonce du coach A déjà matchée → match à venir (J+3)
    const [matchedAnn] = await db
      .insert(matchAnnouncements)
      .values({
        teamId: teamA.id,
        date: plusDays(3),
        time: "10:30",
        city: "Lyon",
        stadium: "Plaine des Jeux de Gerland",
        category: "U13",
        level: "competition",
        format: "8v8",
        comment: "Amical de préparation.",
        status: "matched",
      })
      .returning();
    await db
      .insert(matches)
      .values({
        announcementId: matchedAnn.id,
        homeTeamId: teamA.id,
        awayTeamId: teamB.id,
        date: matchedAnn.date,
        time: matchedAnn.time,
        location: "Plaine des Jeux de Gerland, Lyon",
      })
      .returning();

    // Match terminé (J-4), rencontre validée au stade et score enregistré
    const [pastAnn] = await db
      .insert(matchAnnouncements)
      .values({
        teamId: teamB.id,
        date: plusDays(-4),
        time: "14:00",
        city: "Villeurbanne",
        stadium: "Stade des Iris",
        category: "U13",
        level: "loisir",
        format: "8v8",
        status: "matched",
      })
      .returning();
    const [pastMatch] = await db
      .insert(matches)
      .values({
        announcementId: pastAnn.id,
        homeTeamId: teamB.id,
        awayTeamId: teamA.id,
        date: pastAnn.date,
        time: pastAnn.time,
        location: "Stade des Iris, Villeurbanne",
        status: "finished",
        homeScore: 1,
        awayScore: 3,
        scoreSubmittedByTeamId: teamB.id,
        scoreSubmittedAt: new Date(),
        // Les deux coachs se sont scannés au stade : c'est de là que viennent
        // leurs points, et c'est ce que les comptes de démo doivent montrer.
        encounterTokenCoachId: coachB.id,
        encounterConfirmedAt: new Date(),
        encounterConfirmedByCoachId: coachA.id,
      })
      .returning();

    await db.insert(coachPoints).values([
      { coachId: coachA.id, matchId: pastMatch.id, points: MATCH_POINTS.rencontre, reason: "rencontre" },
      { coachId: coachB.id, matchId: pastMatch.id, points: MATCH_POINTS.rencontre, reason: "rencontre" },
    ]);
  }

  // Tournoi de démonstration : sans affiche, pour montrer le visuel de repli.
  // Une équipe inscrite, une place restante — de quoi voir l'inscription ET la
  // jauge de places d'un seul coup d'œil.
  const existingTournaments = await db.select().from(tournaments);
  if (existingTournaments.length === 0) {
    const [demo] = await db
      .insert(tournaments)
      .values({
        teamId: teamB.id,
        name: "Tournoi de printemps",
        date: plusDays(21),
        time: "09:00",
        city: "Villeurbanne",
        stadium: "Stade des Iris",
        category: "U13",
        gender: "masculin",
        level: "loisir",
        format: "8v8",
        slots: 8,
        comment: "Buvette sur place, quatre terrains. Engagement 30 € par équipe.",
      })
      .returning();
    await db.insert(tournamentRegistrations).values({ tournamentId: demo.id, teamId: teamA.id });
  }

  const count = (await db.select().from(users)).length;
  console.log(`Seed terminé : ${count} utilisateurs (mot de passe commun : ${PASSWORD})`);
}

main()
  .then(() => sql.end())
  .catch((err) => {
    // Un refus de garde-fou n'est pas un incident : le message seul suffit,
    // une trace d'exécution ne dirait rien de plus à celui qui déploie.
    console.error(err instanceof SeedRefused ? err.message : err);
    process.exit(1);
  });
