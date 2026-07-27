# FOOTCOACH v1 — Gestion de matchs amicaux

La **V1 est volontairement restreinte à la gestion des matchs amicaux entre coachs**. Seuls deux rôles accèdent à l'application :

| Rôle | Ce qu'il peut faire |
|---|---|
| **Coach** | Publier des annonces de match amical, répondre aux annonces des autres coachs depuis le radar (→ crée un match confirmé), puis saisir le **score final** et le faire valider par le coach adverse |
| **Admin** | Gérer les comptes coachs (réinitialisation de mot de passe, désactivation), consulter les statistiques |

Il n'y a **pas de comptes joueur ni parent** : tout ce qui en dépendait (effectif, présences, composition d'équipe, covoiturage, temps forts) a été retiré. Les rôles **supporter et club** restent implémentés mais **masqués** : leur connexion est refusée par l'API. Voir « Ce qui est masqué en V1 » plus bas.

L'application est **conçue pour être utilisée à une main sur un téléphone** et **installable sur l'écran d'accueil** — voir « Ergonomie mobile » et « Installation ».

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

## Le radar

Le cœur de la V1, sur le tableau de bord du coach : un **écran de radar balayé** surmontant la liste des annonces ouvertes.

- Le faisceau tourne et **chaque équipe détectée s'allume à son passage**. La phase de chaque point est calée sur son relèvement par un `animation-delay` négatif : aucun minuteur JavaScript, aucun rendu React par image.
- Un point est placé à sa **vraie distance et dans sa vraie direction**. L'API expose `distanceKm` et `bearingDeg` (0 = nord, sens horaire), calculés depuis la position du coach.
- **La mesure vise le lieu du match, pas le siège du club.** Une annonce d'une équipe de Villeurbanne pour un match à Saint-Étienne est à ~50 km, pas à 4 km — c'est le trajet réel qui décide.
- Une annonce dont la ville est absente de l'annuaire n'est **pas placée** : elle reste dans la liste et est décomptée sous l'écran. Mieux vaut ne rien affirmer qu'une fausse position.
- **Périmètre réglable** : 25 / 50 / 100 km ou illimité, 50 km par défaut, conservé côté serveur (voir Notifications). Le nombre d'annonces hors périmètre est toujours annoncé, avec un raccourci pour élargir — le filtre ne masque jamais rien en silence.
- Toucher un point sélectionne la fiche correspondante et y fait défiler la liste.

`prefers-reduced-motion` arrête le faisceau et laisse tous les points visibles en permanence.

## Position du coach

Le radar, les distances et les alertes rayonnent depuis un point que le coach règle lui-même, dans **Mon profil → Ma position** :

| Ordre de priorité | Source |
|---|---|
| 1 | Position réglée par le coach — géolocalisation de l'appareil, ou adresse saisie |
| 2 | Ville de son équipe active (comportement historique) |
| 3 | Rien — ni distance, ni radar, plutôt qu'un chiffre inventé |

Le géocodage passe par l'**API Adresse de l'État** (`api-adresse.data.gouv.fr`) : gratuite, sans clé, France entière, avec autocomplétion et géocodage inverse. **L'appel part du serveur**, jamais du navigateur : le front n'a aucun domaine tiers à autoriser, et une panne du service se traduit par une absence de suggestion, pas par un blocage — la géolocalisation continue de fonctionner.

> Les coordonnées sont **arrondies au centième de degré (~1 km)**, à la source *et* au moment de l'écriture : un client modifié ne peut pas imposer une position plus fine que ce que le produit conserve. Une position n'est jamais montrée aux autres coachs.

## Notifications push

Le coach peut être prévenu **même l'application fermée**, sur les quatre événements de la V1 — chacun désactivable dans **Mon profil → Notifications** :

