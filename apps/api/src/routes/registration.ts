import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { and, asc, desc, eq, or } from "drizzle-orm";
import {
  approveJoinRequestSchema,
  registerCoachSchema,
  registerJoinSchema,
  resubmitJoinSchema,
  updatePlayerSchema,
  type AuthResponseDto,
  type JoinRequestDto,
  type TeamJoinInfoDto,
  type TeamMemberDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import {
  attendances,
  joinRequests,
  matches,
  teamCoaches,
  teams,
  users,
} from "../db/schema.js";
import { requireAuth, requireRole, signAccessToken } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { issueRefreshToken, toUserDto } from "./auth.js";
import { cityCoords } from "../lib/cities.js";

// Alphabet sans caractères ambigus (pas de O/0, I/1…) : codes faciles à dicter
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCode(): string {
  return Array.from(crypto.randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

async function assertEmailFree(email: string) {
  const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (existing) throw new HttpError(400, "Un compte existe déjà avec cet email");
}

async function buildAuthResponse(user: typeof users.$inferSelect): Promise<AuthResponseDto> {
  const dto = await toUserDto(user);
  return {
    accessToken: signAccessToken({ id: user.id, role: user.role, teamId: dto.teamId }),
    refreshToken: await issueRefreshToken(user.id),
    user: dto,
  };
}

async function getTeamByCode(code: string) {
  const [team] = await db.select().from(teams).where(eq(teams.joinCode, code.toUpperCase().trim()));
  if (!team) throw new HttpError(404, "Code d'équipe invalide");
  return team;
}

// Parent : l'enfant désigné doit être un joueur de l'équipe rejointe
async function assertChildInTeam(childUserId: string, teamId: string) {
  const [child] = await db.select().from(users).where(eq(users.id, childUserId));
  if (!child || child.teamId !== teamId || child.role !== "player") {
    throw new HttpError(400, "Le joueur désigné n'appartient pas à cette équipe");
  }
  return child;
}

export function registrationRoutes(app: FastifyInstance) {
  // Inscription coach : crée le compte ET son équipe (avec son code) en une fois
  app.post("/auth/register-coach", async (request, reply): Promise<AuthResponseDto> => {
    const input = registerCoachSchema.parse(request.body);
    await assertEmailFree(input.email);
    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          passwordHash,
          role: "coach",
          firstName: input.firstName,
          lastName: input.lastName,
        })
        .returning();
      const coords = cityCoords(input.teamCity);
      const [team] = await tx
        .insert(teams)
        .values({
          name: input.teamName,
          city: input.teamCity,
          coachId: created.id,
          joinCode: generateCode(),
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        })
        .returning();
      // Affectation coach ↔ équipe (source de vérité multi-équipes)
      await tx.insert(teamCoaches).values({ teamId: team.id, coachId: created.id, role: "principal" });
      return created;
    });

    reply.code(201);
    return buildAuthResponse(user);
  });

  // Aperçu public d'un code d'équipe : nom + joueurs (pour le choix d'enfant du parent).
  // La liste (prénoms/noms uniquement) n'est exposée qu'avec un code valide.
  app.get("/teams/join/:code", async (request): Promise<TeamJoinInfoDto> => {
    const { code } = request.params as { code: string };
    const team = await getTeamByCode(code);
    const players = await db
      .select()
      .from(users)
      .where(and(eq(users.teamId, team.id), eq(users.role, "player")));
    return {
      teamName: team.name,
      city: team.city,
      players: players
        .map((p) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, hasParent: p.parentId != null }))
        .sort((a, b) => a.firstName.localeCompare(b.firstName)),
    };
  });

  // Inscription en autonomie avec le code d'équipe : le compte est créé SANS équipe
  // (teamId null) + une demande d'adhésion que le coach devra accepter.
  app.post("/auth/register-join", async (request, reply): Promise<AuthResponseDto> => {
    const input = registerJoinSchema.parse(request.body);
    await assertEmailFree(input.email);
    const passwordHash = await bcrypt.hash(input.password, 10);
    const team = await getTeamByCode(input.code);
    if (input.role === "parent" && input.childUserId) {
      await assertChildInTeam(input.childUserId, team.id);
    }

    const user = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          passwordHash,
          role: input.role,
          firstName: input.firstName,
          lastName: input.lastName,
          teamId: null,
          position: input.role === "player" ? (input.position ?? null) : null,
          jerseyNumber: input.role === "player" ? (input.jerseyNumber ?? null) : null,
        })
        .returning();
      await tx.insert(joinRequests).values({
        userId: created.id,
        teamId: team.id,
        role: input.role,
        childUserId: input.role === "parent" ? (input.childUserId ?? null) : null,
      });
      return created;
    });

    reply.code(201);
    return buildAuthResponse(user);
  });

  // Nouvelle demande d'un compte existant (refusé, ou parti sans équipe)
  app.post(
    "/join-requests",
    { preHandler: [requireAuth, requireRole("player", "parent")] },
    async (request, reply) => {
      if (request.user.teamId) throw new HttpError(400, "Vous appartenez déjà à une équipe");
      const input = resubmitJoinSchema.parse(request.body);
      const team = await getTeamByCode(input.code);

      const [pending] = await db
        .select()
        .from(joinRequests)
        .where(and(eq(joinRequests.userId, request.user.id), eq(joinRequests.status, "pending")));
      if (pending) throw new HttpError(400, "Vous avez déjà une demande en attente");

      if (request.user.role === "parent") {
        if (!input.childUserId) throw new HttpError(400, "Choisissez votre enfant dans la liste");
        await assertChildInTeam(input.childUserId, team.id);
      }

      await db.transaction(async (tx) => {
        if (request.user.role === "player" && (input.position !== undefined || input.jerseyNumber !== undefined)) {
          await tx
            .update(users)
            .set({
              ...(input.position !== undefined && { position: input.position }),
              ...(input.jerseyNumber !== undefined && { jerseyNumber: input.jerseyNumber }),
            })
            .where(eq(users.id, request.user.id));
        }
        await tx.insert(joinRequests).values({
          userId: request.user.id,
          teamId: team.id,
          role: request.user.role,
          childUserId: request.user.role === "parent" ? (input.childUserId ?? null) : null,
        });
      });
      reply.code(201);
      return { ok: true };
    },
  );

  // --- Espace coach : code d'équipe, demandes d'adhésion, effectif ---
  app.register((coach) => {
    coach.addHook("preHandler", requireAuth);
    coach.addHook("preHandler", requireRole("coach"));

    async function getCoachTeam(teamId: string | null) {
      if (!teamId) throw new HttpError(400, "Aucune équipe associée");
      const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
      if (!team) throw new HttpError(404, "Équipe introuvable");
      return team;
    }

    coach.get("/team/join-code", async (request) => {
      const team = await getCoachTeam(request.user.teamId);
      return { code: team.joinCode };
    });

    // Régénérer le code (l'ancien cesse immédiatement de fonctionner)
    coach.post("/team/join-code/regenerate", async (request) => {
      const team = await getCoachTeam(request.user.teamId);
      for (let attempt = 0; attempt < 3; attempt++) {
        const code = generateCode();
        try {
          await db.update(teams).set({ joinCode: code }).where(eq(teams.id, team.id));
          return { code };
        } catch {
          // Collision d'unicité (rarissime) : on retente avec un autre code
        }
      }
      throw new HttpError(500, "Impossible de générer un nouveau code, réessayez");
    });

    // Demandes d'adhésion en attente
    coach.get("/team/requests", async (request): Promise<JoinRequestDto[]> => {
      const team = await getCoachTeam(request.user.teamId);
      const rows = await db
        .select({ request: joinRequests, applicant: users })
        .from(joinRequests)
        .innerJoin(users, eq(joinRequests.userId, users.id))
        .where(and(eq(joinRequests.teamId, team.id), eq(joinRequests.status, "pending")))
        .orderBy(asc(joinRequests.createdAt));

      const childIds = rows.map((r) => r.request.childUserId).filter((id): id is string => id != null);
      const children = childIds.length
        ? await db.select().from(users).where(or(...childIds.map((id) => eq(users.id, id))))
        : [];
      const childById = new Map(children.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

      return rows.map(({ request: r, applicant }) => ({
        id: r.id,
        role: r.role as "player" | "parent",
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        email: applicant.email,
        position: applicant.position,
        jerseyNumber: applicant.jerseyNumber,
        childUserId: r.childUserId,
        childName: r.childUserId ? (childById.get(r.childUserId) ?? null) : null,
        createdAt: r.createdAt.toISOString(),
      }));
    });

    // Accepter : le demandeur intègre l'équipe ; un parent est lié à son enfant
    // (le coach peut corriger l'enfant désigné via le body).
    coach.post("/team/requests/:id/approve", async (request) => {
      const team = await getCoachTeam(request.user.teamId);
      const { id } = request.params as { id: string };
      const input = approveJoinRequestSchema.parse(request.body ?? {});

      await db.transaction(async (tx) => {
        const [joinRequest] = await tx
          .select()
          .from(joinRequests)
          .where(and(eq(joinRequests.id, id), eq(joinRequests.teamId, team.id), eq(joinRequests.status, "pending")))
          .for("update");
        if (!joinRequest) throw new HttpError(404, "Demande introuvable ou déjà traitée");

        await tx.update(users).set({ teamId: team.id }).where(eq(users.id, joinRequest.userId));

        if (joinRequest.role === "parent") {
          const childUserId = input.childUserId ?? joinRequest.childUserId;
          if (!childUserId) throw new HttpError(400, "Désignez l'enfant de ce parent avant d'accepter");
          const [child] = await tx.select().from(users).where(eq(users.id, childUserId));
          if (!child || child.teamId !== team.id || child.role !== "player") {
            throw new HttpError(400, "Le joueur désigné n'appartient pas à votre équipe");
          }
          await tx.update(users).set({ parentId: joinRequest.userId }).where(eq(users.id, childUserId));
          if (input.childUserId && input.childUserId !== joinRequest.childUserId) {
            await tx.update(joinRequests).set({ childUserId: input.childUserId }).where(eq(joinRequests.id, id));
          }
        }

        await tx
          .update(joinRequests)
          .set({ status: "approved", decidedAt: new Date() })
          .where(eq(joinRequests.id, id));
      });
      return { ok: true };
    });

    // Refuser : le compte subsiste sans équipe et peut soumettre une nouvelle demande
    coach.post("/team/requests/:id/decline", async (request) => {
      const team = await getCoachTeam(request.user.teamId);
      const { id } = request.params as { id: string };
      const [updated] = await db
        .update(joinRequests)
        .set({ status: "declined", decidedAt: new Date() })
        .where(and(eq(joinRequests.id, id), eq(joinRequests.teamId, team.id), eq(joinRequests.status, "pending")))
        .returning();
      if (!updated) throw new HttpError(404, "Demande introuvable ou déjà traitée");
      return { ok: true };
    });

    coach.get("/team/members", async (request): Promise<TeamMemberDto[]> => {
      const teamId = request.user.teamId;
      if (!teamId) throw new HttpError(400, "Aucune équipe associée");

      const players = await db.select().from(users).where(and(eq(users.teamId, teamId), eq(users.role, "player")));
      const parents = await db.select().from(users).where(and(eq(users.teamId, teamId), eq(users.role, "parent")));

      // Prochain match programmé de l'équipe → réponse de présence de chaque joueur
      const [nextMatch] = await db
        .select()
        .from(matches)
        .where(and(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)), eq(matches.status, "scheduled")))
        .orderBy(asc(matches.date), asc(matches.time))
        .limit(1);
      const nextAttendances = nextMatch
        ? await db.select().from(attendances).where(eq(attendances.matchId, nextMatch.id))
        : [];

      return players.map((p) => {
        const parent = parents.find((u) => u.id === p.parentId);
        const attendance = nextAttendances.find((a) => a.userId === p.id);
        return {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          parentStatus: parent ? "linked" : "none",
          parentName: parent ? `${parent.firstName} ${parent.lastName}` : null,
          position: p.position,
          jerseyNumber: p.jerseyNumber,
          nextMatchStatus: nextMatch ? (attendance?.status ?? "pending") : null,
          nextMatchDate: nextMatch?.date ?? null,
        };
      });
    });

    // Mise à jour de la fiche sportive d'un joueur (poste, n° de maillot)
    coach.patch("/team/members/:id", async (request) => {
      const teamId = request.user.teamId;
      if (!teamId) throw new HttpError(400, "Aucune équipe associée");
      const { id } = request.params as { id: string };
      const input = updatePlayerSchema.parse(request.body);

      const [player] = await db.select().from(users).where(eq(users.id, id));
      if (!player || player.teamId !== teamId || player.role !== "player") {
        throw new HttpError(404, "Joueur introuvable dans votre équipe");
      }
      await db
        .update(users)
        .set({
          ...(input.position !== undefined && { position: input.position }),
          ...(input.jerseyNumber !== undefined && { jerseyNumber: input.jerseyNumber }),
        })
        .where(eq(users.id, id));
      return { ok: true };
    });
  });
}
