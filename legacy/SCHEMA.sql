-- ==========================================
-- FOOTCOACH : MASTER STRUCTURE V13.0
-- Protocole "Zéro Perte" — jamais de DROP TABLE
-- Dernière mise à jour : 28 Mai 2026
-- ==========================================

-- ==========================================
-- 0. EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ==========================================
-- 1. FONCTIONS UTILITAIRES
-- ==========================================

-- Normalisation des noms de clubs : minuscules + sans accents + sans ponctuation
CREATE OR REPLACE FUNCTION public.normalize_club_name(n text)
RETURNS text AS $$
  SELECT REGEXP_REPLACE(LOWER(UNACCENT(TRIM(n))), '[^a-z0-9 ]', '', 'g');
$$ LANGUAGE SQL IMMUTABLE;

-- ==========================================
-- 2. TABLES PRINCIPALES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.app_config (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clubs (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name             text NOT NULL,
  city             text,
  stadium          text,
  category         text DEFAULT 'Mixte',
  logo_url         text,
  is_verified      boolean DEFAULT false,
  parent_club_id   uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  created_by       uuid,  -- FK vers profiles ajoutée après
  latitude         numeric,
  longitude        numeric,
  deleted_at       timestamptz DEFAULT NULL,
  created_at       timestamptz DEFAULT now(),
  -- Colonne normalisée calculée automatiquement (anti-doublon)
  name_normalized  text GENERATED ALWAYS AS (normalize_club_name(name)) STORED
);

-- Index unique sur le nom normalisé (anti-doublon insensible casse/accents/ponctuation)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clubs_name_normalized_unique
  ON public.clubs (name_normalized);

-- Index trigram pour recherche floue
CREATE INDEX IF NOT EXISTS idx_clubs_name_trgm
  ON public.clubs USING gin(name gin_trgm_ops);

-- Index performances
CREATE INDEX IF NOT EXISTS idx_clubs_parent      ON public.clubs(parent_club_id);
CREATE INDEX IF NOT EXISTS idx_clubs_active      ON public.clubs(deleted_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.profiles (
  id               uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role             text DEFAULT 'coach' CHECK (role IN ('coach', 'player', 'parent', 'supporter', 'admin')),
  first_name       text,
  last_name        text,
  nickname         text,
  bio              text,
  phone            text,
  club_id          uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  coach_category   text DEFAULT 'SÉNIORS',
  coach_level      text DEFAULT 'D1',
  coach_grade      text,
  coach_status     text DEFAULT 'actif' CHECK (coach_status IN ('actif', 'toujours_pret', 'inactif')),
  xp               integer DEFAULT 0,
  ref_categories   jsonb DEFAULT NULL,
  latitude         numeric,
  longitude        numeric,
  theme_preference text DEFAULT 'classic',
  avatar_url       text,
  deleted_at       timestamptz DEFAULT NULL,
  created_at       timestamptz DEFAULT now()
);

-- FK clubs.created_by → profiles
ALTER TABLE public.clubs
  ADD CONSTRAINT IF NOT EXISTS fk_clubs_created_by
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(deleted_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.match_requests (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id            uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type                text NOT NULL DEFAULT 'Match Amical' CHECK (type IN ('Match Amical', 'Tournoi', 'Plateau')),
  category            text,
  desired_level       text DEFAULT 'Espoir',
  availability_window text,
  date                date,
  time                time,
  city                text,
  stadium             text,
  location            text,
  travel_preference   text DEFAULT 'home' CHECK (travel_preference IN ('home', 'away', 'both')),
  radius_km           integer,
  quotas              jsonb,
  comment             text,
  status              text DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'POSTMATCHED', 'MATCHED', 'EXPIRED', 'CANCELLED')),
  respondent_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  venue_club_id       uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  coach_a_confirmed   boolean DEFAULT false,
  coach_b_confirmed   boolean DEFAULT false,
  deleted_at          timestamptz DEFAULT NULL,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_requests_active    ON public.match_requests(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_match_requests_coach     ON public.match_requests(coach_id);
CREATE INDEX IF NOT EXISTS idx_match_requests_status    ON public.match_requests(status);

CREATE TABLE IF NOT EXISTS public.events (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_request_id uuid REFERENCES public.match_requests(id) ON DELETE SET NULL,
  title            text NOT NULL,
  type             text NOT NULL CHECK (type IN ('training', 'match', 'tournament', 'plateau', 'convocation')),
  date             date NOT NULL,
  time             time NOT NULL,
  location         text NOT NULL,
  city             text,
  stadium_name     text,
  home_club_id     uuid REFERENCES public.clubs(id),
  away_club_id     uuid REFERENCES public.clubs(id),
  home_score       integer DEFAULT 0,
  away_score       integer DEFAULT 0,
  status           text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
  tournament_config jsonb,
  training_theme   text,
  description      text,
  created_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at       timestamptz DEFAULT NULL,
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT score_bounds CHECK (home_score >= 0 AND home_score <= 99 AND away_score >= 0 AND away_score <= 99)
);

CREATE INDEX IF NOT EXISTS idx_events_active     ON public.events(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_date       ON public.events(date);

CREATE TABLE IF NOT EXISTS public.feed_posts (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_type  text DEFAULT 'post',
  content    text,
  deleted_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_request_id uuid REFERENCES public.match_requests(id) ON DELETE CASCADE,
  sender_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  text             text NOT NULL,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_match_request ON public.messages(match_request_id);

CREATE TABLE IF NOT EXISTS public.event_attendees (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status     text NOT NULL DEFAULT 'maybe' CHECK (status IN ('present', 'absent', 'maybe')),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (event_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event   ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_profile ON public.event_attendees(profile_id);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_aliases (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id          uuid REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  alias            text NOT NULL,
  alias_normalized text GENERATED ALWAYS AS (normalize_club_name(alias)) STORED,
  city_normalized  text,
  created_at       timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_club_aliases_city_unique
  ON public.club_aliases (alias_normalized, COALESCE(city_normalized, ''));
CREATE INDEX IF NOT EXISTS idx_club_aliases_club_id ON public.club_aliases(club_id);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name  text NOT NULL,
  record_id   uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values  jsonb,
  new_values  jsonb,
  changed_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table      ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record     ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON public.audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log(changed_at);

-- ==========================================
-- 3. TRIGGERS & FONCTIONS MÉTIER
-- ==========================================

-- Création automatique du profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, theme_preference)
  VALUES (new.id, 'coach', 'classic')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-vérification club quand ville + stade sont renseignés
CREATE OR REPLACE FUNCTION public.auto_verify_club()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_verified := (
    NEW.city    IS NOT NULL AND TRIM(NEW.city)    != '' AND
    NEW.stadium IS NOT NULL AND TRIM(NEW.stadium) != ''
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_verify_club ON public.clubs;
CREATE TRIGGER trg_auto_verify_club
  BEFORE INSERT OR UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.auto_verify_club();

-- Notification push coach A quand coach B répond
CREATE OR REPLACE FUNCTION public.notify_coach_on_response()
RETURNS TRIGGER AS $$
DECLARE
  v_coach_name text;
BEGIN
  IF NEW.status = 'POSTMATCHED' AND OLD.status = 'OPEN' THEN
    SELECT COALESCE(nickname, first_name, 'Un coach')
    INTO v_coach_name FROM public.profiles WHERE id = NEW.respondent_id;

    PERFORM net.http_post(
      url     := current_setting('app.supabase_url', true) || '/functions/v1/notify-coach',
      body    := json_build_object(
        'profile_id', NEW.coach_id,
        'title',      '⚡ Nouvelle proposition !',
        'body',       v_coach_name || ' est intéressé par votre annonce.',
        'url',        '/radar'
      )::text,
      headers := json_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', true)
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS on_match_request_response ON public.match_requests;
CREATE TRIGGER on_match_request_response
  AFTER UPDATE ON public.match_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_coach_on_response();

-- Audit trail
CREATE OR REPLACE FUNCTION public.audit_changes()
RETURNS TRIGGER AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := COALESCE((current_setting('app.current_user_id', true))::uuid, auth.uid());
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_values, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), v_user_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), v_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), v_user_id);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS audit_profiles       ON public.profiles;
DROP TRIGGER IF EXISTS audit_clubs          ON public.clubs;
DROP TRIGGER IF EXISTS audit_match_requests ON public.match_requests;
DROP TRIGGER IF EXISTS audit_events         ON public.events;

CREATE TRIGGER audit_profiles       AFTER INSERT OR UPDATE OR DELETE ON public.profiles       FOR EACH ROW EXECUTE FUNCTION public.audit_changes();
CREATE TRIGGER audit_clubs          AFTER INSERT OR UPDATE OR DELETE ON public.clubs          FOR EACH ROW EXECUTE FUNCTION public.audit_changes();
CREATE TRIGGER audit_match_requests AFTER INSERT OR UPDATE OR DELETE ON public.match_requests FOR EACH ROW EXECUTE FUNCTION public.audit_changes();
CREATE TRIGGER audit_events         AFTER INSERT OR UPDATE OR DELETE ON public.events         FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- ==========================================
-- 3bis. SÉCURITÉ : rôle admin & anti-escalade (correctifs P0)
-- ==========================================

-- Source de vérité serveur pour le rôle admin (utilisée par les policies RLS).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- C1 : interdit tout changement de `role` sauf par un admin.
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
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

-- ==========================================
-- 4. FONCTIONS CLUBS (anti-doublon)
-- ==========================================

-- Sauvegarder un alias avec contexte ville
CREATE OR REPLACE FUNCTION public.save_club_alias(p_club_id uuid, p_alias text)
RETURNS void AS $$
DECLARE v_city text;
BEGIN
  SELECT COALESCE(normalize_club_name(city), '')
  INTO v_city FROM public.clubs WHERE id = p_club_id;
  INSERT INTO public.club_aliases (club_id, alias, city_normalized)
  VALUES (p_club_id, TRIM(p_alias), v_city)
  ON CONFLICT (alias_normalized, COALESCE(city_normalized, '')) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Recherche floue avec trigram + alias + parent
DROP FUNCTION IF EXISTS public.search_clubs_fuzzy(text, integer);
CREATE OR REPLACE FUNCTION public.search_clubs_fuzzy(p_query text, p_limit int DEFAULT 8)
RETURNS TABLE(
  id uuid, name text, city text, logo_url text, similarity real,
  parent_id uuid, parent_name text, is_verified boolean
) AS $$
  SELECT DISTINCT ON (c.id)
    c.id, c.name, c.city, c.logo_url,
    GREATEST(
      similarity(c.name, p_query),
      similarity(c.name_normalized, normalize_club_name(p_query)),
      COALESCE(MAX(similarity(a.alias_normalized, normalize_club_name(p_query)))
               OVER (PARTITION BY c.id), 0)
    ) AS similarity,
    c.parent_club_id,
    p.name AS parent_name,
    c.is_verified
  FROM public.clubs c
  LEFT JOIN public.clubs p        ON c.parent_club_id = p.id
  LEFT JOIN public.club_aliases a ON a.club_id = c.id
  WHERE c.name_normalized  % normalize_club_name(p_query)
     OR c.name             % p_query
     OR c.name             ILIKE '%' || p_query || '%'
     OR a.alias_normalized % normalize_club_name(p_query)
  ORDER BY c.id, c.is_verified DESC, similarity DESC
  LIMIT p_limit;
$$ LANGUAGE SQL STABLE;

-- Détecter le club parent probable d'un nom (ex: "AS Bobigny U13" → "AS Bobigny")
CREATE OR REPLACE FUNCTION public.find_parent_club(p_name text)
RETURNS TABLE(id uuid, name text, city text) AS $$
  WITH cleaned AS (
    SELECT REGEXP_REPLACE(
      normalize_club_name(p_name),
      '\y(u6|u7|u8|u9|u10|u11|u12|u13|u14|u15|u16|u17|u18|u19|u20|u21|seniors|veteranes|feminines|b|c|d|reserve)\y',
      '', 'gi'
    ) AS base_name
  )
  SELECT c.id, c.name, c.city
  FROM public.clubs c, cleaned
  WHERE c.parent_club_id IS NULL
    AND c.name_normalized % TRIM(cleaned.base_name)
  ORDER BY similarity(c.name_normalized, TRIM(cleaned.base_name)) DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Clubs dans un rayon GPS
CREATE OR REPLACE FUNCTION public.find_nearby_clubs(
  p_lat numeric, p_lon numeric, p_radius_km numeric DEFAULT 1
)
RETURNS TABLE(id uuid, name text, city text, distance_km numeric) AS $$
  SELECT id, name, city,
    ROUND(SQRT(
      POWER((p_lat - latitude)  * 111.0, 2) +
      POWER((p_lon - longitude) * 111.0 * COS(RADIANS(p_lat)), 2)
    )::numeric, 2) AS distance_km
  FROM public.clubs
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    AND SQRT(
      POWER((p_lat - latitude)  * 111.0, 2) +
      POWER((p_lon - longitude) * 111.0 * COS(RADIANS(p_lat)), 2)
    ) <= p_radius_km
  ORDER BY distance_km;
$$ LANGUAGE SQL STABLE;

-- Trouver les doublons probables
CREATE OR REPLACE FUNCTION public.find_duplicate_clubs(p_threshold real DEFAULT 0.5)
RETURNS TABLE(
  club_a_id uuid, club_a_name text, club_a_city text,
  club_b_id uuid, club_b_name text, club_b_city text,
  score real
) AS $$
  SELECT
    a.id, a.name, a.city,
    b.id, b.name, b.city,
    similarity(a.name_normalized, b.name_normalized) AS score
  FROM public.clubs a
  JOIN public.clubs b
    ON a.id < b.id
    AND similarity(a.name_normalized, b.name_normalized) >= p_threshold
  ORDER BY similarity(a.name_normalized, b.name_normalized) DESC;
$$ LANGUAGE SQL STABLE;

-- Fusionner deux clubs (admin)
CREATE OR REPLACE FUNCTION public.merge_clubs(p_keep uuid, p_delete uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_profiles int; v_events_h int; v_events_a int;
  v_children int; v_aliases  int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
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

-- Soft delete profil : propriétaire ou admin uniquement (C2)
CREATE OR REPLACE FUNCTION public.soft_delete_profile(profile_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF profile_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Suppression non autorisée';
  END IF;
  UPDATE public.profiles SET deleted_at = now() WHERE id = profile_id;
END;
$$;
REVOKE ALL ON FUNCTION public.soft_delete_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_profile(uuid) TO authenticated;

-- ==========================================
-- 5. VUES
-- ==========================================

CREATE OR REPLACE VIEW public.clubs_active AS
SELECT * FROM public.clubs WHERE is_verified = true AND deleted_at IS NULL ORDER BY name;

CREATE OR REPLACE VIEW public.clubs_with_parent AS
SELECT c.*, p.name AS parent_name, p.city AS parent_city, p.logo_url AS parent_logo,
       p.latitude AS parent_latitude, p.longitude AS parent_longitude
FROM public.clubs c LEFT JOIN public.clubs p ON c.parent_club_id = p.id;

CREATE OR REPLACE VIEW public.match_requests_open AS
SELECT mr.*, p.first_name AS coach_first_name, p.last_name AS coach_last_name,
       p.nickname AS coach_nickname, c.name AS club_name
FROM public.match_requests mr
LEFT JOIN public.profiles p ON mr.coach_id = p.id
LEFT JOIN public.clubs c    ON p.club_id = c.id
WHERE mr.status = 'OPEN' AND mr.deleted_at IS NULL
ORDER BY mr.created_at DESC;

CREATE OR REPLACE VIEW public.events_upcoming AS
SELECT e.*, hc.name AS home_club_name, ac.name AS away_club_name
FROM public.events e
LEFT JOIN public.clubs hc ON e.home_club_id = hc.id
LEFT JOIN public.clubs ac ON e.away_club_id = ac.id
WHERE e.date >= CURRENT_DATE AND e.status IN ('scheduled', 'live') AND e.deleted_at IS NULL
ORDER BY e.date, e.time;

-- ==========================================
-- 6. CRON JOBS
-- ==========================================

-- Expirer automatiquement les annonces OPEN dont la date est dépassée (3h du matin)
SELECT cron.schedule(
  'expire-match-requests',
  '0 3 * * *',
  $$
    UPDATE public.match_requests
    SET status = 'EXPIRED'
    WHERE status = 'OPEN' AND date < CURRENT_DATE AND deleted_at IS NULL;
  $$
);

-- Rappels push 2h avant chaque événement (toutes les 15 min)
SELECT cron.schedule(
  'event-reminders',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      current_setting('app.supabase_url') || '/functions/v1/send-event-reminders',
      '{}',
      'application/json'
    );
  $$
);

-- ==========================================
-- 7. ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_aliases   ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "Users can view profiles"      ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view profiles"
  ON public.profiles FOR SELECT USING (auth.uid() = id OR (deleted_at IS NULL AND auth.uid() != id));
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- CLUBS
DROP POLICY IF EXISTS "Anyone can view verified clubs"    ON public.clubs;
DROP POLICY IF EXISTS "Club creator can update own club"  ON public.clubs;
DROP POLICY IF EXISTS "Authenticated can insert club"     ON public.clubs;

CREATE POLICY "Anyone can view verified clubs"
  ON public.clubs FOR SELECT USING (is_verified = true AND deleted_at IS NULL);
CREATE POLICY "Club creator can update own club"
  ON public.clubs FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated can insert club"
  ON public.clubs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- MATCH_REQUESTS
DROP POLICY IF EXISTS "Coach can view own match requests" ON public.match_requests;
DROP POLICY IF EXISTS "Coach can create match request"    ON public.match_requests;
DROP POLICY IF EXISTS "Coach can update own match request" ON public.match_requests;
DROP POLICY IF EXISTS "Anyone can view open match requests" ON public.match_requests;
DROP POLICY IF EXISTS "Coach can view own or responded match requests" ON public.match_requests;

-- Policy 1: Anyone can see OPEN requests (public feed)
CREATE POLICY "Anyone can view open match requests"
  ON public.match_requests FOR SELECT
  USING (status = 'OPEN' AND deleted_at IS NULL);

-- Policy 2: Coach can see his own NON-OPEN requests + responses (excludes OPEN to avoid duplication with Policy 1)
CREATE POLICY "Coach can view own or responded match requests"
  ON public.match_requests FOR SELECT
  USING ((auth.uid() = coach_id AND status != 'OPEN') OR auth.uid() = respondent_id);

CREATE POLICY "Coach can create match request"
  ON public.match_requests FOR INSERT WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "Coach can update own match request"
  ON public.match_requests FOR UPDATE USING (auth.uid() = coach_id OR auth.uid() = respondent_id);

-- EVENTS
DROP POLICY IF EXISTS "Users can view published events" ON public.events;
DROP POLICY IF EXISTS "Authenticated can create events" ON public.events;

CREATE POLICY "Users can view published events"
  ON public.events FOR SELECT USING (status IN ('scheduled', 'live', 'finished') AND deleted_at IS NULL);
CREATE POLICY "Authenticated can create events"
  ON public.events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- FEED_POSTS
DROP POLICY IF EXISTS "Users can view feed posts"   ON public.feed_posts;
DROP POLICY IF EXISTS "Users can create own posts"  ON public.feed_posts;

CREATE POLICY "Users can view feed posts"  ON public.feed_posts FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Users can create own posts" ON public.feed_posts FOR INSERT WITH CHECK (auth.uid() = author_id);

-- EVENT_ATTENDEES
DROP POLICY IF EXISTS "Coach can view attendees" ON public.event_attendees;
DROP POLICY IF EXISTS "User can upsert own attendance" ON public.event_attendees;
DROP POLICY IF EXISTS "User can update own attendance" ON public.event_attendees;

CREATE POLICY "Coach can view attendees"
  ON public.event_attendees FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.created_by = auth.uid() AND e.created_by != profile_id) OR (profile_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.created_by = auth.uid())));
CREATE POLICY "User can upsert own attendance"
  ON public.event_attendees FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "User can update own attendance"
  ON public.event_attendees FOR UPDATE USING (profile_id = auth.uid());

-- PUSH_SUBSCRIPTIONS
DROP POLICY IF EXISTS "Own subscription" ON public.push_subscriptions;
CREATE POLICY "Own subscription"
  ON public.push_subscriptions USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- MESSAGES (C4) : réservés aux 2 participants de l'annonce
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.match_requests mr
                 WHERE mr.id = match_request_id
                   AND (mr.coach_id = auth.uid() OR mr.respondent_id = auth.uid())));
CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.match_requests mr
                WHERE mr.id = match_request_id
                  AND (mr.coach_id = auth.uid() OR mr.respondent_id = auth.uid())));

