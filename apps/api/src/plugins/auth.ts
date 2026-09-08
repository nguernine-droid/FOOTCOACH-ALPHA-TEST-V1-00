import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import type { CoachCategory, Role } from "@footcoach/shared";
import { env } from "../env.js";
import { db } from "../db/client.js";
import { teamCoaches, users } from "../db/schema.js";

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

/**
 * Algorithme de signature des jetons d'accès, épinglé des deux côtés.
 *
 * `jsonwebtoken` 9 refuse déjà `alg: none` quand le secret est une chaîne — je
 * l'ai vérifié sur la version installée plutôt que de le supposer, l'attaque
 * ressort « jwt signature is required ». Il n'y avait donc pas de faille
 * exploitable ici. Mais cette garantie reposait sur le comportement par défaut
 * d'une dépendance, pas sur une intention écrite dans le code : une montée de
 * version qui l'assouplirait passerait inaperçue. L'écrire coûte une ligne.
 */
const ACCESS_TOKEN_ALGORITHM = "HS256" as const;

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, role: user.role, teamId: user.teamId }, env.JWT_ACCESS_SECRET, {
    algorithm: ACCESS_TOKEN_ALGORITHM,
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
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET, {
      algorithms: [ACCESS_TOKEN_ALGORITHM],
    }) as jwt.JwtPayload;
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

/**
 * preHandler : exige que le coach connecté porte la casquette donnée, lue
 * fraîche en base — pas dans le JWT, qui ne porte que {sub, role, teamId} et
 * resterait valable 15 minutes après qu'un coach a décoché la case dans son
 * profil. Même logique que `getCoachTeamIds` ci-dessus : une lecture par
 * requête plutôt qu'une donnée embarquée qui peut devenir fausse en session.
 */
export function requireCoachCategory(category: CoachCategory) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const [row] = await db
      .select({ categories: users.coachCategories })
      .from(users)
      .where(eq(users.id, request.user.id));
    if (!row || !row.categories.includes(category)) {
      return reply.code(403).send({ error: "Réservé aux coachs contributeurs" });
    }
  };
}
