import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import {
  createPlayerInviteSchema,
  registerCoachSchema,
  registerInviteSchema,
  type AuthResponseDto,
  type InvitationInfoDto,
  type TeamMemberDto,
} from "@footcoach/shared";
import { z } from "zod";
import { db } from "../db/client.js";
import { invitations, teams, users } from "../db/schema.js";
import { requireAuth, requireRole, signAccessToken } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { issueRefreshToken, toUserDto } from "./auth.js";

// Alphabet sans caractères ambigus (pas de O/0, I/1…) : codes faciles à dicter
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
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

export function registrationRoutes(app: FastifyInstance) {
  // Inscription coach : crée le compte ET son équipe en une fois
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
      await tx.insert(teams).values({ name: input.teamName, city: input.teamCity, coachId: created.id });
      return created;
    });

    reply.code(201);
    return buildAuthResponse(user);
  });

  // Aperçu public d'un code (écran "vous allez rejoindre…")
  app.get("/invitations/:code", async (request): Promise<InvitationInfoDto> => {
    const { code } = request.params as { code: string };
    const [invite] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.code, code.toUpperCase().trim()), isNull(invitations.usedByUserId)));
    if (!invite) throw new HttpError(404, "Code invalide ou déjà utilisé");
    const [team] = await db.select().from(teams).where(eq(teams.id, invite.teamId));

    let playerName: string | null = null;
    if (invite.playerUserId) {
      const [player] = await db.select().from(users).where(eq(users.id, invite.playerUserId));
      playerName = player ? `${player.firstName} ${player.lastName}` : null;
    }
    return {
      role: invite.role as "player" | "parent",
      teamName: team?.name ?? "?",
      firstName: invite.firstName,
      lastName: invite.lastName,
      playerName,
    };
  });

  // Inscription avec un code d'invitation (joueur ou parent)
  app.post("/auth/register-invite", async (request, reply): Promise<AuthResponseDto> => {
    const input = registerInviteSchema.parse(request.body);
    await assertEmailFree(input.email);
    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await db.transaction(async (tx) => {
      const [invite] = await tx
        .select()
        .from(invitations)
        .where(and(eq(invitations.code, input.code.toUpperCase().trim()), isNull(invitations.usedByUserId)))
        .for("update");
      if (!invite) throw new HttpError(404, "Code invalide ou déjà utilisé");

      const [created] = await tx
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          passwordHash,
          role: invite.role,
          firstName: invite.firstName ?? input.firstName ?? "Parent",
          lastName: invite.lastName ?? input.lastName ?? "",
          teamId: invite.teamId,
        })
        .returning();

      // Un parent invité depuis la fiche d'un joueur devient son parent assigné
      if (invite.role === "parent" && invite.playerUserId) {
        await tx.update(users).set({ parentId: created.id }).where(eq(users.id, invite.playerUserId));
      }
      await tx.update(invitations).set({ usedByUserId: created.id }).where(eq(invitations.id, invite.id));
      return created;
    });

    reply.code(201);
    return buildAuthResponse(user);
  });

  // --- Espace coach : effectif et invitations ---
  app.register((coach) => {
    coach.addHook("preHandler", requireAuth);
    coach.addHook("preHandler", requireRole("coach"));

    coach.get("/team/members", async (request): Promise<TeamMemberDto[]> => {
      const teamId = request.user.teamId;
      if (!teamId) throw new HttpError(400, "Aucune équipe associée");

      const players = await db.select().from(users).where(and(eq(users.teamId, teamId), eq(users.role, "player")));
      const pendingInvites = await db
        .select()
        .from(invitations)
        .where(and(eq(invitations.teamId, teamId), isNull(invitations.usedByUserId)));
      const parents = await db.select().from(users).where(and(eq(users.teamId, teamId), eq(users.role, "parent")));

      const activeRows: TeamMemberDto[] = players.map((p) => {
        const parent = parents.find((u) => u.id === p.parentId);
        const parentInvite = pendingInvites.find((i) => i.role === "parent" && i.playerUserId === p.id);
        return {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          accountStatus: "active",
          inviteCode: null,
          parentStatus: parent ? "linked" : parentInvite ? "invited" : "none",
          parentName: parent ? `${parent.firstName} ${parent.lastName}` : null,
          parentInviteCode: parentInvite?.code ?? null,
        };
      });

      const invitedRows: TeamMemberDto[] = pendingInvites
        .filter((i) => i.role === "player")
        .map((i) => ({
          id: i.id,
          firstName: i.firstName ?? "?",
          lastName: i.lastName ?? "",
          accountStatus: "invited",
          inviteCode: i.code,
          parentStatus: "none",
          parentName: null,
          parentInviteCode: null,
        }));

      return [...activeRows, ...invitedRows];
    });

    // Inviter un joueur (nom + prénom) ou le parent d'un joueur existant
    coach.post("/team/invitations", async (request, reply) => {
      const teamId = request.user.teamId;
      if (!teamId) throw new HttpError(400, "Aucune équipe associée");
      const body = request.body as { role?: string; playerId?: string };

      if (body.role === "player") {
        const input = createPlayerInviteSchema.parse(request.body);
        const [invite] = await db
          .insert(invitations)
          .values({ code: generateCode(), teamId, role: "player", firstName: input.firstName, lastName: input.lastName })
          .returning();
        reply.code(201);
        return { code: invite.code };
      }

      if (body.role === "parent") {
        const { playerId } = z.object({ playerId: z.string().uuid() }).parse(request.body);
        const [player] = await db.select().from(users).where(eq(users.id, playerId));
        if (!player || player.teamId !== teamId || player.role !== "player") {
          throw new HttpError(404, "Joueur introuvable dans votre équipe");
        }
        if (player.parentId) throw new HttpError(400, "Ce joueur a déjà un parent lié");
        const [existing] = await db
          .select()
          .from(invitations)
          .where(and(eq(invitations.playerUserId, playerId), isNull(invitations.usedByUserId)));
        if (existing) return { code: existing.code };
        const [invite] = await db
          .insert(invitations)
          .values({ code: generateCode(), teamId, role: "parent", playerUserId: playerId })
          .returning();
        reply.code(201);
        return { code: invite.code };
      }

      throw new HttpError(400, "role doit être player ou parent");
    });
  });
}
