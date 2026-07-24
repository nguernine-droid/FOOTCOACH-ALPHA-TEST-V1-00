import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import type { Role } from "@footcoach/shared";
import { env } from "../env.js";
import { db } from "../db/client.js";
import { teamCoaches } from "../db/schema.js";

export interface AuthUser {
  id: string;
  role: Role;
  /** Équipe active de la requête. Coach : équipe principale par défaut, ou celle
   *  du header X-Team-Id si le coach y est affecté. Autres rôles : leur équipe. */
  teamId: string | null;
}

// Ids des équipes encadrées par un coach (via team_coaches). Sert à valider
// l'équipe active demandée par le header.
export async function getCoachTeamIds(coachId: string): Promise<string[]> {
  const rows = await db
    .select({ teamId: teamCoaches.teamId })
    .from(teamCoaches)
    .where(eq(teamCoaches.coachId, coachId));
  return rows.map((r) => r.teamId);
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser;
  }
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, role: user.role, teamId: user.teamId }, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
}

// preHandler : exige un Bearer token valide et pose request.user
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Token manquant" });
  }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    request.user = {
      id: payload.sub as string,
      role: payload.role as Role,
      teamId: (payload.teamId as string | null) ?? null,
    };
  } catch {
    return reply.code(401).send({ error: "Token invalide ou expiré" });
  }

  // Coach multi-équipes : l'équipe active vient du header X-Team-Id (sélecteur du
  // front). Par défaut = équipe principale (celle du token). On ne valide en base
  // que si une autre équipe est explicitement demandée.
  if (request.user.role === "coach") {
    const raw = request.headers["x-team-id"];
    const requested = typeof raw === "string" && raw.length > 0 ? raw : null;
    if (requested && requested !== request.user.teamId) {
      const teamIds = await getCoachTeamIds(request.user.id);
      if (!teamIds.includes(requested)) {
        return reply.code(403).send({ error: "Vous n'encadrez pas cette équipe" });
      }
      request.user.teamId = requested;
    }
  }
}

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: "Accès refusé pour ce rôle" });
    }
  };
}
