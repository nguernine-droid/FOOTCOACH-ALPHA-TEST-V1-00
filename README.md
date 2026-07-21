# FOOTCOACH v1 — Gestion de matchs amicaux

Application de gestion de matchs amicaux avec 4 rôles :

| Rôle | Ce qu'il peut faire |
|---|---|
| **Coach** | Poster des annonces de match amical, répondre aux annonces des autres coachs (→ crée un match confirmé), saisir le score et les temps forts, consulter présences et transports |
| **Joueur** | Indiquer sa présence (présent / absent) aux matchs de son équipe |
| **Parent** | Indiquer sa présence + proposer un transport (nombre de places) |
| **Supporter** | Suivre le score et les temps forts en direct (rafraîchissement automatique) |

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
| Joueur | `player@demo.fr` | FC Nexus |
| Parent | `parent@demo.fr` | FC Nexus |
| Supporter | `supporter@demo.fr` | FC Nexus |

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

## Scénario de démonstration

1. **Coach A** crée une annonce (`Annonce`), **Coach B** (navigation privée) la voit dans `Radar` et y répond → match confirmé des deux côtés.
2. **Joueur** se déclare présent ; **Parent** se déclare présent avec 3 places de transport → visibles sur le dashboard du coach.
3. **Coach A** lance le coup d'envoi, saisit le score et les temps forts.
4. **Supporter** ouvre la page du match : score et timeline se mettent à jour toutes les 5 s sans recharger.
