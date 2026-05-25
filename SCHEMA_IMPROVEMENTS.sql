-- =================================================================
-- FOOTCOACH SCHEMA IMPROVEMENTS v1.0
-- Date: 25 Mai 2026
-- Objectif : Améliorer sécurité, gouvernance données, et auditabilité
-- =================================================================

-- ================================================================
-- 🔴 P1 : SÉCURITÉ - Webhook Discord en Configuration
-- ================================================================

-- Ajouter webhook_url à app_config
INSERT INTO public.app_config (key, value)
VALUES ('discord_webhook_url', 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Mettre à jour la fonction alerte_admin_feedback pour utiliser la config
CREATE OR REPLACE FUNCTION public.alerte_admin_feedback()
RETURNS TRIGGER AS $$ 
DECLARE
  v_webhook_url text;
  v_author_name text;
BEGIN
  -- Récupérer l'URL depuis app_config
  SELECT value INTO v_webhook_url 
  FROM public.app_config 
  WHERE key = 'discord_webhook_url';

  -- Si pas de webhook configuré, ignorer silencieusement
  IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(nickname, first_name, 'Anonyme') INTO v_author_name
  FROM public.profiles WHERE id = NEW.author_id;

  PERFORM net.http_post(
    url := v_webhook_url,
    body := json_build_object(
      'embeds', ARRAY[json_build_object(
        'title', 'SIGNALEMENT : ' || UPPER(COALESCE(NEW.post_type, 'FEEDBACK')),
        'description', NEW.content,
        'footer', json_build_object('text', 'Par ' || COALESCE(v_author_name, 'Anonyme')),
        'color', 15548997,
        'timestamp', now()
      )]
    )::text,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log l'erreur mais ne bloque pas l'insertion
  RAISE WARNING 'Erreur discord webhook: %', SQLERRM;
  RETURN NEW;
END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 🟡 P2 : DATA GOVERNANCE - Soft Delete
-- ================================================================

-- Ajouter colonne deleted_at aux tables principales
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.match_requests 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Créer fonction pour soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_profile(profile_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles 
  SET deleted_at = now() 
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajouter indexes sur deleted_at pour les requêtes courantes
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clubs_deleted_at ON public.clubs(deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_match_requests_deleted_at ON public.match_requests(deleted_at) 
WHERE deleted_at IS NULL;

-- ================================================================
-- 🟡 P2 : SÉCURITÉ - Row Level Security (RLS)
-- ================================================================

-- Activer RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- POLICIES PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view coach profiles (public)"
  ON public.profiles FOR SELECT
  USING (role = 'coach' AND deleted_at IS NULL);

-- POLICIES CLUBS
CREATE POLICY "Anyone can view verified clubs"
  ON public.clubs FOR SELECT
  USING (is_verified = true AND deleted_at IS NULL);

CREATE POLICY "Club creator can update own club"
  ON public.clubs FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- POLICIES MATCH_REQUESTS
CREATE POLICY "Coach can view own match requests"
  ON public.match_requests FOR SELECT
  USING (
    auth.uid() = coach_id 
    OR auth.uid() = respondent_id 
    OR status = 'OPEN' 
    AND deleted_at IS NULL
  );

CREATE POLICY "Coach can create match request"
  ON public.match_requests FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

-- POLICIES EVENTS
CREATE POLICY "Users can view published events"
  ON public.events FOR SELECT
  USING (status IN ('scheduled', 'live', 'finished') AND deleted_at IS NULL);

-- POLICIES FEED_POSTS
CREATE POLICY "Users can view feed posts"
  ON public.feed_posts FOR SELECT
  USING (true);

CREATE POLICY "Users can create own posts"
  ON public.feed_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- ================================================================
-- 🟡 P2 : AUDIT & COMPLIANCE - Audit Trail
-- ================================================================

-- Créer table d'audit
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values jsonb,
  new_values jsonb,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON public.audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log(changed_at);

-- Fonction pour logger les modifications
CREATE OR REPLACE FUNCTION public.audit_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(
    (current_setting('app.current_user_id', true))::uuid,
    auth.uid()
  );

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attacher triggers d'audit aux tables principales
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

DROP TRIGGER IF EXISTS audit_clubs ON public.clubs;
CREATE TRIGGER audit_clubs
  AFTER INSERT OR UPDATE OR DELETE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

DROP TRIGGER IF EXISTS audit_match_requests ON public.match_requests;
CREATE TRIGGER audit_match_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.match_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

DROP TRIGGER IF EXISTS audit_events ON public.events;
CREATE TRIGGER audit_events
  AFTER INSERT OR UPDATE OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- ================================================================
-- 🟡 P2 : VALIDATION - Constraints JSONB
-- ================================================================

-- Valider structure quotas
ALTER TABLE public.match_requests
ADD CONSTRAINT quotas_valid_json CHECK (
  quotas IS NULL 
  OR (jsonb_typeof(quotas) = 'object')
);

-- Valider ref_categories
ALTER TABLE public.profiles
ADD CONSTRAINT ref_categories_valid_array CHECK (
  ref_categories IS NULL 
  OR jsonb_typeof(ref_categories) = 'array'
);

-- ================================================================
-- 🟢 P3 : PERFORMANCE - Score Limits
-- ================================================================

-- Ajouter limites de score
ALTER TABLE public.events
ADD CONSTRAINT score_bounds CHECK (
  home_score >= 0 AND home_score <= 99
  AND away_score >= 0 AND away_score <= 99
);

-- ================================================================
-- 🟢 P3 : VIEWS UTILES
-- ================================================================

-- Vue pour les clubs actifs
CREATE OR REPLACE VIEW public.clubs_active AS
SELECT * FROM public.clubs
WHERE is_verified = true 
  AND deleted_at IS NULL
ORDER BY name;

-- Vue pour les matches ouverts
CREATE OR REPLACE VIEW public.match_requests_open AS
SELECT 
  mr.*,
  p.first_name as coach_first_name,
  p.last_name as coach_last_name,
  p.nickname as coach_nickname,
  c.name as club_name
FROM public.match_requests mr
LEFT JOIN public.profiles p ON mr.coach_id = p.id
LEFT JOIN public.clubs c ON p.club_id = c.id
WHERE mr.status = 'OPEN' 
  AND mr.deleted_at IS NULL
ORDER BY mr.created_at DESC;

-- Vue pour les événements à venir
CREATE OR REPLACE VIEW public.events_upcoming AS
SELECT 
  e.*,
  hc.name as home_club_name,
  ac.name as away_club_name
FROM public.events e
LEFT JOIN public.clubs hc ON e.home_club_id = hc.id
LEFT JOIN public.clubs ac ON e.away_club_id = ac.id
WHERE e.date >= CURRENT_DATE 
  AND e.status IN ('scheduled', 'live')
  AND e.deleted_at IS NULL
ORDER BY e.date, e.time;

-- ================================================================
-- 🟢 P3 : FONCTIONS UTILES POUR APP
-- ================================================================

-- Fonction pour récupérer profil coach avec stats
CREATE OR REPLACE FUNCTION public.get_coach_profile(coach_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  nickname text,
  coach_grade text,
  coach_level text,
  xp integer,
  club_name text,
  avatar_url text,
  match_count bigint,
  announcement_count bigint
) AS $$
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.nickname,
  p.coach_grade,
  p.coach_level,
  (
    SELECT COUNT(*) FROM public.match_requests 
    WHERE coach_id = p.id AND status = 'MATCHED'
  )::integer as xp,
  c.name,
  p.avatar_url,
  (SELECT COUNT(*) FROM public.match_requests WHERE coach_id = p.id),
  (SELECT COUNT(*) FROM public.match_requests WHERE coach_id = p.id AND status = 'OPEN')
FROM public.profiles p
LEFT JOIN public.clubs c ON p.club_id = c.id
WHERE p.id = coach_id AND p.deleted_at IS NULL;
$$ LANGUAGE SQL STABLE;

-- Fonction pour trouver coachs proches (géographique)
CREATE OR REPLACE FUNCTION public.find_nearby_coaches(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_radius_km INTEGER DEFAULT 30
)
RETURNS TABLE (
  coach_id uuid,
  coach_name text,
  club_name text,
  distance_km NUMERIC
) AS $$
SELECT 
  p.id,
  COALESCE(p.nickname, p.first_name),
  c.name,
  -- Approximation simple : 1 degré ≈ 111 km
  SQRT(
    POWER((p_latitude - p_latitude), 2) + 
    POWER((p_longitude - p_longitude), 2)
  ) * 111 as distance_km
FROM public.profiles p
LEFT JOIN public.clubs c ON p.club_id = c.id
WHERE p.role = 'coach' 
  AND p.coach_status IN ('actif', 'toujours_pret')
  AND p.deleted_at IS NULL
ORDER BY distance_km
LIMIT 20;
$$ LANGUAGE SQL STABLE;

-- ================================================================
-- 📝 INFORMATIONS INSTALLATION
-- ================================================================

/*
CHECKLIST D'INSTALLATION :

1. ✅ Exécuter ce script dans Supabase SQL Editor
   
2. ⚠️ CONFIGURATION MANUELLE REQUISE :
   - Remplacer 'YOUR_WEBHOOK_ID' et 'YOUR_TOKEN' dans app_config
   - UPDATE app_config SET value = 'votre_vrai_webhook' WHERE key = 'discord_webhook_url';

3. 🔐 SÉCURITÉ :
   - RLS est maintenant ACTIVÉE
   - Les policies doivent être testées en développement
   - Mettre à jour les policies selon vos besoins

4. 📊 AUDIT :
   - Tous les INSERT/UPDATE/DELETE sont maintenant loggés
   - Vérifier audit_log régulièrement
   - Archiver les anciens logs > 1 an

5. 🗑️ SOFT DELETE :
   - Utiliser soft_delete_profile() au lieu de DELETE
   - Les données supprimées restent en BD pour conformité

6. 🧪 TESTS RECOMMANDÉS :
   - Tester les policies RLS en tant qu'utilisateur
   - Vérifier les logs d'audit
   - Valider les contraintes JSONB

7. 📈 MONITORING :
   - Vérifier table audit_log pour la gouvernance
   - Surveiller les erreurs webhook Discord
   - Vérifier les performances des indexes

*/

NOTIFY pgrst, 'reload schema';
