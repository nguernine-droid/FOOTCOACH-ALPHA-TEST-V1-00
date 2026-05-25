-- ==========================================
-- TEAM NEXUS OS : MASTER STRUCTURE V12.2 (SAFE MIGRATION)
-- ==========================================
-- Ce fichier utilise le protocole "Zéro Perte"
-- Les tables existantes ne sont jamais supprimées.
-- ==========================================

-- 1. TABLES DE BASE (SI NON EXISTANTES)
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  city text,
  stadium text,
  category text DEFAULT 'Mixte',
  logo_url text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role text DEFAULT 'coach' CHECK (role IN ('coach', 'player', 'parent', 'supporter', 'admin')),
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

-- 2. MATCH REQUESTS (Radar)
CREATE TABLE IF NOT EXISTS public.match_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'Match Amical' CHECK (type IN ('Match Amical', 'Tournoi', 'Plateau')),
  category text,
  desired_level text DEFAULT 'Espoir',
  availability_window text,
  date date,
  time time,
  city text,
  stadium text,
  location text,
  travel_preference text DEFAULT 'home' CHECK (travel_preference IN ('home', 'away', 'both')),
  radius_km integer,
  quotas jsonb,
  comment text,
  status text DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PENDING', 'MATCHED', 'CANCELLED')),
  respondent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. ÉVÉNEMENTS (LA VERSION COMPLÈTE)
CREATE TABLE IF NOT EXISTS public.events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_request_id uuid REFERENCES public.match_requests(id) ON DELETE SET NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('training', 'match', 'tournament', 'plateau', 'convocation')),
  date date NOT NULL,
  time time NOT NULL,
  location text NOT NULL,
  city text,
  stadium_name text,
  home_club_id uuid REFERENCES public.clubs(id),
  away_club_id uuid REFERENCES public.clubs(id),
  home_score integer DEFAULT 0,
  away_score integer DEFAULT 0,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
  tournament_config jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. FONCTIONS ET TRIGGERS (REMPLACEMENT SÉCURISÉ)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, theme_preference) VALUES (new.id, 'coach', 'classic');
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. REALTIME & PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, anon, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, anon, service_role;
