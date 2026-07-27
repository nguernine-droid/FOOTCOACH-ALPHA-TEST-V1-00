# FOOTCOACH v1 — Gestion de matchs amicaux

La **V1 est volontairement restreinte à la gestion des matchs amicaux entre coachs**. Seuls deux rôles accèdent à l'application :

| Rôle | Ce qu'il peut faire |
|---|---|
| **Coach** | Publier des annonces de match amical, répondre aux annonces des autres coachs depuis le radar (→ crée un match confirmé), puis saisir le **score final** et le faire valider par le coach adverse |
| **Admin** | Gérer les comptes coachs (réinitialisation de mot de passe, désactivation), consulter les statistiques |

Il n'y a **pas de comptes joueur ni parent** : tout ce qui en dépendait (effectif, présences, composition d'équipe, covoiturage, temps forts) a été retiré. Les rôles **supporter et club** restent implémentés mais **masqués** : leur connexion est refusée par l'API. Voir « Ce qui est masqué en V1 » plus bas.

### Score final validé par les deux coachs

Un match ne se clôt pas sur la parole d'un seul coach :

1. la rencontre passée, le match affiche **« Score final à saisir »** tant que rien n'est enregistré (bandeau sur le tableau de bord, la liste des matchs et la feuille de match) ;
2. l'un des deux coachs saisit le score → le match passe en `awaiting_confirmation` et un **QR code** s'affiche sur son écran ;
3. le coach adverse ouvre le même match et **scanne ce QR code depuis l'application** (sa caméra s'ouvre dans la page) ;
4. le score est alors validé et le match passe en `finished`.

Deux garde-fous cumulés : la validation n'est acceptée que du coach de l'**autre** équipe, et seulement avec le **jeton** contenu dans le QR — jeton qui n'est jamais renvoyé à l'adversaire par l'API, il ne peut l'obtenir qu'en voyant l'écran. Corriger le score régénère le jeton, ce qui invalide le QR précédent.

> La caméra n'est accessible qu'en **contexte sécurisé** : HTTPS en production, ou `localhost` en développement. Sur une IP locale en HTTP, le navigateur refusera l'accès et le scanner affichera « Caméra indisponible ».

### Règle FFF des 10 jours

Un match amical doit être déclaré à la fédération (district / ligue) **au moins 10 jours avant** la rencontre. À la publication d'une annonce :

- une **case d'attestation est obligatoire** (« J'atteste avoir déclaré ce match amical à ma fédération ») — vérifiée côté API, pas seulement dans le formulaire ;
- une date à moins de 10 jours **n'est pas bloquée** mais affiche un avertissement (les dérogations de district existent) ;
- chaque annonce porte un badge « Délai FFF respecté » ou « Délai FFF non respecté (n j) », calculé entre la publication et la date du match.

## Architecture

Monorepo npm workspaces, entièrement conteneurisé :

```
apps/
  api/    Fastify 5 + Drizzle ORM (PostgreSQL) — API REST stateless, auth JWT
  web/    Next.js 16 (App Router) — le navigateur ne parle qu'au web,
          qui proxifie /api/* vers les réplicas API (DNS Docker)
packages/
  shared/ Types et schémas zod partagés front/back
legacy/   Ancienne application (archivée, non utilisée)
```

Services Docker : `postgres` (16-alpine, volume persistant `pgdata`), `api` (scalable, aucun port hôte, volume `uploads` pour les photos de profil), `web` (port hôte **3002**).

## Démarrage

```bash
cp .env.example .env          # ajuster les secrets si besoin
docker compose up -d --build  # postgres + api + web (mode dev, hot reload)
docker compose exec api npm run db:seed --workspace apps/api
```

Application : **http://localhost:3002** — Postgres exposé sur l'hôte en **5433**.
Les migrations s'appliquent automatiquement au démarrage de l'API (verrou consultatif Postgres : sûr même avec plusieurs réplicas).

### Comptes de démo (mot de passe commun : `Demo1234!`)

| Compte | Email | Équipe |
|---|---|---|
| Coach A | `coach.a@demo.fr` | FC Nexus |
| Coach B | `coach.b@demo.fr` | AS Cyber |
| Admin | `admin@demo.fr` | — |

Le seed crée aussi un compte club (`club@demo.fr`), dont la connexion est refusée en V1. Il ne crée plus de comptes joueur, parent ni supporter.

