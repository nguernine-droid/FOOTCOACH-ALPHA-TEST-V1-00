-- Efface tout ce que la simulation a créé : les comptes sim*@simul.local,
-- leurs équipes, et les données qui en dépendent. Rien d'autre n'est touché —
-- les comptes de démonstration et leurs annonces restent en place.
--
--   docker compose exec -T postgres psql -U footcoach -d footcoach \
--     -f - < tools/simulation/cleanup.sql
--
-- L'ordre suit les clés étrangères : les équipes avant les comptes (teams
-- référence users.coach_id), et tout ce qui pointe vers une équipe avant elle.

BEGIN;

CREATE TEMP TABLE sim_users AS
  SELECT id FROM users WHERE email LIKE 'sim%@simul.local';

-- Une équipe de simulation est portée par un compte de simulation, que ce soit
-- par la colonne historique teams.coach_id ou par l'affectation team_coaches.
CREATE TEMP TABLE sim_teams AS
  SELECT DISTINCT t.id FROM teams t WHERE t.coach_id IN (SELECT id FROM sim_users)
  UNION
  SELECT DISTINCT tc.team_id FROM team_coaches tc WHERE tc.coach_id IN (SELECT id FROM sim_users);

DELETE FROM matches
  WHERE home_team_id IN (SELECT id FROM sim_teams)
     OR away_team_id IN (SELECT id FROM sim_teams);

-- Les propositions faites par une équipe de simulation sur l'annonce d'un
-- autre compte : elles ne tomberaient pas avec les annonces supprimées.
DELETE FROM announcement_responses WHERE team_id IN (SELECT id FROM sim_teams);
DELETE FROM match_announcements WHERE team_id IN (SELECT id FROM sim_teams);
DELETE FROM team_events WHERE team_id IN (SELECT id FROM sim_teams);

DELETE FROM push_subscriptions WHERE user_id IN (SELECT id FROM sim_users);
DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM sim_users);
DELETE FROM login_events WHERE user_id IN (SELECT id FROM sim_users);
DELETE FROM password_reset_requests WHERE user_id IN (SELECT id FROM sim_users);
DELETE FROM coach_relations
  WHERE coach_id IN (SELECT id FROM sim_users)
     OR related_coach_id IN (SELECT id FROM sim_users);
DELETE FROM club_affiliation_requests WHERE coach_id IN (SELECT id FROM sim_users);

DELETE FROM team_coaches
  WHERE coach_id IN (SELECT id FROM sim_users)
     OR team_id IN (SELECT id FROM sim_teams);
DELETE FROM teams WHERE id IN (SELECT id FROM sim_teams);
DELETE FROM users WHERE id IN (SELECT id FROM sim_users);

COMMIT;

-- Ce qui reste doit être le jeu de démonstration seul
SELECT (SELECT count(*) FROM users) AS comptes,
       (SELECT count(*) FROM teams) AS equipes,
       (SELECT count(*) FROM match_announcements) AS annonces,
       (SELECT count(*) FROM matches) AS matchs;
