import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import type { Role } from "@footcoach/shared";
import { env } from "../env.js";

export interface AuthUser {
  id: string;
  role: Role;
  teamId: string | null;
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
}

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: "Accès refusé pour ce rôle" });
    }
  };
}
