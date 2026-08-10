import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { createPublicationSchema, idParamSchema, type PublicationDto } from "@footcoach/shared";
import { db } from "../db/client.js";
import { publications, users } from "../db/schema.js";
import { requireAuth, requireCoachCategory, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { avatarUrlOf } from "./auth.js";

function toDto(
  row: { publication: typeof publications.$inferSelect; author: typeof users.$inferSelect },
  myId: string,
): PublicationDto {
  const { publication, author } = row;
  return {
    id: publication.id,
    title: publication.title,
    body: publication.body,
    author: {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName,
      avatarUrl: avatarUrlOf(author.avatarPath),
    },
    createdAt: publication.createdAt.toISOString(),
    isMine: author.id === myId,
  };
}

export function publicationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Fil global : tous les coachs, sans portée club/équipe
  app.get("/publications", { preHandler: requireRole("coach") }, async (request): Promise<PublicationDto[]> => {
    const rows = await db
      .select({ publication: publications, author: users })
      .from(publications)
      .innerJoin(users, eq(publications.authorId, users.id))
      .orderBy(desc(publications.createdAt))
      .limit(200);
    return rows.map((r) => toDto(r, request.user.id));
  });

  app.get("/publications/:id", { preHandler: requireRole("coach") }, async (request): Promise<PublicationDto> => {
    const { id } = idParamSchema.parse(request.params);
    const [row] = await db
      .select({ publication: publications, author: users })
      .from(publications)
      .innerJoin(users, eq(publications.authorId, users.id))
      .where(eq(publications.id, id));
    if (!row) throw new HttpError(404, "Publication introuvable");
    return toDto(row, request.user.id);
  });

  // Réservé aux coachs « contributeur » — vérifié côté serveur, pas seulement caché à l'écran
  app.post(
    "/publications",
    { preHandler: [requireRole("coach"), requireCoachCategory("contributeur")] },
    async (request, reply): Promise<PublicationDto> => {
      const input = createPublicationSchema.parse(request.body);
      const [author] = await db.select().from(users).where(eq(users.id, request.user.id));
      const [created] = await db
        .insert(publications)
        .values({ authorId: request.user.id, title: input.title, body: input.body })
        .returning();
      reply.code(201);
      return toDto({ publication: created, author }, request.user.id);
    },
  );

  // Retrait par son auteur uniquement — pas de modération admin en V1
  app.delete("/publications/:id", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const [publication] = await db.select().from(publications).where(eq(publications.id, id));
    if (!publication) throw new HttpError(404, "Publication introuvable");
    if (publication.authorId !== request.user.id) {
      throw new HttpError(403, "Cette publication ne vous appartient pas");
    }
    await db.delete(publications).where(eq(publications.id, id));
    return { ok: true };
  });
}
