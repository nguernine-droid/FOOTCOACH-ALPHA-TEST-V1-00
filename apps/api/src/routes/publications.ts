import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { createPublicationSchema, idParamSchema, type PublicationDto } from "@footcoach/shared";
import { db } from "../db/client.js";
import { publications, teamCoaches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { avatarUrlOf } from "./auth.js";

/**
 * L'équipe qui situe chaque auteur : celle qu'il encadre en principal, à défaut
 * la plus ancienne — la même règle que la messagerie et les relations.
 */
async function teamNamesOf(coachIds: string[]): Promise<Map<string, string>> {
  const byCoach = new Map<string, string>();
  if (coachIds.length === 0) return byCoach;
  const rows = await db
    .select({ coachId: teamCoaches.coachId, name: teams.name })
    .from(teamCoaches)
    .innerJoin(teams, eq(teams.id, teamCoaches.teamId))
    .where(inArray(teamCoaches.coachId, coachIds))
    .orderBy(asc(teamCoaches.role), asc(teamCoaches.createdAt));
  for (const row of rows) if (!byCoach.has(row.coachId)) byCoach.set(row.coachId, row.name);
  return byCoach;
}

/**
 * Publications des contributeurs — le panneau d'affichage du secteur.
 *
 * Tous les coachs lisent ; seuls ceux qui portent la casquette `contributeur`
 * écrivent. La casquette se vérifie à CHAQUE rédaction, côté serveur : elle se
 * coche et se décoche librement au profil, un client qui aurait gardé un
 * formulaire ouvert ne doit pas publier avec une casquette rendue.
 */
export function publicationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("coach"));

  /**
   * Le fil, du plus récent au plus ancien. Les cent derniers billets : un
   * panneau d'affichage montre ce qui est d'actualité, pas ses archives — et
   * personne ne fait défiler cent billets de district.
   */
  app.get("/publications", async (request): Promise<PublicationDto[]> => {
    const me = request.user.id;
    const rows = await db
      .select({
        id: publications.id,
        body: publications.body,
        createdAt: publications.createdAt,
        authorId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarPath: users.avatarPath,
      })
      .from(publications)
      .innerJoin(users, eq(users.id, publications.authorId))
      .orderBy(desc(publications.createdAt))
      .limit(100);

    const teamNames = await teamNamesOf([...new Set(rows.map((r) => r.authorId))]);
    return rows.map((r) => ({
      id: r.id,
      author: {
        id: r.authorId,
        firstName: r.firstName,
        lastName: r.lastName,
        avatarUrl: avatarUrlOf(r.avatarPath),
      },
      teamName: teamNames.get(r.authorId) ?? null,
      body: r.body,
      mine: r.authorId === me,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  app.post("/publications", async (request, reply): Promise<PublicationDto> => {
    const { body } = createPublicationSchema.parse(request.body);
    const me = request.user.id;

    const [author] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        avatarPath: users.avatarPath,
        coachCategories: users.coachCategories,
      })
      .from(users)
      .where(eq(users.id, me));
    if (!author?.coachCategories?.includes("contributeur")) {
      throw new HttpError(403, "Seuls les coachs contributeurs peuvent publier");
    }

    const [created] = await db.insert(publications).values({ authorId: me, body }).returning();
    const teamNames = await teamNamesOf([me]);

    reply.code(201);
    return {
      id: created.id,
      author: {
        id: me,
        firstName: author.firstName,
        lastName: author.lastName,
        avatarUrl: avatarUrlOf(author.avatarPath),
      },
      teamName: teamNames.get(me) ?? null,
      body: created.body,
      mine: true,
      createdAt: created.createdAt.toISOString(),
    };
  });

  /**
   * Chacun n'efface que ses propres billets — y compris un ancien contributeur
   * qui a rendu la casquette : ce qu'on a écrit reste à soi.
   */
  app.delete("/publications/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const deleted = await db
      .delete(publications)
      .where(and(eq(publications.id, id), eq(publications.authorId, request.user.id)))
      .returning({ id: publications.id });
    if (deleted.length === 0) throw new HttpError(404, "Publication introuvable");
    return { ok: true };
  });
}
