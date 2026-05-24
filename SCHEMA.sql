-- ==========================================
-- TEAM NEXUS OS : MASTER STRUCTURE V6.0 (CLUBS RÉELS)
-- ==========================================

-- 0. NETTOYAGE TOTAL
DROP TABLE IF EXISTS public.match_events CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.match_requests CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.clubs CASCADE;
DROP TABLE IF EXISTS public.app_config CASCADE;
DROP TABLE IF EXISTS public.feed_posts CASCADE;

-- 1. CRÉATION DES TABLES (Identique au script précédent...)
CREATE TABLE public.app_config (key text PRIMARY KEY, value text NOT NULL);
CREATE TABLE public.clubs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  city text,
  stadium text,
  logo_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- (Toutes les autres tables créées ici...)

-- 2. INSERTION COMPLÈTE DES 50 CLUBS
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
