-- ==========================================
-- TEAM NEXUS OS : MASTER STRUCTURE V8.0 (STABLE)
-- ==========================================

-- 0. NETTOYAGE TOTAL
DROP TABLE IF EXISTS public.match_events CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.match_requests CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.clubs CASCADE;
DROP TABLE IF EXISTS public.app_config CASCADE;
DROP TABLE IF EXISTS public.feed_posts CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;

-- 1. CONFIGURATION
CREATE TABLE public.app_config (key text PRIMARY KEY, value text NOT NULL);
INSERT INTO public.app_config (key, value) VALUES ('min_version', '1.0.207');

-- 2. CLUBS
CREATE TABLE public.clubs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  city text,
  stadium text,
  category text DEFAULT 'Mixte',
  logo_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. PROFILS
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role text DEFAULT 'coach',
  first_name text,
  last_name text,
  nickname text,
  bio text,
  phone text,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  coach_category text DEFAULT 'SÉNIORS',
  coach_level text DEFAULT 'D1',
  theme_preference text DEFAULT 'classic',
  avatar_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. ÉVÉNEMENTS (LA VERSION COMPLÈTE)
CREATE TABLE public.events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_request_id uuid REFERENCES public.match_requests(id) ON DELETE SET NULL, -- LIEN RADAR
  title text NOT NULL,
  type text DEFAULT 'Match',
  date date NOT NULL,
  time time NOT NULL,
  location text,
  home_club_id uuid REFERENCES public.clubs(id),
  away_club_id uuid REFERENCES public.clubs(id),
  home_score integer DEFAULT 0,
  away_score integer DEFAULT 0,
  status text DEFAULT 'scheduled',
  created_at timestamp with time zone DEFAULT now()
);

-- 5. MATCH EVENTS (Live Score)
CREATE TABLE public.match_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  team text,
  content text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- 6. MATCH REQUESTS (Radar)
CREATE TABLE public.match_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text DEFAULT 'Match Amical',
  category text,
  date date,
  time time,
  location text,
  status text DEFAULT 'OPEN',
  respondent_id uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 7. MESSAGES & FEED
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_request_id uuid REFERENCES public.match_requests(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.feed_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 8. FONCTION SCORE
CREATE OR REPLACE FUNCTION increment_score(row_id uuid, column_name text)
RETURNS void AS $$ BEGIN
  EXECUTE format('UPDATE events SET %I = %I + 1 WHERE id = %L', column_name, column_name, row_id);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. AUTO-PROFIL TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$ BEGIN
  INSERT INTO public.profiles (id, role) VALUES (new.id, 'coach'); RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. REALTIME & PERMISSIONS
ALTER PUBLICATION supabase_realtime ADD TABLE match_events, events, feed_posts, match_requests, messages;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, anon, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, anon, service_role;