## Production & scalabilité

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# Scaler l'API horizontalement :
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale api=3
```

L'API est stateless (JWT, aucune session en mémoire) : les réplicas se partagent la charge via le DNS interne de Docker, sans configuration supplémentaire. Évolution possible : ajouter un reverse proxy (nginx/traefik) en frontal pour scaler aussi le service `web`.

## Développement hors Docker

```bash
npm install
docker compose up -d postgres
# DATABASE_URL=postgres://footcoach:...@localhost:5433/footcoach
npm run dev:api    # API sur :4000
npm run dev:web    # Web sur :3000 (API_INTERNAL_URL=http://localhost:4000)
npm run db:seed
```

### Créer un compte coach (sans compte de démo)

« Créer un compte coach » — 3 petites étapes (nom → identifiants → équipe). L'équipe est créée avec le compte. `/register` mène directement à ce parcours : c'est la seule inscription de la V1.

## Relations entre coachs

Les coachs se constituent un réseau pour garder le contact d'un amical à l'autre.

- Chaque coach a un **code personnel** (ex. `3QYU25`) et le **QR code** correspondant, dans **Mon profil**.
- On ajoute un confrère depuis **Relations** en saisissant son code, ou en **scannant son QR** (même scanner que la validation des scores, donc mêmes contraintes de caméra).
- Le lien est **immédiat et réciproque** : détenir le code suppose d'avoir vu l'écran de l'autre ou reçu son code de sa part. Le retrait supprime le lien des deux côtés.
- Une fiche de relation montre nom, prénom, **téléphone appelable**, club et équipes encadrées. Le téléphone n'est visible que des relations.

Dans **Mon profil**, le coach personnalise son compte : photo, nom, prénom, téléphone. Les photos sont envoyées à l'API (JPEG, PNG ou WebP, 2 Mo maximum), stockées dans le volume Docker `uploads` et servies sous `/api/uploads/…` — **ce volume est à sauvegarder au même titre que la base**.

## Navigation de l'espace coach

Onglets : **Tableau de bord · Annonces · (+) · Matchs · ⋯**, le menu **⋯** regroupant **Relations** et **Mes équipes**. « Mon profil » est dans le menu du compte, en haut à droite.

- Le bouton **« + »** doré est contextuel : il publie une annonce depuis la plupart des écrans, et crée un événement depuis l'agenda. Sur mobile il est surélevé au centre de la barre basse, entre deux moitiés d'onglets de largeur égale ; sur desktop il est à droite des onglets. Sur le formulaire d'annonce, il devient un **« ✓ »** qui publie — grisé tant que l'attestation FFF n'est pas cochée.
- Le **radar** (les équipes autour de vous qui cherchent un adversaire, triées par proximité) vit dans le **tableau de bord** ; `/coach/radar` y redirige.
- L'**agenda** est accessible par l'icône calendrier du header.
- **Mes équipes** ne gère plus d'effectif : identité des équipes encadrées, choix de l'équipe active et rattachement au club.

## Ce qui a été retiré, et ce qui est seulement masqué

**Retiré du code** (les tables restent en base, dormantes — aucune migration destructive) :

- comptes joueur et parent, et leurs espaces `/player` et `/parent` ;
- effectif d'équipe, codes d'invitation, demandes d'adhésion ;
- présences aux matchs et aux événements ;
- composition d'équipe (terrain, compo adverse verrouillée) ;
- covoiturage ;
- temps forts de match — seul le score final subsiste.

Tables conservées mais plus lues : `attendances`, `lineups`, `match_events`, `carpool_bookings`, `join_requests`, `event_attendances`, et les colonnes `users.parent_id / position / jersey_number`.

**Masqué mais intact** :

| Élément | Comment le rouvrir |
|---|---|
| Connexion supporter / club | `V1_ROLES` dans `packages/shared/src/index.ts` (gardé par `isV1Role` dans `routes/auth.ts`) |
| Espaces `/supporter`, `/club` | Routes et pages conservées, inatteignables tant que la connexion est bloquée |

## Scénario de démonstration

1. **Coach A** publie une annonce depuis le bouton « + » : il choisit une date à plus de 10 jours (badge « Délai FFF respecté ») et coche l'attestation de déclaration.
2. **Coach B** (navigation privée) voit l'annonce dans le **radar de son tableau de bord**, triée par distance, et clique « Proposer de jouer ».
3. **Coach A** retrouve la proposition dans l'onglet **Annonces** et l'accepte → le match est créé.
4. Une fois la date passée, les deux coachs voient **« Score final à saisir »**. Coach A saisit le score : un **QR code** s'affiche.
5. **Coach B** ouvre le même match, clique **« Scanner le QR code »** et vise l'écran de coach A → le score est validé et le match passe en « Terminé ».
