# FOOTCOACH v1 — Gestion de matchs amicaux

La **V1 est volontairement restreinte à la gestion des matchs amicaux entre coachs**. Seuls deux rôles accèdent à l'application :

| Rôle | Ce qu'il peut faire |
|---|---|
| **Coach** | Publier des annonces de match amical, répondre aux annonces des autres coachs depuis le radar (→ crée un match confirmé), saisir le score et les temps forts, consulter les présences de **sa propre équipe** (jamais celles de l'adversaire), composer son équipe sur un terrain façon FIFA (la compo adverse se dévoile 2h avant le coup d'envoi) |
| **Admin** | Gérer les comptes coachs (réinitialisation de mot de passe, désactivation), consulter les statistiques |

Les rôles **joueur, parent, supporter et club** restent implémentés (code, routes et espaces conservés) mais sont **masqués en V1** : leur connexion est refusée par l'API et l'inscription joueur/parent est fermée. Voir « Ce qui est masqué en V1 » plus bas.

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

Services Docker : `postgres` (16-alpine, volume persistant `pgdata`), `api` (scalable, aucun port hôte), `web` (port hôte **3002**).

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

Le seed crée aussi des comptes joueur, parent, supporter et club, mais leur connexion est refusée en V1.

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

« Créer un compte coach » — 3 petites étapes (nom → identifiants → équipe). L'équipe est créée avec le compte. En V1, `/register` mène directement à ce parcours : l'inscription joueur/parent par code d'équipe est fermée.

## Navigation de l'espace coach

Onglets : **Tableau de bord · Annonces · (+) · Matchs · Mes équipes**.

- Le bouton **« + »** doré est contextuel : il publie une annonce depuis la plupart des écrans, et crée un événement depuis l'agenda. Sur mobile il est surélevé au centre de la barre basse ; sur desktop il est à droite des onglets.
- Le **radar** (les équipes autour de vous qui cherchent un adversaire, triées par proximité) vit dans le **tableau de bord** ; `/coach/radar` y redirige.
- L'**agenda** est accessible par l'icône calendrier du header.

## Ce qui est masqué en V1

Rien n'a été supprimé — tout est réactivable :

| Élément | Comment le rouvrir |
|---|---|
| Connexion joueur / parent / supporter / club | `V1_ROLES` dans `packages/shared/src/index.ts` (gardé par `isV1Role` dans `routes/auth.ts`) |
| Inscription joueur / parent par code d'équipe | `JOIN_REGISTRATION_OPEN` dans `apps/api/src/routes/registration.ts`, et réafficher `JoinWizard` dans `app/register/page.tsx` |
| Covoiturage | Onglet retiré de `app/coach/layout.tsx` ; `CarpoolSection` retirée de la feuille de match coach (le composant et son API sont intacts) |
| Espaces `/player`, `/parent`, `/supporter`, `/club` | Routes et pages conservées, simplement inatteignables tant que la connexion est bloquée |

## Scénario de démonstration

1. **Coach A** publie une annonce depuis le bouton « + » : il choisit une date à plus de 10 jours (badge « Délai FFF respecté ») et coche l'attestation de déclaration.
2. **Coach B** (navigation privée) voit l'annonce dans le **radar de son tableau de bord**, triée par distance, et clique « Proposer de jouer ».
3. **Coach A** retrouve la proposition dans l'onglet **Annonces** et l'accepte → le match est créé et sa feuille de match s'ouvre.
4. **Coach A** lance le coup d'envoi, saisit le score et les temps forts ; la compo adverse se dévoile 2 h avant le coup d'envoi.
