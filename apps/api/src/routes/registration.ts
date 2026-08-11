
import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import {
  asCoachCategories,
  asMatchCategory,
  asMatchGender,
  createTeamSchema,
  idParamSchema,
  registerCoachSchema,
  updateTeamReferencesSchema,
  LEGAL_VERSION,
  type AuthResponseDto,
  type CoachTeamDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import { teamCoaches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole, signAccessToken } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { issueRefreshToken, toUserDto } from "./auth.js";
import { insertTeamWithCode } from "./club.js";
import { registerRateLimit } from "../lib/rateLimits.js";
import { cityCoords } from "../lib/cities.js";
import { generateCode } from "../lib/codes.js";
import { hashPassword } from "../lib/passwordHash.js";

/**
 * Un stade vide vaut « aucun ». Sans cette normalisation, un champ effacé
 * repartirait en base comme une chaîne vide, que le formulaire d'annonce
 * préremplirait ensuite par du vide en croyant tenir une référence.
 */
function stadiumOrNull(stadium: string | undefined): string | null {
  return stadium?.trim() ? stadium.trim() : null;
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
  // Inscription coach : crée le compte ET son équipe en une fois. Plafonnée par
  // adresse — sans cela la table des comptes se remplit sans effort.
  //
  // Le schéma exige les deux acceptations (`z.literal(true)`) : un corps de
  // requête sans elles n'atteint jamais l'insertion. C'est délibérément le
  // serveur qui tranche — une case cochée dans un navigateur ne prouve rien.
  app.post("/auth/register-coach", registerRateLimit, async (request, reply): Promise<AuthResponseDto> => {
    const input = registerCoachSchema.parse(request.body);
    await assertEmailFree(input.email);
    const passwordHash = await hashPassword(input.password);

    const user = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          passwordHash,
          role: "coach",
          nickname: input.nickname,
          firstName: input.firstName,
          lastName: input.lastName,
          // Horodatage pris ici, à l'insertion : c'est l'instant où le compte
          // naît de cette acceptation. La version dit à quel texte elle se
          // rapporte — sans elle, la trace ne prouverait rien de précis.
          termsAcceptedAt: new Date(),
          termsVersion: LEGAL_VERSION,
          coachLicenseNumber: input.licenseNumber?.trim() || null,
          // Dédoublonnées ici comme partout ailleurs : la colonne est un
          // tableau, rien en base n'empêcherait deux fois « joker ».
          coachCategories: asCoachCategories(input.categories),
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
          category: input.teamCategory,
          gender: input.teamGender,
          stadium: stadiumOrNull(input.teamStadium),
        })
        .returning();
      // Affectation coach ↔ équipe (source de vérité multi-équipes)
      await tx.insert(teamCoaches).values({ teamId: team.id, coachId: created.id, role: "principal" });
      return created;
    });

    reply.code(201);
    return buildAuthResponse(user);
  });

  // --- Espace coach ---
  //
  // V1 : l'application ne connaît que des coachs. La demande d'affiliation à un
  // club (POST /coach/affiliation) n'est plus exposée — l'espace club, ses
  // routes et ses tables restent en place, simplement hors d'atteinte. Voir
  // l'historique git pour la remettre en service.
  app.register((coach) => {
    coach.addHook("preHandler", requireAuth);
    coach.addHook("preHandler", requireRole("coach"));

    /**
     * Créer une équipe de plus. Un coach en encadre souvent deux (les U13 et
     * les U15) et n'en déclarait qu'une à l'inscription.
     *
     * L'équipe est la sienne, comme à l'inscription : en V1 aucune équipe
     * n'appartient à un club.
     */
    coach.post("/coach/teams", async (request, reply): Promise<CoachTeamDto> => {
      const input = createTeamSchema.parse(request.body);

      const duplicate = await db
        .select({ id: teams.id })
        .from(teams)
        .innerJoin(teamCoaches, eq(teamCoaches.teamId, teams.id))
        .where(and(eq(teamCoaches.coachId, request.user.id), eq(teams.name, input.name)));
      if (duplicate.length > 0) throw new HttpError(400, "Vous encadrez déjà une équipe de ce nom");

      const coords = cityCoords(input.city);
      const team = await insertTeamWithCode({
        name: input.name,
        city: input.city,
        coachId: request.user.id,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        category: input.category,
        gender: input.gender,
        stadium: stadiumOrNull(input.stadium),
      });
      await db.insert(teamCoaches).values({ teamId: team.id, coachId: request.user.id, role: "principal" });

      reply.code(201);
      return {
        id: team.id,
        name: team.name,
        city: team.city,
        role: "principal",
        category: asMatchCategory(team.category),
        gender: asMatchGender(team.gender),
        stadium: team.stadium,
      };
    });

    /**
     * Régler les références d'une équipe déjà créée — le seul moyen, pour les
     * équipes nées avant elles, d'alimenter le préremplissage des annonces.
     *
     * Réservé aux encadrants de l'équipe, adjoints compris : ce sont eux qui
     * publient en son nom, la référence les concerne tous. Le contrôle porte
     * sur team_coaches et non sur l'équipe active du jeton — un coach ne peut
     * donc régler que les équipes qu'il encadre réellement.
     */
    coach.patch("/coach/teams/:id", async (request): Promise<CoachTeamDto> => {
      const { id } = idParamSchema.parse(request.params);
      const input = updateTeamReferencesSchema.parse(request.body);

      const [assignment] = await db
        .select({ role: teamCoaches.role })
        .from(teamCoaches)
        .where(and(eq(teamCoaches.teamId, id), eq(teamCoaches.coachId, request.user.id)));
      if (!assignment) throw new HttpError(404, "Équipe introuvable parmi celles que vous encadrez");

      const [team] = await db
        .update(teams)
        .set({ category: input.category, gender: input.gender, stadium: stadiumOrNull(input.stadium) })
        .where(eq(teams.id, id))
        .returning();

      return {
        id: team.id,
        name: team.name,
        city: team.city,
        role: assignment.role,
        category: asMatchCategory(team.category),
        gender: asMatchGender(team.gender),
        stadium: team.stadium,
      };
    });
  });
}
