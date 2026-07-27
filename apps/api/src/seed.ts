import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, sql } from "./db/client.js";
import { attendances, clubs, matchAnnouncements, matchEvents, matches, teamCoaches, teams, users } from "./db/schema.js";
import { runMigrations } from "./db/migrate.js";
import { cityCoords } from "./lib/cities.js";

const PASSWORD = "Demo1234!";

function plusDays(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

async function upsertUser(input: {
  email: string;
  role: "coach" | "player" | "parent" | "supporter" | "admin" | "club";
  firstName: string;
  lastName: string;
  teamId?: string | null;
}) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [user] = await db
    .insert(users)
    .values({ ...input, passwordHash, teamId: input.teamId ?? null })
    .onConflictDoUpdate({
      target: users.email,
      set: { role: input.role, firstName: input.firstName, lastName: input.lastName, teamId: input.teamId ?? null },
    })
    .returning();
  return user;
}

async function upsertTeam(name: string, city: string, coachId: string, joinCode: string) {
  const coords = cityCoords(city);
  const [team] = await db
    .insert(teams)
    .values({ name, city, coachId, joinCode, lat: coords?.lat ?? null, lng: coords?.lng ?? null })
    .onConflictDoUpdate({
      target: teams.joinCode,
      set: { name, city, coachId, lat: coords?.lat ?? null, lng: coords?.lng ?? null },
    })
    .returning();
  // Affectation coach principal (idempotent via l'index unique (team_id, coach_id))
  await db.insert(teamCoaches).values({ teamId: team.id, coachId, role: "principal" }).onConflictDoNothing();
  return team;
}

async function main() {
  await runMigrations();

  const coachA = await upsertUser({ email: "coach.a@demo.fr", role: "coach", firstName: "Alexandre", lastName: "Martin" });
  const coachB = await upsertUser({ email: "coach.b@demo.fr", role: "coach", firstName: "Bruno", lastName: "Silva" });
  const teamA = await upsertTeam("FC Nexus U13", "Lyon", coachA.id, "DEMOA1");
  const teamB = await upsertTeam("AS Cyber", "Villeurbanne", coachB.id, "DEMOB2");
  // Coach A encadre une seconde équipe (U15) : démo du multi-équipes "Mes équipes"
  await upsertTeam("FC Nexus U15", "Lyon", coachA.id, "DEMOA3");

  const player = await upsertUser({ email: "player@demo.fr", role: "player", firstName: "Paul", lastName: "Joueur", teamId: teamA.id });
  const parent = await upsertUser({ email: "parent@demo.fr", role: "parent", firstName: "Patricia", lastName: "Parent", teamId: teamA.id });
  await upsertUser({ email: "supporter@demo.fr", role: "supporter", firstName: "Sam", lastName: "Supporter", teamId: teamA.id });
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
    })
    .onConflictDoUpdate({ target: teams.joinCode, set: { clubId: demoClub.id, name: "Étoile U11" } });

  // Patricia est le parent assigné de Paul (elle valide ses covoiturages)
  // et a déjà renseigné ses infos conducteur pour la démo.
  await db.update(users).set({ parentId: parent.id, position: "milieu", jerseyNumber: 10 }).where(eq(users.id, player.id));
  await db
    .update(users)
    .set({ licensePlate: "AB-123-CD", driverLicenseNumber: "123456789012" })
    .where(eq(users.id, parent.id));

  const existing = await db.select().from(matchAnnouncements);
  if (existing.length === 0) {
    // Annonce ouverte du coach B — pour démontrer le flux "répondre"
    await db.insert(matchAnnouncements).values({
      teamId: teamB.id,
      // J+14 : le délai FFF de déclaration (10 jours) est tenu
      date: plusDays(14),
      time: "15:00",
      city: "Villeurbanne",
      stadium: "Stade des Iris",
      category: "U13",
      level: "loisir",
      format: "8v8",
      comment: "Match amical, terrain synthétique. Vestiaires disponibles.",
      federationDeclared: true,
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
        federationDeclared: true,
      })
      .returning();
    const [upcoming] = await db
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

    // Match terminé (J-4) avec score, temps forts et présences
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
        federationDeclared: true,
      })
      .returning();
    const [finished] = await db
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
      })
      .returning();

    await db.insert(matchEvents).values([
      { matchId: finished.id, minute: 12, type: "goal", side: "away", description: "But de Paul sur corner", createdBy: coachA.id },
      { matchId: finished.id, minute: 27, type: "goal", side: "home", description: "Égalisation sur penalty", createdBy: coachB.id },
      { matchId: finished.id, minute: 44, type: "goal", side: "away", description: "Contre-attaque éclair, 2-1", createdBy: coachA.id },
      { matchId: finished.id, minute: 58, type: "goal", side: "away", description: "But du break en solo", createdBy: coachA.id },
    ]);

    await db.insert(attendances).values([
      { matchId: finished.id, userId: player.id, status: "present" },
      { matchId: finished.id, userId: parent.id, status: "present", canTransport: true, transportSeats: 3 },
      {
        matchId: upcoming.id,
        userId: parent.id,
        status: "present",
        canTransport: true,
        transportSeats: 2,
        departureTime: "09:15",
        departureArea: "Croix-Rousse",
      },
    ]);
  }

  const count = (await db.select().from(users)).length;
  console.log(`Seed terminé : ${count} utilisateurs (mot de passe commun : ${PASSWORD})`);
}

main()
  .then(() => sql.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
