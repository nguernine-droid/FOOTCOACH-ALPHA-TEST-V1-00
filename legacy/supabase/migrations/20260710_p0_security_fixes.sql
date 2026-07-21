-- ============================================================
-- CORRECTIFS SÉCURITÉ P0 — 10 juillet 2026
-- Corrige C1 à C5 + H5 de l'audit.
-- Idempotent : peut être rejoué sans risque.
-- À appliquer sur la base liée : supabase db push  (ou coller dans le SQL editor).
-- ============================================================

-- ------------------------------------------------------------
-- Helper : vérification de rôle admin côté serveur (source de vérité)
-- SECURITY DEFINER + search_path figé (H5).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ------------------------------------------------------------
-- C1 — Empêcher l'auto-promotion en administrateur.
-- La policy UPDATE "own profile" reste, mais un trigger BEFORE UPDATE
-- interdit tout changement de `role` sauf par un admin.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Modification du rôle non autorisée';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation();

-- ------------------------------------------------------------
-- C2 — soft_delete_profile : réservé au propriétaire ou à un admin.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.soft_delete_profile(profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  IF profile_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Suppression non autorisée';
  END IF;
  UPDATE public.profiles SET deleted_at = now() WHERE id = profile_id;
END;
$$;
REVOKE ALL ON FUNCTION public.soft_delete_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_profile(uuid) TO authenticated;

-- ------------------------------------------------------------
-- C3 — merge_clubs : réservé aux admins + search_path figé.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merge_clubs(p_keep uuid, p_delete uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_profiles int; v_events_h int; v_events_a int;
  v_children int; v_aliases  int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  IF p_keep = p_delete THEN RAISE EXCEPTION 'Les deux clubs sont identiques'; END IF;
  UPDATE public.profiles    SET club_id      = p_keep WHERE club_id      = p_delete; GET DIAGNOSTICS v_profiles = ROW_COUNT;
  UPDATE public.events      SET home_club_id = p_keep WHERE home_club_id = p_delete; GET DIAGNOSTICS v_events_h = ROW_COUNT;
  UPDATE public.events      SET away_club_id = p_keep WHERE away_club_id = p_delete; GET DIAGNOSTICS v_events_a = ROW_COUNT;
  UPDATE public.clubs       SET parent_club_id = p_keep WHERE parent_club_id = p_delete; GET DIAGNOSTICS v_children = ROW_COUNT;
  INSERT INTO public.club_aliases (club_id, alias)
    SELECT p_keep, alias FROM public.club_aliases WHERE club_id = p_delete
    ON CONFLICT (alias_normalized, COALESCE(city_normalized, '')) DO NOTHING;
  GET DIAGNOSTICS v_aliases = ROW_COUNT;
  PERFORM public.save_club_alias(p_keep, (SELECT name FROM public.clubs WHERE id = p_delete));
  DELETE FROM public.clubs WHERE id = p_delete;
  RETURN jsonb_build_object(
    'profiles_moved', v_profiles,
    'events_moved',   v_events_h + v_events_a,
    'children_moved', v_children,
    'aliases_moved',  v_aliases
  );
END;
$$;
REVOKE ALL ON FUNCTION public.merge_clubs(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_clubs(uuid, uuid) TO authenticated;

-- ------------------------------------------------------------
-- H5 — search_path figé sur les autres fonctions SECURITY DEFINER.
-- (Les corps restent identiques ; on ne modifie que l'attribut de config.)
-- ------------------------------------------------------------
ALTER FUNCTION public.handle_new_user()            SET search_path = pg_catalog, public;
ALTER FUNCTION public.notify_coach_on_response()   SET search_path = pg_catalog, public;
ALTER FUNCTION public.audit_changes()              SET search_path = pg_catalog, public;
ALTER FUNCTION public.save_club_alias(uuid, text)  SET search_path = pg_catalog, public;

-- ------------------------------------------------------------
-- C4 — Activer RLS sur les tables sensibles jusqu'ici non protégées.
-- ------------------------------------------------------------

-- MESSAGES : visibles/insérables uniquement par les 2 participants de l'annonce.
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.match_requests mr
    WHERE mr.id = match_request_id
      AND (mr.coach_id = auth.uid() OR mr.respondent_id = auth.uid())
  ));
CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.match_requests mr
      WHERE mr.id = match_request_id
        AND (mr.coach_id = auth.uid() OR mr.respondent_id = auth.uid())
    )
  );

-- AUDIT_LOG : lecture admin seulement ; aucune écriture cliente
-- (le trigger audit_changes est SECURITY DEFINER et contourne la RLS en tant que propriétaire).
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT USING (public.is_admin());

-- APP_CONFIG : lecture publique (min_version lu par VersionGuard), écriture admin seulement.
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read config" ON public.app_config;
DROP POLICY IF EXISTS "Admins manage config" ON public.app_config;
CREATE POLICY "Anyone can read config"
  ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Admins manage config"
  ON public.app_config FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- CLUB_ALIASES : lecture ouverte (recherche de clubs), écriture réservée aux admins.
-- (save_club_alias / merge_clubs sont SECURITY DEFINER et contournent la RLS.)
ALTER TABLE public.club_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read aliases" ON public.club_aliases;
DROP POLICY IF EXISTS "Admins manage aliases" ON public.club_aliases;
CREATE POLICY "Anyone can read aliases"
  ON public.club_aliases FOR SELECT USING (true);
CREATE POLICY "Admins manage aliases"
  ON public.club_aliases FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- C4/C5 — Retirer l'accès en lecture anonyme sur les données sensibles.
-- Le GRANT SELECT global à `anon` restait dangereux même avec la RLS ;
-- on le révoque explicitement sur les tables à risque (défense en profondeur).
-- ------------------------------------------------------------
REVOKE SELECT ON public.messages   FROM anon;
REVOKE SELECT ON public.audit_log  FROM anon;
REVOKE ALL    ON public.audit_log  FROM anon;

-- ------------------------------------------------------------
-- Recharger le cache de schéma PostgREST
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
