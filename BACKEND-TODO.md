# BACKEND — À faire (Supabase)

Ce fichier liste les changements **base de données / storage** à appliquer sur Supabase
pour finaliser des fonctionnalités déjà codées côté client (le client fonctionne dès que
ces éléments sont en place). À exécuter dans l'éditeur SQL Supabase ou via `supabase db push`.

Date : 2026-07-20

---

## 1. Upload du logo de club (bug « je n'arrive pas à uploader mon logo »)

### Cause
La policy RLS d'`UPDATE` sur `public.clubs` n'autorise que le **créateur** du club :

```sql
CREATE POLICY "Club creator can update own club"
  ON public.clubs FOR UPDATE
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
```

Quand un coach **rejoint un club existant** (créé par quelqu'un d'autre), l'upload du fichier
dans le bucket `club-logos` réussit, mais le `UPDATE clubs SET logo_url = ...` touche **0 ligne
sans erreur SQL** → le logo n'apparaît jamais.

Côté client, c'est désormais détecté (message clair via `.select()` dans `coach-view.tsx`),
mais il faut décider de la règle métier définitive.

### Option A — Rôle « gestionnaire de club » (recommandé)
Créer une table de gestionnaires et autoriser l'UPDATE aux gestionnaires :

```sql
CREATE TABLE IF NOT EXISTS public.club_managers (
  club_id    uuid REFERENCES public.clubs(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (club_id, profile_id)
);
ALTER TABLE public.club_managers ENABLE ROW LEVEL SECURITY;

-- Le créateur est gestionnaire par défaut (à insérer à la création du club).

DROP POLICY IF EXISTS "Club creator can update own club" ON public.clubs;
CREATE POLICY "Club managers can update club"
  ON public.clubs FOR UPDATE
  USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.club_managers m
               WHERE m.club_id = clubs.id AND m.profile_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.club_managers m
               WHERE m.club_id = clubs.id AND m.profile_id = auth.uid())
  );
```

### Option B — Tout membre du club peut mettre à jour (plus permissif)
```sql
DROP POLICY IF EXISTS "Club creator can update own club" ON public.clubs;
CREATE POLICY "Club members can update club"
  ON public.clubs FOR UPDATE
  USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = auth.uid() AND p.club_id = clubs.id)
  )
  WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = auth.uid() AND p.club_id = clubs.id)
  );
```

### Vérifier aussi la SELECT policy
Actuellement : `USING (is_verified = true AND deleted_at IS NULL)`.
Un club fraîchement créé (non vérifié) peut être invisible pour son propre créateur.
Ajouter au besoin :
```sql
CREATE POLICY "Creator/members can view their club"
  ON public.clubs FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.club_id = clubs.id)
  );
```

### Storage bucket `club-logos`
Vérifier que le bucket existe et que les policies d'`INSERT`/`UPDATE` autorisent les
utilisateurs authentifiés (sinon l'upload du fichier échoue avant même le `UPDATE clubs`).

---

## 2. Poster une photo dans le Fil (`/feed`)

Le composer du fil permet désormais de joindre une image (UI + upload codés côté client).
Il manque **le bucket de stockage** ; la persistance de l'URL utilise un **pont temporaire**
(voir plus bas).

### 2.1 — Créer le bucket `feed-media` (REQUIS pour que l'envoi d'image fonctionne)
Dans Supabase → Storage → New bucket : `feed-media`, **public** (lecture publique).

Policies (exemple : lecture publique, écriture par utilisateurs authentifiés dans leur dossier) :
```sql
-- Lecture publique
CREATE POLICY "Public read feed-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'feed-media');

-- Upload par utilisateur authentifié
CREATE POLICY "Auth upload feed-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'feed-media' AND auth.uid() IS NOT NULL);

-- (optionnel) mise à jour / remplacement par le propriétaire
CREATE POLICY "Auth update own feed-media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'feed-media' AND auth.uid() = owner);
```
> Le nom du bucket est défini dans le code : `FEED_BUCKET = 'feed-media'`
> (`src/app/(main)/feed/page.tsx`). Le chemin utilisé est `posts/<userId>-<timestamp>.<ext>`.

### 2.2 — (Recommandé, plus tard) Colonne `image_url` dédiée
Aujourd'hui, l'URL de l'image est encodée dans `content` via un marqueur `::img::`
(fonctions `encodeContent` / `decodeContent` dans `feed/page.tsx`). C'est un **pont**
pour éviter une migration DB immédiate. Migration propre à prévoir :

```sql
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS image_url text;
```
Puis, côté client :
- insérer `{ content: text, image_url: imageUrl }` au lieu d'encoder dans `content` ;
- lire `post.image_url` au lieu de `decodeContent(post.content)` ;
- (data migration) parser les anciens posts contenant `::img::` pour remplir `image_url`.

---

## 3. Rappel — Buckets Storage utilisés par l'app
| Bucket          | Usage                          | Statut |
|-----------------|--------------------------------|--------|
| `coach-avatars` | Photo de profil coach          | existant (avatars OK) |
| `club-logos`    | Logo de club                   | vérifier policies + RLS clubs (cf. §1) |
| `feed-media`    | Photos des posts du fil        | **à créer** (cf. §2.1) |
