import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import {
  assignCoachSchema,
  createClubCoachSchema,
  createClubTeamSchema,
  updateClubTeamSchema,
  type ClubAffiliationRequestDto,
  type ClubCoachDto,
  type ClubDto,
  type ClubOverviewDto,
  type ClubTeamDto,
  type CreateClubCoachResultDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import { clubAffiliationRequests, clubs, teamCoaches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { generateCode } from "./registration.js";
import { cityCoords } from "../lib/cities.js";
import { generateTempPassword } from "../lib/passwords.js";

export function toClubDto(club: typeof clubs.$inferSelect): ClubDto {
  return { id: club.id, name: club.name, city: club.city, email: club.email, affiliationCode: club.affiliationCode };
}

// Club du compte connecté (role=club), retrouvé via clubs.ownerId
export async function getClubByOwner(ownerId: string): Promise<typeof clubs.$inferSelect> {
  const [club] = await db.select().from(clubs).where(eq(clubs.ownerId, ownerId));
  if (!club) throw new HttpError(404, "Club introuvable pour ce compte");
  return club;
}

// Insère une équipe avec un code d'adhésion unique (retry en cas de collision)
async function insertTeamWithCode(values: Omit<typeof teams.$inferInsert, "joinCode">) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const [team] = await db
        .insert(teams)
        .values({ ...values, joinCode: generateCode() })
        .returning();
      return team;
    } catch (err) {
      if ((err as { code?: string }).code === "23505" && attempt < 3) continue; // collision d'unicité
      throw err;
    }
  }
  throw new HttpError(500, "Impossible de générer un code d'équipe, réessayez");
}

// Détail des équipes d'un club : encadrants (team_coaches) + effectif (joueurs)
export async function buildClubTeams(clubId: string): Promise<ClubTeamDto[]> {
  const teamRows = await db.select().from(teams).where(eq(teams.clubId, clubId)).orderBy(asc(teams.name));
  if (teamRows.length === 0) return [];
  const teamIds = teamRows.map((t) => t.id);

  const coachRows = await db
    .select({
      teamId: teamCoaches.teamId,
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: teamCoaches.role,
    })
    .from(teamCoaches)
    .innerJoin(users, eq(teamCoaches.coachId, users.id))
    .where(inArray(teamCoaches.teamId, teamIds));


  return teamRows.map((t) => ({
    id: t.id,
    name: t.name,
    city: t.city,
    coaches: coachRows
      .filter((c) => c.teamId === t.id)
      .map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, role: c.role })),
  }));
}