-- AUDIT_LOG (C4) : lecture admin seulement ; écriture via trigger SECURITY DEFINER
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT USING (public.is_admin());

-- APP_CONFIG (C4) : lecture publique, écriture admin
DROP POLICY IF EXISTS "Anyone can read config" ON public.app_config;
DROP POLICY IF EXISTS "Admins manage config"  ON public.app_config;
CREATE POLICY "Anyone can read config"
  ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Admins manage config"
  ON public.app_config FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- CLUB_ALIASES (C4) : lecture ouverte, écriture admin (ou fonctions SECURITY DEFINER)
DROP POLICY IF EXISTS "Anyone can read aliases" ON public.club_aliases;
DROP POLICY IF EXISTS "Admins manage aliases"  ON public.club_aliases;
CREATE POLICY "Anyone can read aliases"
  ON public.club_aliases FOR SELECT USING (true);
CREATE POLICY "Admins manage aliases"
  ON public.club_aliases FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ==========================================
-- 8. PERMISSIONS
-- ==========================================

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL    ON ALL TABLES IN SCHEMA public TO authenticated, service_role, postgres;
GRANT ALL    ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;

-- Défense en profondeur : aucune donnée sensible lisible par anon (même si la RLS filtre déjà)
REVOKE ALL ON public.messages  FROM anon;
REVOKE ALL ON public.audit_log FROM anon;

-- ==========================================
-- RELOAD POSTGREST
-- ==========================================
NOTIFY pgrst, 'reload schema';
