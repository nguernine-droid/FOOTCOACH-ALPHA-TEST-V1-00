-- ==========================================
-- NEXUS OS : STRUCTURE PROPRE V2 (CORRIGÉE)
-- ==========================================

-- 0. NETTOYAGE TOTAL (Efface les données existantes)
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

-- 1. CRÉATION DES TABLES AVEC BONNES RELATIONS

-- Table Clubs
CREATE TABLE public.clubs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text DEFAULT 'U13',
  logo_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table Profils (Users)
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role text NOT NULL DEFAULT 'coach' CHECK (role in ('coach', 'player', 'parent', 'supporter')),

  -- Info Basiques
  first_name text,
  last_name text,
  nickname text,
  avatar_url text,
  bio text,
  phone text,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,

  -- Thème
  theme_preference text DEFAULT 'classic',

  -- Stats RPG (COACH)
  coach_grade text DEFAULT 'RECUEILLEUR',
  coach_xp integer DEFAULT 0,
  coach_doctrine integer DEFAULT 0,
  coach_synergie integer DEFAULT 0,
  coach_influence integer DEFAULT 0,

  -- Stats RPG (JOUEUR)
  player_vitality integer DEFAULT 0,
  player_logic integer DEFAULT 0,
  player_spirit integer DEFAULT 0,
  player_xp integer DEFAULT 0,
  player_lvl integer DEFAULT 1,
  parental_share_allowed boolean DEFAULT false,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table Joueurs dans un Club
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

-- Table CV Coach
CREATE TABLE public.cv_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type in ('Diplôme', 'Expérience', 'Philosophie')),
  title text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table Match Requests (Radar)
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

-- Table Events (Calendrier)
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

-- Table Messages (Chat)
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_request_id uuid REFERENCES public.match_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table Feedbacks
CREATE TABLE public.feedbacks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text CHECK (type IN ('bug', 'amélioration', 'question')),
  content text NOT NULL,
  admin_reply text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. INSERTION DES CLUBS (Exemples)
INSERT INTO public.clubs (name, category, logo_url) VALUES
('AS Bessanaise', 'Mixte', 'https://api.dicebear.com/7.x/identicon/svg?seed=ASBessanaise'),
('FC de Sete', 'Mixte', 'https://api.dicebear.com/7.x/identicon/svg?seed=FCSete'),
('Montpellier Herault SC', 'Mixte', 'https://api.dicebear.com/7.x/identicon/svg?seed=MHSC');

-- 3. SÉCURITÉ & REALTIME
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.profiles FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for clubs" ON public.clubs FOR ALL USING (true);
CREATE POLICY "Allow all for messages" ON public.messages FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for feedbacks" ON public.feedbacks FOR ALL USING (auth.uid() IS NOT NULL);

-- Sécurisation Realtime
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- 4. WEBHOOK DISCORD RÉEL
CREATE EXTENSION IF NOT EXISTS "pg_net";

CREATE OR REPLACE FUNCTION public.alerte_admin_feedback()
RETURNS TRIGGER AS $$ BEGIN
  PERFORM
    net.http_post(
      url := 'https://discord.com/api/webhooks/1507782001091022868/iuP7yhqy4DEF6wtCxg5JSBKsjoJATiECQSPx2z3jBdPG7vzICDFKF7VhQGK2J7CqnyIN',
      body := json_build_object(
        'embeds', ARRAY[json_build_object(
          'title', '🚀 NOUVEAU SIGNALEMENT : ' || UPPER(NEW.type),
          'description', NEW.content,
          'color', CASE WHEN NEW.type = 'bug' THEN 15548997 ELSE 3066993 END,
          'footer', json_build_object('text', 'ID Utilisateur: ' || NEW.user_id)
        )]
      )::text,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_on_feedback_inserted ON public.feedbacks;
CREATE TRIGGER tr_on_feedback_inserted
AFTER INSERT ON public.feedbacks
FOR EACH ROW
EXECUTE FUNCTION public.alerte_admin_feedback();
