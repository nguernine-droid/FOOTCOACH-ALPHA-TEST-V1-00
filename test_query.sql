-- Test 1: Vérifier que les annonces existent
SELECT id, coach_id, type, status, deleted_at, created_at 
FROM public.match_requests 
LIMIT 10;

-- Test 2: Vérifier si les profiles existent pour les coaches
SELECT p.id, p.first_name, p.club_id, c.id as club_id_check
FROM public.profiles p
LEFT JOIN public.clubs c ON p.club_id = c.id
LIMIT 10;

-- Test 3: Tester la jointure complète
SELECT mr.id, mr.coach_id, mr.status, mr.deleted_at,
       p.id as profile_id, p.first_name,
       c.id as club_id, c.name
FROM public.match_requests mr
LEFT JOIN public.profiles p ON mr.coach_id = p.id
LEFT JOIN public.clubs c ON p.club_id = c.id
LIMIT 10;

-- Test 4: Compter les annonces OPEN
SELECT COUNT(*) as total_open
FROM public.match_requests
WHERE status = 'OPEN' AND deleted_at IS NULL;
