-- ==========================================
-- NEXUS OS : STRUCTURE PROPRE V4 (CORRIGÉE & COMPLÈTE)
-- ==========================================

-- 0. NETTOYAGE TOTAL
DROP TABLE IF EXISTS public.theme_usage_logs CASCADE;
DROP TABLE IF EXISTS public.feedbacks CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.family_links CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.match_requests CASCADE;
DROP TABLE IF EXISTS public.cv_items CASCADE;
DROP TABLE IF EXISTS public.club_players CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.clubs CASCADE;

-- 1. CRÉATION DES TABLES

CREATE TABLE public.clubs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  city text,
  stadium text,
  category text DEFAULT 'Mixte',
  logo_url text,
  latitude float8,
  longitude float8,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role text NOT NULL DEFAULT 'coach' CHECK (role in ('coach', 'player', 'parent', 'supporter')),
  first_name text,
  last_name text,
  nickname text,
  avatar_url text,
  bio text,
  phone text,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  coach_category text DEFAULT 'SÉNIORS',
  coach_level text DEFAULT 'D1',
  theme_preference text DEFAULT 'classic',
  coach_grade text DEFAULT 'RECUEILLEUR',
  coach_xp integer DEFAULT 0,
  coach_doctrine integer DEFAULT 0,
  coach_synergie integer DEFAULT 0,
  coach_influence integer DEFAULT 0,
  player_vitality integer DEFAULT 0,
  player_logic integer DEFAULT 0,
  player_spirit integer default 0,
  player_xp integer DEFAULT 0,
  player_lvl integer DEFAULT 1,
  parental_share_allowed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.club_players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'Actif' CHECK (status in ('Inactif', 'Actif', 'Toujours Partant')),
  poste text,
  niveau text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(club_id, player_id)
);

CREATE TABLE public.match_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text DEFAULT 'Match Amical' CHECK (type in ('Match Amical', 'Tournoi', 'Plateau', 'Stage', 'Événement')),
  category text NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  location text NOT NULL,
  comment text,
  status text DEFAULT 'OPEN' CHECK (status in ('OPEN', 'PENDING', 'MATCHED', 'EXPIRED', 'CANCELLED')),
  respondent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_request_id uuid REFERENCES public.match_requests(id) ON DELETE SET NULL,
  title text NOT NULL,
  type text DEFAULT 'Match',
  date date NOT NULL,
  time time NOT NULL,
  location text NOT NULL,
  home_club_id uuid REFERENCES public.clubs(id),
  away_club_id uuid REFERENCES public.clubs(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_request_id uuid REFERENCES public.match_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.feedbacks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text CHECK (type IN ('bug', 'amélioration', 'question')),
  content text NOT NULL,
  admin_reply text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. INSERTION CLUBS
INSERT INTO public.clubs (name, city, stadium, logo_url) VALUES
('AS Bessanaise', 'Béziers', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ASBessanaise'),
('AS la Grande Motte', 'La Grande-Motte', 'Stade Jean-Bouin', 'https://api.dicebear.com/7.x/identicon/svg?seed=ASGrandeMotte'),
('AS Lattoise', 'Lattes', 'Stade Roger Pibou', 'https://api.dicebear.com/7.x/identicon/svg?seed=ASLattoise'),
('FC de Sete', 'Sète', 'Stade Louis Michel', 'https://api.dicebear.com/7.x/identicon/svg?seed=FCSete'),
('Montpellier Herault SC', 'Montpellier', 'Stade de la Mosson', 'https://api.dicebear.com/7.x/identicon/svg?seed=MHSC');

-- 3. AUTO PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, theme_preference)
  VALUES (new.id, 'coach', 'classic');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. DISCORD WEBHOOK
CREATE OR REPLACE FUNCTION public.alerte_admin_feedback()
RETURNS TRIGGER AS $$ BEGIN
  PERFORM net.http_post(
      url := 'https://discord.com/api/webhooks/1507907126314401863/Cl4VdOpZOa-QiPWfALEU1grTAprP6MApmvvxXdpxfrFU6yHkyeemQUFAnZQ7PR8F6zlM',
      body := json_build_object(
        'embeds', ARRAY[json_build_object(
          'title', '🚨 NOUVEAU SIGNALEMENT : ' || UPPER(NEW.type),
          'description', NEW.content,
          'color', CASE WHEN NEW.type = 'bug' THEN 15548997 ELSE 3066993 END,
          'footer', json_build_object('text', 'ID: ' || NEW.user_id)
        )]
      )::text,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_on_feedback_inserted ON public.feedbacks;
CREATE TRIGGER tr_on_feedback_inserted AFTER INSERT ON public.feedbacks FOR EACH ROW EXECUTE FUNCTION public.alerte_admin_feedback();

-- 5. RLS & SYNC
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.profiles FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all" ON public.clubs FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.messages FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all" ON public.feedbacks FOR ALL USING (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, anon, service_role;
