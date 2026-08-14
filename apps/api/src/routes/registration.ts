
import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import {
  asCoachCategories,
  asDivisionLevel,
  asMatchCategory,
  asMatchGender,
  createTeamSchema,
  idParamSchema,
  registerCoachSchema,
  updateTeamReferencesSchema,
  LEGAL_VERSION,
  type AuthResponseDto,
  type CoachTeamDto,
  type TeamCoachRole,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import { teamCoaches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole, signAccessToken } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { issueRefreshToken, teamLogoUrlOf, toUserDto } from "./auth.js";
import { insertTeamWithCode } from "./club.js";
import { clubById, resolveClubChoice, toDeclaredClubDto } from "../lib/declaredClubs.js";
import { storeUploadedImage, removeUploadedImage } from "../lib/imageUpload.js";
import { MAX_AVATAR_BYTES } from "../lib/images.js";
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

/**
 * L'équipe et le rôle du coach dessus, ou 404. Le contrôle porte sur
 * `team_coaches` (adjoints compris) : c'est l'affectation réelle qui fait
 * autorité, pas l'équipe active portée par le jeton.
 */
async function teamOfCoachOr404(teamId: string, coachId: string) {
  const [row] = await db
    .select({ team: teams, role: teamCoaches.role })
    .from(teamCoaches)
    .innerJoin(teams, eq(teams.id, teamCoaches.teamId))
    .where(and(eq(teamCoaches.teamId, teamId), eq(teamCoaches.coachId, coachId)));
  if (!row) throw new HttpError(404, "Équipe introuvable parmi celles que vous encadrez");
  return row;
}

/** Une équipe telle que le coach la voit — avec son écusson et son club */
async function toCoachTeamDto(
  team: typeof teams.$inferSelect,
  role: TeamCoachRole,
): Promise<CoachTeamDto> {
  const club = team.clubId ? await clubById(team.clubId) : null;
  return {
    id: team.id,
    name: team.name,
    city: team.city,
    role,
    category: asMatchCategory(team.category),
    gender: asMatchGender(team.gender),
    stadium: team.stadium,
    level: asDivisionLevel(team.level),
    logoUrl: teamLogoUrlOf(team.logoPath),
    club: club ? toDeclaredClubDto(club) : null,
  };
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

    /**
     * Le club, s'il y en a un : celui que le coach a reconnu dans la question de
     * doublon, ou celui qu'il vient de nommer. Résolu AVANT la transaction —
     * c'est une lecture large (comparaison de noms) et une insertion qui n'a
     * rien à faire dans la transaction de création du compte : un club déclaré
     * reste utile même si l'inscription échoue ensuite sur l'email.
     */
    const club = await resolveClubChoice(input);

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
          // Le stade du club prend le relais quand l'équipe n'en donne pas :
          // c'est la même adresse, et la resaisir n'apprendrait rien.
          stadium: stadiumOrNull(input.teamStadium) ?? club?.stadium ?? null,
          clubId: club?.id ?? null,
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
     * L'équipe reste la sienne. Elle peut porter un CLUB — celui que le coach
     * a reconnu ou déclaré (voir `resolveClubChoice`) — sans que cela change
     * quoi que ce soit à qui l'encadre : un club déclaré n'a pas de compte, il
     * ne gère rien, il nomme.
     */
    coach.post("/coach/teams", async (request, reply): Promise<CoachTeamDto> => {
      const input = createTeamSchema.parse(request.body);

      const duplicate = await db
        .select({ id: teams.id })
        .from(teams)
        .innerJoin(teamCoaches, eq(teamCoaches.teamId, teams.id))
        .where(and(eq(teamCoaches.coachId, request.user.id), eq(teams.name, input.name)));
      if (duplicate.length > 0) throw new HttpError(400, "Vous encadrez déjà une équipe de ce nom");

      const club = await resolveClubChoice(input);
      const coords = cityCoords(input.city);
      const team = await insertTeamWithCode({
        name: input.name,
        city: input.city,
        coachId: request.user.id,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        category: input.category,
        gender: input.gender,
        // À défaut de stade sur l'équipe, celui du club : c'est la même adresse
        stadium: stadiumOrNull(input.stadium) ?? club?.stadium ?? null,
        level: input.level ?? null,
        clubId: club?.id ?? null,
      });
      await db.insert(teamCoaches).values({ teamId: team.id, coachId: request.user.id, role: "principal" });

      reply.code(201);
      return toCoachTeamDto(team, "principal");
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

      const assignment = await teamOfCoachOr404(id, request.user.id);

      const [team] = await db
        .update(teams)
        .set({
          category: input.category,
          gender: input.gender,
          stadium: stadiumOrNull(input.stadium),
          level: input.level ?? null,
        })
        .where(eq(teams.id, id))
        .returning();

      return toCoachTeamDto(team, assignment.role);
    });

    /**
     * L'écusson de l'équipe — le « logo du club » du point de vue du coach.
     *
     * Réservé aux encadrants de l'équipe, adjoints compris, comme le réglage
     * des références : ce sont eux qui publient en son nom. Le contrôle porte
     * sur `team_coaches` et non sur l'équipe active du jeton.
     */
    coach.post("/coach/teams/:id/logo", async (request): Promise<CoachTeamDto> => {
      const { id } = idParamSchema.parse(request.params);
      const { team, role } = await teamOfCoachOr404(id, request.user.id);
      const file = await request.file({ limits: { fileSize: MAX_AVATAR_BYTES, files: 1 } });
      const fileName = await storeUploadedImage(file, `equipe-${id}`, "2 Mo");

      const [updated] = await db
        .update(teams)
        .set({ logoPath: fileName })
        .where(eq(teams.id, id))
        .returning();
      // L'ancien fichier part APRÈS que le nouveau est référencé : l'inverse
      // laisserait une équipe sans écusson si l'écriture échouait entre les deux.
      await removeUploadedImage(team.logoPath);
      return toCoachTeamDto(updated, role);
    });

    coach.delete("/coach/teams/:id/logo", async (request): Promise<CoachTeamDto> => {
      const { id } = idParamSchema.parse(request.params);
      const { team, role } = await teamOfCoachOr404(id, request.user.id);
      const [updated] = await db
        .update(teams)
        .set({ logoPath: null })
        .where(eq(teams.id, id))
        .returning();
      await removeUploadedImage(team.logoPath);
      return toCoachTeamDto(updated, role);
    });
  });
}