| Déclencheur | Ciblage |
|---|---|
| Nouvelle annonce dans mon périmètre | Coachs dont le rayon couvre le lieu du match (jamais l'auteur) |
| Une équipe propose de jouer mon annonce | Coachs de l'équipe émettrice |
| Ma proposition est acceptée ou déclinée | Coachs de l'équipe qui a proposé |
| Score final à valider | Coachs de l'équipe adverse |

Détails d'implémentation :

- Service worker minimal (`apps/web/public/sw.js`), **sans cache** : mettre l'app hors ligne demanderait une stratégie d'invalidation, et des annonces périmées vaudraient pire que pas d'offline.
- Un abonnement par appareil (`push_subscriptions`), **purgé automatiquement** dès que le service de push répond 404/410.
- Les envois ne sont **jamais attendus par une route** : un service de push lent ne retarde pas la réponse du coach qui vient de publier.
- Le périmètre du radar vit en base (`users.radar_radius_km`) parce que c'est le serveur qui décide qui notifier.

### Configuration (obligatoire pour activer le push)

Les clés VAPID sont **optionnelles** : sans elles l'API démarre normalement et le réglage explique de lui-même pourquoi il est indisponible.

```bash
npx web-push generate-vapid-keys   # puis reporter la paire dans .env
```

```dotenv
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...          # ne jamais committer
VAPID_SUBJECT=mailto:contact@exemple.fr
```

> **Deux contraintes incontournables.** Le push exige **HTTPS** en production (`localhost` excepté). Et **sur iOS, il n'existe que si l'application a été ajoutée à l'écran d'accueil** (iOS 16.4+) : dans un onglet Safari, l'API n'est tout simplement pas exposée. L'écran d'activation nomme la cause exacte quand c'est impossible — navigateur incapable, app non installée, serveur sans clés, autorisation refusée.

## Installation sur l'écran d'accueil

L'application est une PWA installable : manifeste (`app/manifest.ts`), icônes, `theme-color` navy et `viewport-fit=cover` pour que les *safe areas* iOS soient réellement renseignées.

Sur iPhone : Safari → Partager → « Sur l'écran d'accueil ». L'app s'ouvre alors sans barre d'adresse, la barre d'état prolonge le header navy, et les notifications deviennent possibles.

## Ergonomie mobile

L'app est pensée pour le pouce, pas pour la souris. Les règles ci-dessous sont des **contraintes de conception à ne pas défaire** :

- **Le header ne porte aucune action.** Logo, wordmark, équipe active, espace : lecture seule. Tout ce qui vivait dans le coin haut-droit (profil, agenda, notifications, bascule d'équipe, déconnexion) est dans la **feuille « Moi »**, ouverte depuis la barre basse.
- **Toute action primaire est dans le tiers bas**, en pleine largeur sous 960 px.
- **Aucune modale centrée** : `BottomSheet` partout — poignée, fermeture par glissé vers le bas, par le fond, par Échap ou par un bouton en pied, safe-area respectée, défilement d'arrière-plan bloqué. Au-delà de 960 px elle redevient une boîte centrée.
- **Cibles ≥ 44 px** : `Button` (44/48/52), `.field` (16 px de police — en dessous iOS zoome au focus — et 48 px de haut), `.icon-btn` (44 px visibles, 48 px touchés), `.chip-choice` pour toute pastille cliquable.
- Le seuil mobile/desktop est **960 px partout** (`min-[960px]`), jamais `md:` / `lg:`.
- Contrastes **AA** vérifiés ; `prefers-reduced-motion` neutralise animations **et** délais.

### Mouvement

Une seule courbe — `--ease-app: cubic-bezier(0.32, 0.72, 0, 1)` — et trois durées : `--dur-tap` 120 ms, `--dur-ui` 180 ms, `--dur-page` 320 ms. Elles alimentent `--default-transition-duration` et `--default-transition-timing-function`, donc **tous les utilitaires `transition` de Tailwind en héritent**.

Les transitions d'écran sont **sensibles au sens de navigation** (entrée dans un détail, retour, changement d'onglet). Elles n'utilisent volontairement **pas** l'API View Transitions : celle-ci fige une capture de la page jusqu'à ce que le DOM soit à jour, or l'App Router attend un aller-retour réseau — sur une connexion lente, l'écran resterait gelé. Voir `components/PageTransition.tsx`, qui documente les trois options écartées.

## Architecture

Monorepo npm workspaces, entièrement conteneurisé :

```
apps/
  api/    Fastify 5 + Drizzle ORM (PostgreSQL) — API REST stateless, auth JWT
  web/    Next.js 16 (App Router) — le navigateur ne parle qu'au web,
          qui proxifie /api/* vers les réplicas API (DNS Docker)
    img/    Sources graphiques (logo) — non servi, voir son README
    public/ Servi à la racine : service worker, logo
packages/
  shared/ Types et schémas zod partagés front/back
legacy/   Ancienne application (archivée, non utilisée)
```

Services Docker : `postgres` (16-alpine, volume persistant `pgdata`), `api` (scalable, aucun port hôte, volume `uploads` pour les photos de profil), `web` (port hôte **3002**).

### Logo

`apps/web/img/logo.png` est la **source** de l'identité. Ce dossier n'étant pas servi par Next, trois dérivés en sont tirés — logo transparent pour l'app, icône PWA 512 px, icône iOS 180 px. La recette de régénération est dans `apps/web/img/README.md`.

## Démarrage

```bash
cp .env.example .env          # ajuster les secrets ; ajouter la paire VAPID pour le push
docker compose up -d --build  # postgres + api + web (mode dev, hot reload)
docker compose exec api npm run db:seed --workspace apps/api
```

Application : **http://localhost:3002** — Postgres exposé sur l'hôte en **5433**.
Les migrations s'appliquent automatiquement au démarrage de l'API (verrou consultatif Postgres : sûr même avec plusieurs réplicas).

> Le hot reload passe par des *bind mounts* ciblés : `apps/web/src`, `apps/web/public`, `apps/api/src`, `apps/api/drizzle` et `packages/shared/src`. Tout le reste vit dans l'image — **ajouter une dépendance impose donc de la reconstruire** (`docker compose build api`). Sous Windows, le rechargement de Next reste capricieux : `docker compose restart web` après une modification du front.

### Comptes de démo (mot de passe commun : `Demo1234!`)

| Compte | Email | Équipes |
|---|---|---|
| Coach A — Alexandre Martin | `coach.a@demo.fr` | FC Nexus U13, FC Nexus U15 (Lyon) |
| Coach B — Bruno Silva | `coach.b@demo.fr` | AS Cyber (Villeurbanne) |
| Admin — Alice | `admin@demo.fr` | — |

Le seed crée aussi un compte club (`club@demo.fr`, Étoile Sportive Démo et son équipe Étoile U11), dont la connexion est refusée en V1. Il ne crée plus de comptes joueur, parent ni supporter.

## Production & scalabilité

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# Scaler l'API horizontalement :
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale api=3
```

L'API est stateless (JWT, aucune session en mémoire) : les réplicas se partagent la charge via le DNS interne de Docker, sans configuration supplémentaire. Évolution possible : ajouter un reverse proxy (nginx/traefik) en frontal pour scaler aussi le service `web`.

> **HTTPS n'est pas optionnel en production** : le scanner de QR (caméra), le service worker et les notifications push en dépendent tous les trois.

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

Dans **Mon profil**, le coach personnalise son compte : photo, nom, prénom, téléphone, **position** et **notifications**. Les photos sont envoyées à l'API (JPEG, PNG ou WebP, 2 Mo maximum), stockées dans le volume Docker `uploads` et servies sous `/api/uploads/…` — **ce volume est à sauvegarder au même titre que la base**.

## Navigation de l'espace coach

Barre basse : **Tableau de bord · Annonces · (+) · Matchs · Moi**.

- Le bouton **« + »** doré est contextuel : il publie une annonce depuis la plupart des écrans, et crée un événement depuis l'agenda. Sur mobile il est surélevé au centre de la barre basse, entre deux moitiés d'onglets de largeur égale ; sur desktop il est à droite des onglets. Sur un formulaire de création, il **pivote pour devenir un « ✓ »** qui valide — grisé tant que l'attestation FFF n'est pas cochée.
- La feuille **« Moi »** rassemble l'identité, l'**équipe active**, **Mon profil**, **Mes relations**, **Mes équipes**, l'**agenda** et les **notifications** (avec pastille de non-lus). Sur desktop, où la barre basse n'existe pas, l'avatar du header ouvre la même feuille.
- Le **radar** vit dans le **tableau de bord** ; `/coach/radar` y redirige.
- **Mes équipes** ne gère plus d'effectif : identité des équipes encadrées, choix de l'équipe active et rattachement au club.

Les espaces **admin** et **club** suivent les mêmes règles : barre basse, feuille « Moi », et bouton « + » pour les créations (patron `?nouveau=1`).

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

> Conséquence pratique : les écrans `/club/*` ne peuvent pas être testés dans un navigateur tant que le rôle est bloqué à la connexion.

## Scénario de démonstration

1. **Coach A** règle sa position dans **Mon profil → Ma position** (« Utiliser ma position », ou une adresse), puis choisit son périmètre sur le radar.
2. Il publie une annonce depuis le bouton « + » : date à plus de 10 jours (badge « Délai FFF respecté ») et attestation cochée.
3. **Coach B** (navigation privée) voit apparaître l'annonce **sur le radar de son tableau de bord**, à sa vraie distance et dans sa vraie direction, et clique « Proposer de jouer ». S'il a activé les notifications, il a été prévenu à la publication.
4. **Coach A** retrouve la proposition dans l'onglet **Annonces** et l'accepte → le match est créé.
5. Une fois la date passée, les deux coachs voient **« Score final à saisir »**. Coach A saisit le score avec les compteurs, un **QR code** s'affiche.
6. **Coach B** ouvre le même match, clique **« Scanner le QR code »** et vise l'écran de coach A → le score est validé et le match passe en « Terminé ».
