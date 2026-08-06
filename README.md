# FOOTCOACH v1 — Gestion de matchs amicaux

La **V1 est volontairement restreinte à la gestion des matchs amicaux entre coachs**. Seuls deux rôles accèdent à l'application :

| Rôle | Ce qu'il peut faire |
|---|---|
| **Coach** | Publier des annonces de match amical, répondre aux annonces des autres coachs depuis le radar (→ crée un match confirmé), **valider la rencontre au stade** en se scannant avec le coach adverse (ce qui rapporte des points), puis saisir le **score final** |
| **Admin** | Gérer les comptes coachs (réinitialisation de mot de passe, désactivation), consulter les statistiques |

Il n'y a **pas de comptes joueur ni parent** : tout ce qui en dépendait (effectif, présences, composition d'équipe, covoiturage, temps forts) a été retiré. Les rôles **supporter et club** restent implémentés mais **masqués** : leur connexion est refusée par l'API. Voir « Ce qui est masqué en V1 » plus bas.

L'application est **conçue pour être utilisée à une main sur un téléphone** et **installable sur l'écran d'accueil** — voir « Ergonomie mobile » et « Installation ».

### La rencontre validée au stade, et les points

Ce qui atteste qu'un match a eu lieu n'est pas le score, mais le **face-à-face des deux coachs** :

1. le jour du match, la feuille affiche **« Rencontre à valider »** (tableau de bord, liste des matchs, feuille de match) ;
2. le coach de l'équipe qui **reçoit** — celle dont l'annonce est à l'origine du match — affiche un **QR code** ;
3. le coach qui **s'est déplacé** le scanne depuis son application, face à lui ;
4. la rencontre est validée, et **les deux coachs gagnent des points**.

Le sens est imposé : l'API refuse que le visiteur affiche le QR (403) comme que l'hôte se valide lui-même (403). Le **jeton** du QR n'est jamais servi au visiteur par l'API — il ne peut l'obtenir qu'en voyant l'écran d'en face. C'est ce qui rend l'attestation impossible à distance, et donc les points impossibles à réclamer sans s'être déplacé.

**Barème.** 10 points pour chacun des deux coachs. Le coach qui répond à une annonce repartie en **SOS** en gagne 20 : c'est lui qui dépanne, en reprenant un match qu'un autre vient d'abandonner. L'hôte reste à 10. Une même **paire d'équipes** ne rapporte qu'une fois tous les 30 jours — les rencontres suivantes sont bien validées, elles ne paient plus. Sans ce plafond, deux coachs complices fabriqueraient un palier en une soirée.

### Casquettes du coach

Un coach peut se donner des casquettes, **cumulables**, depuis **Mon profil → Mes casquettes**. N'en cocher aucune est le cas ordinaire et se lit « simple coach » — il n'y a pas de case pour dire non.

| Casquette | Effet |
|---|---|
| **Joker** | Il accepte d'être alerté quand un coach de son secteur se retrouve sans adversaire. **Les alertes SOS ne partent qu'aux jokers**, et seulement à ceux dont le rayon couvre le lieu : se dire disponible n'est pas se dire ubiquiste. |
| **Contributeur** | Décoratif pour l'instant — un badge sur sa fiche. La casquette prendra son sens en V2, elle est modélisée dès maintenant pour que les coachs puissent se déclarer sans attendre. |

Se déclarer joker **est** l'abonnement aux SOS : le ciblage ne recoupe pas la préférence « nouvelle annonce », qui répond à une autre question. Un coach qui a coupé le flot des annonces neuves mais s'est déclaré joker veut précisément cela — n'être dérangé que quand quelqu'un est en panne.

**Relance automatique, d'autant plus rapide que le match approche.** Si le SOS reste sans réponse, il est élargi à tous les coachs du secteur au bout d'un délai qui dépend de l'échéance (`SOS_WIDEN_DELAYS`) :

| Match dans | Délai avant élargissement |
|---|---|
| aujourd'hui ou demain | **10 minutes** |
| 2 à 6 jours | **30 minutes** |
| 7 jours et plus | **60 minutes** |

