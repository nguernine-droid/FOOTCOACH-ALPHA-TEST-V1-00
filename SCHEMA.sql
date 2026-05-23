-- ==========================================
-- NEXUS OS : RESET TOTAL + CRÉATION STRUCTURE
-- (Sans Sécurité RLS pour faciliter le debug)
-- ==========================================

-- 1. PURGE : Suppression de tout ce qui existe
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.family_links CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.match_requests CASCADE;
DROP TABLE IF EXISTS public.cv_items CASCADE;
DROP TABLE IF EXISTS public.club_players CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.clubs CASCADE;


-- 2. CRÉATION : Structure brute des 9 tables

-- 1. TABLE DES CLUBS
create table public.clubs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text default 'U13',
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TABLE DES PROFILS
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null default 'coach' check (role in ('coach', 'player', 'parent', 'supporter')),
  first_name text,
  last_name text,
  avatar_url text,
  club_id uuid references public.clubs(id) on delete set null,

  -- THÈME
  theme_preference text default 'classic',

  -- Coach Stats RPG
  coach_grade text default 'RECUEILLEUR',
  coach_xp integer default 0,
  coach_doctrine integer default 0,
  coach_synergie integer default 0,
  coach_influence integer default 0,

  -- Joueur Stats RPG
  player_vitality integer default 0,
  player_logic integer default 0,
  player_spirit integer default 0,
  player_xp integer default 0,
  player_lvl integer default 1,
  parental_share_allowed boolean default false,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TABLE DES JOUEURS DANS UN CLUB
create table public.club_players (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references public.clubs(id) on delete cascade not null,
  player_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'Actif' check (status in ('Inactif', 'Actif', 'Toujours Partant')),
  poste text,
  niveau text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TABLE CV COACH
create table public.cv_items (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('Diplôme', 'Expérience', 'Philosophie')),
  title text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. TABLE DES ANNONCES RADAR
create table public.match_requests (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references public.profiles(id) on delete cascade not null,
  type text default 'Match Amical' check (type in ('Match Amical', 'Tournoi', 'Plateau', 'Stage', 'Événement')),
  category text not null,
  date date not null,
  time time not null,
  location text not null,
  comment text,
  status text default 'OPEN' check (status in ('OPEN', 'PENDING', 'MATCHED', 'EXPIRED')),
  respondent_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. TABLE DES ÉVÉNEMENTS
create table public.events (
  id uuid default gen_random_uuid() primary key,
  match_request_id uuid references public.match_requests(id) on delete set null,
  title text not null,
  type text default 'Match',
  date date not null,
  time time not null,
  location text not null,
  home_club_id uuid references public.clubs(id),
  away_club_id uuid references public.clubs(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. TABLE DES NOTIFICATIONS
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  payload jsonb,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. TABLE DES LIENS FAMILIAUX
create table public.family_links (
  id uuid default gen_random_uuid() primary key,
  parent_or_supporter_id uuid references public.profiles(id) on delete cascade not null,
  player_id uuid references public.profiles(id) on delete cascade not null,
  relationship text default 'Parent',
  can_view_card boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. TABLE DES PAIEMENTS
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references public.clubs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  amount text not null,
  status text default 'orange' check (status in ('orange', 'green')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
