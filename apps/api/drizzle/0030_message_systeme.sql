CREATE TYPE "public"."message_kind" AS ENUM('coach', 'system');--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "sender_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "kind" "message_kind" DEFAULT 'coach' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "match_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Reprise de l'existant : chaque match déjà convenu s'inscrit dans le fil des
-- deux coachs, comme le fera désormais toute acceptation.
--
-- Sans cela, les fils ouverts par la migration précédente resteraient muets :
-- on y verrait un confrère, sans savoir de quelle rencontre il s'agit — ce qui
-- est précisément le problème que ce message résout quand deux coachs ont
-- plusieurs matchs ensemble, ou quand plusieurs annonces sont acceptées le
-- même jour.
--
-- Le texte reprend mot pour mot celui écrit par l'application (voir
-- `matchSystemMessage` dans routes/announcements.ts) : mois en toutes lettres,
-- lieu, puis qui reçoit qui.
WITH rep AS (
  SELECT DISTINCT ON (tc.team_id) tc.team_id, tc.coach_id
  FROM "team_coaches" tc
  ORDER BY tc.team_id, tc.role, tc.created_at
)
INSERT INTO "messages" ("conversation_id", "sender_id", "kind", "match_id", "body", "created_at")
SELECT
  c.id,
  NULL,
  'system',
  m.id,
  'Match confirmé — '
    || CASE a.category WHEN 'Veterans' THEN 'Vétérans' ELSE a.category END
    || CASE a.gender
         WHEN 'masculin' THEN ' Masculin'
         WHEN 'feminin' THEN ' Féminin'
         WHEN 'mixte' THEN ' Mixte'
         ELSE ''
       END
    || ' · ' || a.format
    || E'\n' || to_char(m.date, 'FMDD') || ' '
    || CASE extract(month from m.date)
         WHEN 1 THEN 'janvier' WHEN 2 THEN 'février' WHEN 3 THEN 'mars' WHEN 4 THEN 'avril'
         WHEN 5 THEN 'mai' WHEN 6 THEN 'juin' WHEN 7 THEN 'juillet' WHEN 8 THEN 'août'
         WHEN 9 THEN 'septembre' WHEN 10 THEN 'octobre' WHEN 11 THEN 'novembre' ELSE 'décembre'
       END
    || ' à ' || to_char(m.time, 'HH24:MI') || ' · ' || m.location
    || E'\n' || home.name || ' reçoit ' || away.name,
  m.created_at
FROM "matches" m
JOIN "match_announcements" a ON a.id = m.announcement_id
JOIN "teams" home ON home.id = m.home_team_id
JOIN "teams" away ON away.id = m.away_team_id
JOIN rep rh ON rh.team_id = m.home_team_id
JOIN rep ra ON ra.team_id = m.away_team_id
JOIN "conversations" c
  ON c.coach_a_id = LEAST(rh.coach_id, ra.coach_id)
 AND c.coach_b_id = GREATEST(rh.coach_id, ra.coach_id)
WHERE m.status <> 'cancelled' AND rh.coach_id <> ra.coach_id;--> statement-breakpoint
-- Le fil remonte à la date de son dernier message, quel qu'il soit
UPDATE "conversations" c
SET "last_message_at" = latest.at
FROM (SELECT conversation_id, MAX(created_at) AS at FROM "messages" GROUP BY conversation_id) latest
WHERE latest.conversation_id = c.id AND latest.at > c."last_message_at"