Une heure d'avance pour les jokers ne coûte rien sur un match dans quinze jours ; elle peut faire perdre la rencontre s'il se joue demain. À l'inverse, élargir en dix minutes un SOS lointain gaspille l'attention de tout un secteur.

Les jokers sont exclus de la relance : ils ont déjà reçu le premier appel, les rappeler à l'ordre reviendrait à punir ceux qui se sont portés volontaires. Une seule proposition suffit à annuler la relance — même si l'émetteur n'a pas encore tranché, le SOS a fait son travail.

Le différé vit en base (`match_announcements.sos_alerted_at` / `sos_widened_at`), balayé toutes les 2 minutes par `lib/sosRelay.ts` (index partiel `sos_pending_relay_idx`) :

- **sûr à plusieurs répliques** — la relance est réclamée par un `UPDATE … WHERE sos_widened_at IS NULL … RETURNING`, si bien qu'un `docker compose up --scale api=3` n'envoie pas la notification trois fois ;
- **survit aux redémarrages** — une passe a lieu au démarrage, ce qui rattrape les relances dues pendant un déploiement ;
- **remis à zéro à chaque nouveau SOS** sur la même annonce : un second désistement rouvre un cycle entier ;
- sans push configuré, rien n'est consommé — les annonces ne sont pas marquées, la relance reste due le jour où le push arrive.

Les casquettes s'affichent sur les fiches de relations, à côté du palier.

**Paliers.** Le total reste interne, seul le **palier** circule (Nouveau → Bronze 30 → Argent 100 → Or 250 → Platine 500, `COACH_LEVELS` dans `@footcoach/shared`). Il s'affiche sur les fiches de relations, comme repère de fiabilité avant de proposer un match à quelqu'un qu'on ne connaît pas. Le coach voit son total chiffré et sa progression sur **Mon profil**, et nulle part ailleurs.

**Le score, lui, ne se contre-signe plus.** Il est saisi par l'un ou l'autre coach et clôt le match ; l'adversaire en est notifié et peut le corriger. C'est la rencontre qui est attestée, pas le résultat — un désaccord sur un but se règle entre coachs, pas par un refus de validation qui laissait le match ouvert indéfiniment.

> La caméra n'est accessible qu'en **contexte sécurisé** : HTTPS en production, ou `localhost` en développement. Sur une IP locale en HTTP, le navigateur refusera l'accès et le scanner affichera « Caméra indisponible ».

### Règle FFF des 10 jours

Un match amical doit être déclaré à la fédération (district / ligue) **au moins 10 jours avant** la rencontre. À la publication d'une annonce :

- un **rappel du délai** est affiché ;
- une date à moins de 10 jours **n'est pas bloquée** mais affiche un avertissement (les dérogations de district existent) ;
- chaque annonce porte un badge « Délai FFF respecté » ou « Délai FFF non respecté (n j) », calculé entre la publication et la date du match.

Il n'y a **plus de case à cocher par annonce**. Que la déclaration au district relève du coach et de son club est accepté **une fois, à l'inscription** (« Je comprends que la déclaration du match à ma fédération… relève de ma responsabilité »), avec date et version conservées sur le compte — la redemander à chaque publication faisait double emploi. La colonne `match_announcements.federation_declared` reste en base pour les annonces publiées sous l'ancienne règle, mais n'est plus écrite ni affichée : sur une annonce récente, `false` signifie « la question n'a pas été posée ».

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

Le coach peut être prévenu **même l'application fermée**. Les quatre premiers sont désactivables dans **Mon profil → Notifications** ; le cinquième dépend de la casquette **joker** et de rien d'autre :

