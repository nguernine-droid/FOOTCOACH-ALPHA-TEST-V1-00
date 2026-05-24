-- ==========================================
-- NEXUS OS : STRUCTURE PROPRE V2.2 (CLUBS UPDATE)
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

  -- Info Basiques
  first_name text,
  last_name text,
  nickname text,
  avatar_url text,
  bio text,
  phone text,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,

  -- Champs Coach
  coach_category text DEFAULT 'SÉNIORS',
  coach_level text DEFAULT 'D1',

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

-- 2. INSERTION DES 50 CLUBS MIS À JOUR
INSERT INTO public.clubs (name, city, stadium, logo_url) VALUES
('AS Bessanaise', 'Béziers', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ASBessanaise'),
('AS Canetoise', 'Cannes-et-Clare', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ASCanetoise'),
('AS de Valros', 'Valros', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ASValros'),
('AS Fabreguoise', 'Fabrègues', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ASFabreguoise'),
('AS Garosud', 'Montpellier', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ASGarosud'),
('AS la Grande Motte', 'La Grande-Motte', 'Stade Jean-Bouin', 'https://api.dicebear.com/7.x/identicon/svg?seed=ASGrandeMotte'),
('AS Lattoise', 'Lattes', 'Stade Roger Pibou', 'https://api.dicebear.com/7.x/identicon/svg?seed=ASLattoise'),
('AS Lodeve', 'Lodève', 'Stade Louis Blanc', 'https://api.dicebear.com/7.x/identicon/svg?seed=ASLodeve'),
('AS Murvielloise', 'Murviel-lès-Béziers', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ASMurvielloise'),
('AS Pignan', 'Pignan', 'Stade Michel Boulle', 'https://api.dicebear.com/7.x/identicon/svg?seed=ASPignan'),
('AS Puimissonnaise 42/63', 'Puimisson', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ASPuimissonnaise'),
('AS Roujan Caux', 'Roujan', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ASRoujanCaux'),
('AS Saint Martin Montpellier', 'Montpellier', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ASSaintMartin'),
('AS Valerguoise', 'Saint-Jean-de-Védas', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ASValerguoise'),
('AS Vicoise', 'Vic-la-Gardiole', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ASVicoise'),
('Avenir Sportif Beziers', 'Béziers', 'Stade de la Méditerranée', 'https://api.dicebear.com/7.x/identicon/svg?seed=ASBeziers'),
('Baillargues St Bres', 'Baillargues', 'Stade Municipal', 'https://api.dicebear.com/7.x/identicon/svg?seed=Baillargues'),
('Beziers FC', 'Béziers', 'Stade de la Libération', 'https://api.dicebear.com/7.x/identicon/svg?seed=BeziersFC'),
('Bouzigues Loupian AC', 'Bouzigues', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=Bouzigues'),
('Castelnau le Cres FC', 'Castelnau-le-Lez', 'Stade Yves Du Manoir', 'https://api.dicebear.com/7.x/identicon/svg?seed=Castelnau'),
('Enserune FC', 'Nissan-lez-Enserune', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=Enserune'),
('ES Nezignanaise', 'Nézignan-l''Évêque', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ESNezignanaise'),
('ET.S Nezignanaise', 'Nézignan-l''Évêque', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=ETS'),
('FC Boujan Mediterranee', 'Boujan-sur-Libron', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=FCBoujan'),
('FC Clermontais', 'Clermont-l''Hérault', 'Stade René Bousquet', 'https://api.dicebear.com/7.x/identicon/svg?seed=FCClermontais'),
('FC de Sete', 'Sète', 'Stade Louis Michel', 'https://api.dicebear.com/7.x/identicon/svg?seed=FCSete'),
('FC Laverune', 'Lavérune', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=FCLaverune'),
('FC Lespignan Vendres', 'Lespignan', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=FCLespignan'),
('FC Pas du Loup', 'Montpellier', 'Stade Pas du Loup', 'https://api.dicebear.com/7.x/identicon/svg?seed=FCPasduLoup'),
('FC Sauvian', 'Sauvian', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=FCSauvian'),
('FC Sussargues', 'Sussargues', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=FCSussargues'),
('FC Vailhauquois', 'Vailhauquès', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=FCVailhauquois'),
('FO Sud Herault', 'Béziers', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=FOSudHerault'),
('Gallia C. Lunellois', 'Lunel', 'Stade Jean Moulin', 'https://api.dicebear.com/7.x/identicon/svg?seed=GalliaLunel'),
('Jacou Clapiers FA', 'Jacou', 'Stade Charles Fages', 'https://api.dicebear.com/7.x/identicon/svg?seed=Jacou'),
('Juvignac FC', 'Juvignac', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=Juvignac'),
('Meze Stade FC', 'Mèze', 'Stade Louis Aragon', 'https://api.dicebear.com/7.x/identicon/svg?seed=MezeStade'),
('Montpellier Herault SC', 'Montpellier', 'Stade de la Mosson', 'https://api.dicebear.com/7.x/identicon/svg?seed=MHSC'),
('Montpeyroux FC', 'Montpeyroux', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=Montpeyroux'),
('O. F. Thezan Saint-genies', 'Thézan-lès-Béziers', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=Thezan'),
('RC St Georges D''orques', 'Saint-Georges-d''Orques', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=RCStGeorges'),
('RC Vedasien', 'Le Vigan', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=RCVedasien'),
('RCo. Agathois', 'Agde', 'Stade Louis Sanguin', 'https://api.dicebear.com/7.x/identicon/svg?seed=RCOAgde'),
('Sete Olympique FC', 'Sète', 'Stade Jules Ladoumègue', 'https://api.dicebear.com/7.x/identicon/svg?seed=SeteOlympique'),
('US Beziers', 'Béziers', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=USBeziers'),
('US Grabelloise Omnisports', 'Grabels', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=USGrabels'),
('US Lunel', 'Lunel', 'Stade Michel Bibard', 'https://api.dicebear.com/7.x/identicon/svg?seed=USLunel'),
('US Mauguio Carnon', 'Mauguio', 'Stade Michel Bibard', 'https://api.dicebear.com/7.x/identicon/svg?seed=USMauguio'),
('US Villeneuvoise', 'Villeneuve-lès-Béziers', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=USVilleneuve'),
('Vic la Gardiole FC', 'Vic-la-Gardiole', NULL, 'https://api.dicebear.com/7.x/identicon/svg?seed=VicGardiole');

-- 3. SÉCURITÉ & REALTIME
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.profiles FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for clubs" ON public.clubs FOR ALL USING (true);
CREATE POLICY "Allow all for messages" ON public.messages FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all for feedbacks" ON public.feedbacks FOR ALL USING (auth.uid() IS NOT NULL);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
