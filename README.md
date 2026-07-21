# FOOTCOACH v1 — Gestion de matchs amicaux

Application de gestion de matchs amicaux avec 4 rôles :

| Rôle | Ce qu'il peut faire |
|---|---|
| **Coach** | Poster des annonces de match amical, répondre aux annonces des autres coachs (→ crée un match confirmé), saisir le score et les temps forts, consulter les présences de **sa propre équipe** (joueurs et parents séparés — jamais celles de l'adversaire), composer son équipe sur un terrain façon FIFA (la compo adverse se dévoile 2h avant le coup d'envoi) |
| **Joueur** | Indiquer sa présence (présent / absent), réserver une place dans un covoiturage (soumise à l'accord de son parent assigné) |
| **Parent** | Indiquer sa présence + proposer un covoiturage (après avoir renseigné plaque d'immatriculation et n° de permis), autoriser/refuser les demandes de ses joueurs |
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

### Créer un compte (sans compte de démo)

1. **Coach** : « Créer un compte » → « Je suis coach » — 3 petites étapes (nom → identifiants → équipe). L'équipe est créée avec le compte.
2. Dans l'onglet **Mon équipe**, le coach ajoute un joueur (prénom + nom) → un **code d'invitation** apparaît (ex. `3KYZE3`), à transmettre par SMS ou papier.
3. Le **joueur** va sur « Créer un compte » → « J'ai un code d'invitation » (ou ouvre `/register?code=XXX`) : l'écran confirme « Vous rejoignez l'équipe … », il choisit email + mot de passe, c'est fini.
4. Une fois le compte du joueur créé, le coach clique **« Inviter le parent »** sur sa fiche → nouveau code. Le **parent** s'inscrit avec ce code et devient automatiquement le parent assigné du joueur (il validera ses covoiturages).

### Covoiturage

1. Le **parent** renseigne sa plaque et son n° de permis (carte « Mes infos conducteur ») — sans cela, impossible de proposer des places.
2. Présent à un match, il indique le nombre de places dans sa voiture.
3. Le **joueur** voit les voitures proposées (plaque, places restantes) et clique « Je monte dans cette voiture » → une place est décomptée.
4. Si le joueur a un **parent assigné** (Paul → Patricia dans le seed), la réservation reste « en attente de l'accord parental » jusqu'à ce que ce parent l'autorise ou la refuse depuis sa page.
5. Le parent conducteur ne peut pas réduire ses places en dessous du nombre déjà réservé.

## Scénario de démonstration

1. **Coach A** crée une annonce (`Annonce`), **Coach B** (navigation privée) la voit dans `Radar` et y répond → match confirmé des deux côtés.
2. **Joueur** se déclare présent ; **Parent** se déclare présent avec 3 places de transport → visibles sur le dashboard du coach.
3. **Coach A** lance le coup d'envoi, saisit le score et les temps forts.
4. **Supporter** ouvre la page du match : score et timeline se mettent à jour toutes les 5 s sans recharger.