| Déclencheur | Ciblage |
|---|---|
| Nouvelle annonce dans mon périmètre | Coachs dont le rayon couvre le lieu du match (jamais l'auteur) |
| Une équipe propose de jouer mon annonce | Coachs de l'équipe émettrice |
| Ma proposition est acceptée ou déclinée | Coachs de l'équipe qui a proposé |
| Score final enregistré par l'adversaire | Coachs de l'équipe adverse |
| **SOS** — un coach se retrouve sans adversaire | **Jokers** dont le rayon couvre le lieu (voir « Casquettes ») |
| **SOS sans réponse** (10 à 60 min selon l'urgence) | Tous les autres coachs du secteur (jokers exclus, ils ont déjà été appelés) |

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

Application : **http://localhost:3002** — Postgres exposé sur l'hôte en **5433**, sur `127.0.0.1` uniquement (la base de développement porte un mot de passe écrit dans le dépôt : elle n'a rien à faire sur le réseau).
Les migrations s'appliquent automatiquement au démarrage de l'API (verrou consultatif Postgres : sûr même avec plusieurs réplicas).

> Le hot reload passe par des *bind mounts* ciblés : `apps/web/src`, `apps/web/public`, `apps/api/src`, `apps/api/drizzle` et `packages/shared/src`. Tout le reste vit dans l'image — **ajouter une dépendance impose donc de la reconstruire** (`docker compose build api`). Sous Windows, le rechargement de Next reste capricieux : `docker compose restart web` après une modification du front.

> **Le seed est réservé au développement.** Il crée des comptes aux identifiants publiés ci-dessous, administrateur compris, et il **réécrit** les comptes existants portant les mêmes adresses. Le script refuse donc de s'exécuter si `NODE_ENV=production`, et il demande `FOOTCOACH_SEED_CONFIRM=oui` dès que `DATABASE_URL` ne pointe pas vers une base locale. `FOOTCOACH_SEED_PASSWORD` permet de ne pas dépendre du mot de passe écrit dans ce fichier.

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

## Sécurité

Ce qui est en place dans le code, et ce qui reste à la charge du déploiement.

**Refus de démarrer plutôt que de mal démarrer.** En production, l'API vérifie sa
configuration avant d'écouter : secrets JWT distincts, d'au moins 32 caractères,
et différents de ceux du fichier de développement. Un déploiement qui oublie de
les définir s'arrête avec un message explicite au lieu de signer ses jetons avec
une clé publiquement connue. `docker-compose.prod.yml` applique la même exigence
au mot de passe PostgreSQL.

**Authentification.** Mots de passe hachés en **scrypt** (natif, mémoire-dur),
avec lecture des anciennes empreintes bcrypt : elles sont réencodées à la
première connexion réussie, sans migration. Un mot de passe choisi fait 12
caractères minimum et ne peut pas être un grand classique ; la connexion, elle,
accepte toujours 8 caractères pour ne verrouiller dehors aucun compte existant.
Jeton d'accès de 15 minutes, jeton de rafraîchissement de 7 jours stocké haché,
révoqué et remplacé à chaque usage. La comparaison de mot de passe s'exécute même
pour un compte inconnu, contre une empreinte de coût équivalent : sans cela,
l'écart de temps de réponse suffit à dresser la liste des comptes. « Mot de passe
oublié » répond la même chose dans tous les cas.

**Limitation de débit.** 10 tentatives par minute sur la connexion, le
rafraîchissement et le mot de passe oublié ; 5 inscriptions par tranche de 10
minutes ; 300 requêtes par minute au global.

Le compteur suit le **compte** une fois authentifié — sinon les coachs d'un même
club, derrière la même adresse, se partageraient un seul quota. L'identité est
tirée du jeton **après vérification de sa signature** : dériver le compteur d'un
en-tête non vérifié revenait à laisser l'appelant s'en fabriquer un neuf à chaque
essai. Les routes d'authentification comptent par adresse en toutes
circonstances, puisque l'appelant n'y est pas encore authentifié.

Ces compteurs vivent en mémoire, donc par réplica. Un **frein complémentaire en
base** (`login_attempts`) plafonne les échecs par compte à 10 par quart d'heure :
lui est partagé, y compris avec `--scale api=3`. Il porte sur le compte et non
sur l'adresse — sans `TRUST_PROXY`, l'adresse vue est celle du conteneur `web`,
et un frein par adresse verrouillerait tous les coachs à cause d'un seul
attaquant.

**Adresse des clients (`TRUST_PROXY`).** Vide par défaut : aucun en-tête
`X-Forwarded-For` n'est cru, l'adresse retenue est celle du pair TCP. À ne
renseigner que derrière un reverse proxy configuré pour **ajouter** l'adresse
réelle (`proxy_add_x_forwarded_for` chez nginx) — Next relaie cet en-tête tel
quel et ne peut donc pas en attester. Voir `.env.example`.

**Fichiers téléversés.** La signature du contenu est vérifiée, pas seulement le
type déclaré : un fichier qui n'est pas un JPEG, PNG ou WebP est refusé, et
l'extension servie est dérivée du contenu.

**En-têtes.** Politique de contenu, `nosniff`, `frame-ancestors: none`,
`Referrer-Policy: no-referrer` et HSTS sur les deux services. Les photos de
profil sont servies avec une politique qui n'autorise l'exécution de rien.

**Ce qui reste à faire au déploiement :**

1. Générer les secrets : `openssl rand -base64 48`, deux fois, valeurs distinctes.
2. Placer un reverse proxy TLS en façade (nginx, traefik, Caddy) — l'application
   ne termine pas le TLS elle-même. Puis, et seulement une fois qu'il ajoute
   `X-Forwarded-For`, régler `TRUST_PROXY=loopback,uniquelocal`.
3. Ne pas exposer le port PostgreSQL (déjà retiré par `docker-compose.prod.yml` ;
   en développement il n'écoute que sur `127.0.0.1`).
4. Sauvegarder la base **et** le volume `uploads` (photos de profil).
5. Surveiller `npm audit` : les avis de sécurité sortent après les déploiements.
   ⚠️ Ne jamais lancer `npm audit fix --force` — il propose `next@9.3.3`, sept
   majeures en arrière. Voir `SECURITY_AUDIT.md`, FC-05, pour l'état des avis
   ouverts et pourquoi ils ne sont pas atteignables.

## Tests

```bash
npm test          # tous les workspaces
npm run typecheck
```

`node:test` via `tsx`, sans dépendance supplémentaire. Les tests couvrent les
protections de sécurité — limitation de débit, garde-fous du seed, politique de
mot de passe, validation des fichiers téléversés, épinglage de l'algorithme des
jetons. Deux tests d'intégration demandent un Postgres et s'ignorent sans lui :

```bash
docker compose up -d postgres
FOOTCOACH_TEST_DATABASE_URL=postgres://footcoach:<mdp>@localhost:5433/footcoach npm test
```

Ils écrivent dans la base visée (comptes `@throttle.test`) et nettoient derrière
eux — à ne pointer que sur une base de développement.

**Limites connues, assumées à ce stade :** pas de second facteur sur le compte
administrateur, pas de détection de rejeu d'un jeton de rafraîchissement révoqué,
et le jeton d'accès reste valable jusqu'à 15 minutes après une désactivation de
compte ou un retrait d'équipe. L'inscription révèle qu'une adresse est déjà
inscrite : la refermer demande un circuit de confirmation par courriel, décrit
dans `SECURITY_AUDIT.md` (FC-14).

Le détail de l'audit de sécurité, des correctifs et de ce qui reste ouvert est
dans [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md).

## Développement hors Docker

```bash
npm install
docker compose up -d postgres
# DATABASE_URL=postgres://footcoach:...@localhost:5433/footcoach
npm run dev:api    # API sur :4000
npm run dev:web    # Web sur :3000 (API_INTERNAL_URL=http://localhost:4000)
npm run db:seed
```

## Simulation d'usage

`npm run simulate` joue cent coachs sur une semaine contre la vraie API : elle
cherche les erreurs qui n'apparaissent qu'en volume et mesure ce que l'interface
reçoit à densité réelle. Elle **écrit dans la base** et se nettoie ensuite —
mode d'emploi dans [`tools/simulation/README.md`](tools/simulation/README.md).

### Créer un compte coach (sans compte de démo)

« Créer un compte coach » — 3 petites étapes (nom → identifiants → équipe). L'équipe est créée avec le compte. `/register` mène directement à ce parcours : c'est la seule inscription de la V1.

L'étape « équipe » demande son nom, sa ville, sa **catégorie** (obligatoire) et son **stade habituel** (facultatif) — voir « Références d'équipe » ci-dessous.

### Références d'équipe

Chaque équipe porte une **catégorie** (U6 → Vétérans) et un **stade habituel**. Ils sont demandés à sa création — à l'inscription comme dans **Mes équipes › Créer une équipe** — et **préremplissent chaque annonce** publiée en son nom : catégorie, stade et ville arrivent déjà renseignés, il ne reste que la date, l'heure et le genre.

Ce ne sont que des valeurs de départ : un déplacement se joue ailleurs, un amical peut se caler sur une autre catégorie, et tous les champs de l'annonce restent modifiables.

Les équipes créées avant cette version n'en ont pas — le formulaire d'annonce retombe alors sur ses valeurs par défaut, et **Mes équipes** signale « Catégorie à renseigner ». Le crayon en bout de ligne ouvre une feuille qui règle les deux valeurs (`PATCH /coach/teams/:id`, réservé aux encadrants de l'équipe).

## Relations entre coachs

Les coachs se constituent un réseau pour garder le contact d'un amical à l'autre.

- Chaque coach a un **code personnel** (ex. `3QYU25`) et le **QR code** correspondant, dans **Mon profil**.
- On ajoute un confrère depuis **Relations** en saisissant son code, ou en **scannant son QR** (même scanner que la validation des rencontres, donc mêmes contraintes de caméra).
- Le lien est **immédiat et réciproque** : détenir le code suppose d'avoir vu l'écran de l'autre ou reçu son code de sa part. Le retrait supprime le lien des deux côtés.
- Une fiche de relation montre nom, prénom, **téléphone appelable**, club et équipes encadrées. Le téléphone n'est visible que des relations.

Dans **Mon profil**, le coach personnalise son compte : photo, nom, prénom, téléphone, **position** et **notifications**. Les photos sont envoyées à l'API (JPEG, PNG ou WebP, 2 Mo maximum), stockées dans le volume Docker `uploads` et servies sous `/api/uploads/…` — **ce volume est à sauvegarder au même titre que la base**.

## Navigation de l'espace coach

Barre basse : **Tableau de bord · Annonces · (+) · Matchs · Moi**.

- Le bouton **« + »** doré est contextuel : il publie une annonce depuis la plupart des écrans, et crée un événement depuis l'agenda. Sur mobile il est surélevé au centre de la barre basse, entre deux moitiés d'onglets de largeur égale ; sur desktop il est à droite des onglets. Sur un formulaire de création, il **pivote pour devenir un « ✓ »** qui valide — grisé tant que le genre de l'équipe n'est pas choisi.
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
2. Il publie une annonce depuis le bouton « + » : catégorie, stade et ville arrivent préremplis depuis son équipe, il ne reste que la date (à plus de 10 jours → badge « Délai FFF respecté »), l'heure et le genre.
3. **Coach B** (navigation privée) voit apparaître l'annonce **sur le radar de son tableau de bord**, à sa vraie distance et dans sa vraie direction, et clique « Proposer de jouer ». S'il a activé les notifications, il a été prévenu à la publication.
4. **Coach A** retrouve la proposition dans l'onglet **Annonces** et l'accepte → le match est créé.
5. Le jour du match, les deux coachs voient **« Rencontre à valider »**. Coach A, qui reçoit, ouvre la feuille de match et clique **« Afficher le QR code »**.
6. **Coach B** ouvre le même match, clique **« Scanner le QR code »** et vise l'écran de coach A → la rencontre est validée et chacun gagne 10 points, annoncés à coach B juste après son scan.
7. Après le coup de sifflet final, l'un des deux saisit le score avec les compteurs : le match passe en « Terminé », l'autre en est notifié.