export function clubRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("club"));

  // Équipe appartenant bien au club connecté (sinon 404)
  async function ownedTeam(clubId: string, teamId: string) {
    const [team] = await db.select().from(teams).where(and(eq(teams.id, teamId), eq(teams.clubId, clubId)));
    if (!team) throw new HttpError(404, "Équipe introuvable dans ce club");
    return team;
  }

  app.get("/club/overview", async (request): Promise<ClubOverviewDto> => {
    const club = await getClubByOwner(request.user.id);
    const clubTeams = await buildClubTeams(club.id);
    const [{ value: coachesCount }] = await db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.clubId, club.id), eq(users.role, "coach")));
    return {
      club: toClubDto(club),
      teamsCount: clubTeams.length,
      coachesCount: Number(coachesCount),
      teams: clubTeams,
    };
  });

  app.get("/club/teams", async (request): Promise<ClubTeamDto[]> => {
    const club = await getClubByOwner(request.user.id);
    return buildClubTeams(club.id);
  });

  app.post("/club/teams", async (request, reply): Promise<ClubTeamDto> => {
    const club = await getClubByOwner(request.user.id);
    const input = createClubTeamSchema.parse(request.body);
    const coords = cityCoords(input.city);
    const team = await insertTeamWithCode({
      name: input.name,
      city: input.city,
      clubId: club.id,
      coachId: null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    });
    reply.code(201);
    return { id: team.id, name: team.name, city: team.city, coaches: [] };
  });

  app.patch("/club/teams/:id", async (request) => {
    const club = await getClubByOwner(request.user.id);
    const { id } = request.params as { id: string };
    await ownedTeam(club.id, id);
    const input = updateClubTeamSchema.parse(request.body);
    const coords = input.city !== undefined ? cityCoords(input.city) : null;
    await db
      .update(teams)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.city !== undefined && { city: input.city, lat: coords?.lat ?? null, lng: coords?.lng ?? null }),
      })
      .where(eq(teams.id, id));
    return { ok: true };
  });

  // Suppression d'une équipe : refusée si elle a encore des membres (à vider d'abord)
  app.delete("/club/teams/:id", async (request) => {
    const club = await getClubByOwner(request.user.id);
    const { id } = request.params as { id: string };
    await ownedTeam(club.id, id);
    const [{ value: memberCount }] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.teamId, id));
    if (Number(memberCount) > 0) {
      throw new HttpError(400, "Retirez d'abord les membres de cette équipe");
    }
    try {
      await db.delete(teams).where(eq(teams.id, id)); // team_coaches supprimés en cascade
    } catch (err) {
      if ((err as { code?: string }).code === "23503") {
        throw new HttpError(409, "Cette équipe est référencée par des matchs ou annonces et ne peut pas être supprimée");
      }
      throw err;
    }
    return { ok: true };
  });

  app.get("/club/coaches", async (request): Promise<ClubCoachDto[]> => {
    const club = await getClubByOwner(request.user.id);
    const coachUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.clubId, club.id), eq(users.role, "coach")))
      .orderBy(asc(users.lastName), asc(users.firstName));
    if (coachUsers.length === 0) return [];

    const coachIds = coachUsers.map((c) => c.id);
    // Affectations, restreintes aux équipes du club
    const assignments = await db
      .select({ coachId: teamCoaches.coachId, teamId: teams.id, teamName: teams.name, role: teamCoaches.role })
      .from(teamCoaches)
      .innerJoin(teams, eq(teamCoaches.teamId, teams.id))
      .where(and(inArray(teamCoaches.coachId, coachIds), eq(teams.clubId, club.id)));

    return coachUsers.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      teams: assignments
        .filter((a) => a.coachId === c.id)
        .map((a) => ({ id: a.teamId, name: a.teamName, role: a.role })),
    }));
  });

  // Coach affilié à ce club (sinon 404) — garde des affectations
  async function affiliatedCoach(clubId: string, coachId: string) {
    const [coach] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, coachId), eq(users.role, "coach"), eq(users.clubId, clubId)));
    if (!coach) throw new HttpError(404, "Ce coach n'est pas affilié à votre club");
    return coach;
  }

  // Création d'un compte coach par le club (affilié d'emblée). Mot de passe
  // temporaire retourné une seule fois.
  app.post("/club/coaches", async (request, reply): Promise<CreateClubCoachResultDto> => {
    const club = await getClubByOwner(request.user.id);
    const input = createClubCoachSchema.parse(request.body);
    const email = input.email.toLowerCase();
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) throw new HttpError(400, "Un compte existe déjà avec cet email");

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const [coach] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        role: "coach",
        firstName: input.firstName,
        lastName: input.lastName,
        clubId: club.id,
      })
      .returning();

    reply.code(201);
    return {
      coach: { id: coach.id, firstName: coach.firstName, lastName: coach.lastName, email: coach.email },
      tempPassword,
    };
  });

  app.get("/club/affiliation-requests", async (request): Promise<ClubAffiliationRequestDto[]> => {
    const club = await getClubByOwner(request.user.id);
    const rows = await db
      .select({ request: clubAffiliationRequests, coach: users })
      .from(clubAffiliationRequests)
      .innerJoin(users, eq(clubAffiliationRequests.coachId, users.id))
      .where(and(eq(clubAffiliationRequests.clubId, club.id), eq(clubAffiliationRequests.status, "pending")))
      .orderBy(asc(clubAffiliationRequests.createdAt));
    return rows.map(({ request: r, coach }) => ({
      id: r.id,
      coachId: coach.id,
      firstName: coach.firstName,
      lastName: coach.lastName,
      email: coach.email,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // Accepter : le coach rejoint le club (users.clubId posé)
  app.post("/club/affiliation-requests/:id/approve", async (request) => {
    const club = await getClubByOwner(request.user.id);
    const { id } = request.params as { id: string };
    await db.transaction(async (tx) => {
      const [req] = await tx
        .select()
        .from(clubAffiliationRequests)
        .where(
          and(
            eq(clubAffiliationRequests.id, id),
            eq(clubAffiliationRequests.clubId, club.id),
            eq(clubAffiliationRequests.status, "pending"),
          ),
        )
        .for("update");
      if (!req) throw new HttpError(404, "Demande introuvable ou déjà traitée");
      await tx.update(users).set({ clubId: club.id }).where(eq(users.id, req.coachId));
      await tx
        .update(clubAffiliationRequests)
        .set({ status: "approved", decidedAt: new Date() })
        .where(eq(clubAffiliationRequests.id, id));
    });
    return { ok: true };
  });

  app.post("/club/affiliation-requests/:id/decline", async (request) => {
    const club = await getClubByOwner(request.user.id);
    const { id } = request.params as { id: string };
    const [updated] = await db
      .update(clubAffiliationRequests)
      .set({ status: "declined", decidedAt: new Date() })
      .where(
        and(
          eq(clubAffiliationRequests.id, id),
          eq(clubAffiliationRequests.clubId, club.id),
          eq(clubAffiliationRequests.status, "pending"),
        ),
      )
      .returning();
    if (!updated) throw new HttpError(404, "Demande introuvable ou déjà traitée");
    return { ok: true };
  });

  // Affecter un coach affilié à une équipe du club (principal ou adjoint)
  app.post("/club/teams/:id/coaches", async (request, reply) => {
    const club = await getClubByOwner(request.user.id);
    const { id } = request.params as { id: string };
    await ownedTeam(club.id, id);
    const input = assignCoachSchema.parse(request.body);
    await affiliatedCoach(club.id, input.coachId);
    await db
      .insert(teamCoaches)
      .values({ teamId: id, coachId: input.coachId, role: input.role })
      .onConflictDoUpdate({ target: [teamCoaches.teamId, teamCoaches.coachId], set: { role: input.role } });
    reply.code(201);
    return { ok: true };
  });

  app.delete("/club/teams/:id/coaches/:coachId", async (request) => {
    const club = await getClubByOwner(request.user.id);
    const { id, coachId } = request.params as { id: string; coachId: string };
    await ownedTeam(club.id, id);
    await db
      .delete(teamCoaches)
      .where(and(eq(teamCoaches.teamId, id), eq(teamCoaches.coachId, coachId)));
    return { ok: true };
  });
}
