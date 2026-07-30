# Audit de sécurité — FOOTCOACH V1

| | |
|---|---|
| **Dépôt** | `FOOTCOACH-ALPHA-TEST-V1-00` |
| **Branche auditée** | `v1` — commit `d435b45` |
| **Date** | 30 juillet 2026 |
| **Périmètre** | `apps/api`, `apps/web`, `packages/shared`, `tools/`, fichiers Docker et de configuration |
| **Phases** | 1 (reconnaissance) et 2 (audit) terminées. Phase 3 (remédiation) **en attente de validation** |
| **Fichiers modifiés** | aucun, hormis ce rapport |

---

## Contexte

### Architecture

Monorepo npm (workspaces) en TypeScript, deux services applicatifs et une base
PostgreSQL, orchestrés par Docker Compose.

```
apps/api        Fastify 5 (ESM, tsx) — l'unique API, aucun port hôte
apps/web        Next.js 16 / React 19 — sert l'interface ET proxifie /api/* vers l'API
packages/shared Types et schémas Zod partagés front/back
tools/simulation Script de charge (100 coachs) contre la vraie API
site/           Vitrine statique (HTML/CSS, hors application)
legacy/         Ancienne application Next + Supabase, archivée, non déployée
```

**Chaîne de requête.** Le navigateur ne parle qu'au service `web` (port hôte
3002). Next réécrit `/api/:path*` vers `http://api:4000/:path*` via le DNS
interne Docker. L'API n'expose aucun port sur l'hôte — elle n'est joignable que
depuis le réseau `footcoach`. Postgres est exposé sur l'hôte en 5433 **en
développement uniquement** (`docker-compose.prod.yml` remet `ports: []`).

### Points d'entrée

Toutes les routes sont déclarées dans `apps/api/src/routes/` et enregistrées
dans `apps/api/src/index.ts:107-116`.

| Fichier | Préfixes | Garde |
|---|---|---|
| `auth.ts` | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/me`, `/me/profile` | public pour les 4 premières, `requireAuth` ensuite |
| `registration.ts` | `/auth/register-coach`, `/coach/teams` | public / `requireAuth` + rôle `coach` |
| `announcements.ts` | `/announcements/**` | `requireAuth` + rôle `coach` |
| `matches.ts` | `/matches/**` | `requireAuth` (+ rôle `coach` sur les mutations) |
| `events.ts` | `/events/**` | `requireAuth` + rôle `coach` |
| `activity.ts` | `/activity` | `requireAuth` + rôle `coach` |
| `relations.ts` | `/me/avatar`, `/coach/relations/**` | `requireAuth` (+ rôle `coach`) |
| `location.ts` | `/geo/**`, `/me/location`, `/me/radar-radius`, `/me/notifications`, `/push/**` | `requireAuth` + rôle `coach` |
| `admin.ts` | `/admin/**` | `requireAuth` + rôle `admin` |
| `club.ts` | `/club/**` | `requireAuth` + rôle `club` — inatteignable en V1 (`isV1Role` refuse la connexion du rôle `club`) |
| `index.ts:105` | `/health` | public |
| `index.ts:95-101` | `/uploads/*` (statique) | public |

### Accès aux données

Drizzle ORM 0.45 sur `postgres.js`, pool de 10 connexions
(`apps/api/src/db/client.ts`). **Aucune requête SQL n'est construite par
concaténation** : tout passe par le constructeur de requêtes (`eq`, `and`,
`inArray`, `ilike`…), qui paramètre les valeurs. Les seules chaînes SQL brutes
du dépôt sont deux clauses `where` d'index partiels (`db/schema.ts:136`, `:210`,
`:390`) et le verrou consultatif de migration (`db/migrate.ts:14`), tous sans
donnée externe. Migrations appliquées au démarrage sous `pg_advisory_lock`.

### Authentification

Jeton d'accès JWT HS256 de 15 minutes (`plugins/auth.ts:33`), jeton de
rafraîchissement de 7 jours — 48 octets aléatoires, stocké **haché en SHA-256**,
révoqué et remplacé à chaque usage (`routes/auth.ts:38-46`, `:195-216`). Mots de
passe en bcrypt, coût 10. Comparaison exécutée même sur compte inconnu, contre
un faux hachage (`routes/auth.ts:168-177`) — pas d'énumération par le temps de
réponse. Les deux jetons vivent dans `localStorage` côté client
(`apps/web/src/lib/api.ts:5-7`). **Aucun cookie n'est émis** : la CSRF est
structurellement hors sujet sur cette API.

Autorisation à trois étages : `requireAuth` (jeton valide), `requireRole` (rôle),
puis une vérification d'appartenance explicite dans chaque route mutative
(`assertCoachOfMatch`, `ownedTeam`, `affiliatedCoach`, comparaisons
`announcement.teamId !== request.user.teamId`). Le coach multi-équipes choisit son
équipe active par l'en-tête `X-Team-Id`, validé en base dès qu'il diffère de
celle du jeton (`plugins/auth.ts:59-69`).

### Frontières de confiance

| Entrée non fiable | Où elle arrive | Validation constatée |
|---|---|---|
| Corps JSON | toutes les routes mutatives | Zod (`packages/shared`), plafond global 1 Mo (`index.ts:38`) |
| Paramètres de chemin (`:id`) | ~20 routes | **aucune** — transtypage `as { id: string }`, voir FC-11 |
| Chaînes de requête | `/admin/stats`, `/admin/accounts`, `/events`, `/geo/*`, `/push/*` | ponctuelle (regex de date, `Number.isFinite`), pas de schéma |
| En-tête `Authorization` | partout | `jwt.verify` — mais sert aussi de **clé de limitation de débit**, voir FC-01 |
| En-tête `X-Team-Id` | partout | vérifié en base contre `team_coaches` |
| En-tête `X-Forwarded-For` | partout | **implicitement fait confiance** (`trustProxy: true`), voir FC-02 |
| Envoi de fichier | `POST /me/avatar` | taille 2 Mo, `Content-Type` **déclaré par le client**, voir FC-08 |
| Variables d'environnement | démarrage | Zod strict + refus de démarrer en production (`src/env.ts`) |
| Réponse tierce (API Adresse) | `lib/geocoding.ts` | typée, bornée à 4 s, panne = liste vide |
| Charge utile Web Push | `apps/web/public/sw.js:16-22` | `JSON.parse` en `try/catch`, champs injectés en texte |

### Ce qui est déjà en place, et solide

Le dépôt a manifestement déjà connu une passe de durcissement. Les éléments
suivants sont corrects et n'apparaissent pas dans les failles :

- **CSP à nonce par requête** avec `strict-dynamic` (`apps/web/src/proxy.ts`), nonce
  tiré de `crypto.getRandomValues`, propagé au seul script en ligne assumé
  (`layout.tsx:67-71`). `object-src 'none'`, `frame-ancestors 'none'`, `base-uri`.
- **En-têtes fixes** sur les deux services : `nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, `Permissions-Policy`, HSTS en production
  (`next.config.mjs`, `index.ts:49-66`).
- **`images: { unoptimized: true }`** — l'endpoint d'optimisation Next, qui ferait
  passer des images téléversées dans `sharp`, est fermé.
- **Refus de démarrer** en production sur secret de développement, secret court,
  secrets identiques ou limitation de débit désactivée (`src/env.ts:56-87`).
- **Journalisation expurgée** de `authorization`, `cookie`, `body.password`,
  `body.refreshToken` (`index.ts:28-31`).
- **Gestionnaire d'erreurs** qui ne laisse jamais fuir de trace d'exécution :
  tout 5xx devient `{ error: "Erreur interne" }` (`plugins/errors.ts:26-27`).
- **Aucun secret dans l'historique git** : `.env` n'a jamais été suivi, seul
  `.env.example` l'est, avec des valeurs à remplacer. `legacy/` ne lit ses clés
  Supabase que depuis l'environnement.
- **Images de production non privilégiées** (`USER app` dans les deux Dockerfile).
- **CORS** restreint aux origines déclarées en production, `credentials: false`.
- **Aucun sink XSS** : un seul `dangerouslySetInnerHTML`, sur une constante
  littérale (`lib/theme.ts`), porteur du nonce. Zéro `innerHTML`, `eval`,
  `new Function` dans le code applicatif.
- **Courses concurrentes maîtrisées** là où elles comptent : `SELECT … FOR UPDATE`
  sur l'acceptation d'une proposition (`announcements.ts:358`) et sur
  l'affiliation (`club.ts:268`), index uniques partiels sur les demandes en
  attente, index unique `(announcement_id, team_id)` sur les propositions.

---

## Failles

Chaque entrée porte un identifiant `FC-nn`, stable, réutilisé dans les messages
de commit de la phase 3.

---

### FC-01 — Contournement complet de la limitation de débit par l'en-tête `Authorization`

| | |
|---|---|
| **Sévérité** | **Haute** |
| **Catégorie OWASP** | A07:2021 — Identification and Authentication Failures (avec A04 — Insecure Design) |
| **Statut** | En attente de correction |
| **Fichier** | `apps/api/src/index.ts:79-82` |
| **Effort** | Faible (≈ 15 lignes) |
| **Risque de régression** | Moyen — voir la note de compatibilité |

**Code concerné**

```ts
// apps/api/src/index.ts:73-87
await app.register(rateLimit, {
  global: true,
  max: GLOBAL_MAX,
  timeWindow: "1 minute",
  // Un coach derrière le NAT d'un club partage l'adresse de ses collègues :
  // une fois authentifié, on compte par compte plutôt que par adresse.
  keyGenerator: (request) => {
    const header = request.headers.authorization;
    return header?.startsWith("Bearer ") ? header.slice(7, 40) : (request.ip ?? "anonyme");
  },
```

L'intention est juste — ne pas faire partager un quota à tous les coachs d'un
même club derrière le même NAT. La mise en œuvre l'est moins : la clé est
dérivée du **contenu brut de l'en-tête**, avant toute vérification de signature.
N'importe quelle chaîne commençant par `Bearer ` fabrique un compartiment de
comptage neuf.

Les plafonds spécifiques de `lib/rateLimits.ts` ne redéfinissent que `max` et
`timeWindow` ; ils **héritent** de ce `keyGenerator`. La protection de
`/auth/login`, `/auth/refresh`, `/auth/forgot-password` et
`/auth/register-coach` tombe donc avec lui.

**Scénario d'exploitation** — confirmé par preuve de concept

Le PoC rejoue la configuration exacte du dépôt (mêmes versions de `fastify` et
`@fastify/rate-limit`, même `keyGenerator`, même `authRateLimit`) et envoie
60 tentatives de connexion :

```
Sans Authorization       : 10 tentatives traitées, 50 bloquées (429)
Bearer aléatoire         : 60 tentatives traitées, 0 bloquées (429)

Verdict :
  plafond attendu sur /auth/login = 10 tentatives / minute
  tentatives passées sans header  = 10
  tentatives passées avec Bearer  = 60
  => CONTOURNEMENT CONFIRME : 60/60 tentatives au lieu de 10/60.
```

Concrètement, un attaquant qui vise `admin@demo.fr` (adresse publiée dans le
`README.md`) envoie ses tentatives ainsi :

```
POST /api/auth/login
Authorization: Bearer 1        {"email":"admin@demo.fr","password":"..."}
Authorization: Bearer 2        {"email":"admin@demo.fr","password":"..."}
...
```

et ne rencontre **jamais** de 429 : ni le plafond de 10/minute, ni le plafond
global de 300/minute. Il n'existe par ailleurs aucun verrouillage de compte
après N échecs, et aucun second facteur sur le compte administrateur (limite
déjà assumée dans le `README.md`). Combinée à FC-09 (mot de passe de 8
caractères sans autre exigence), cette faille rend le devinage de mot de passe à
distance illimité et parallélisable.

À noter : le `README.md` (§ Sécurité, « Limitation de débit ») documente ce
comportement comme une fonctionnalité — « Comptées par compte une fois
authentifié ». La documentation devra être corrigée avec le code.

**Correction proposée**

Ne dériver la clé que d'une identité **vérifiée**, et retomber sur l'adresse
réseau sinon :

1. Vérifier la signature du jeton dans le `keyGenerator` (`jwt.verify` en
   `try/catch`) et n'employer `payload.sub` comme clé qu'en cas de succès ;
   sinon utiliser `request.ip`. Le surcoût est une vérification HMAC par
   requête — négligeable, et déjà payée en aval par `requireAuth`.
2. Ou, plus simple et sans coût : préfixer la clé par l'adresse
   (`${request.ip}:${sub}`), ce qui borne le nombre de compartiments qu'une même
   source peut créer.
3. Dans les deux cas, forcer `keyGenerator: (r) => r.ip` sur les routes
   d'authentification, où l'appelant n'est par définition pas encore authentifié.

**Note de compatibilité** — l'option 1 change le comportement pour les coachs
d'un même club derrière un NAT partagé : tant qu'ils sont authentifiés ils
gardent un quota par compte, mais un jeton expiré les fait retomber sur le
quota d'adresse partagé. Avec 300 requêtes/minute le risque de gêne est faible,
mais **je préfère une validation explicite avant de trancher** entre les options
1 et 2.

---

### FC-02 — `trustProxy: true` : l'adresse cliente est celle que le client déclare

| | |
|---|---|
| **Sévérité** | **Haute** |
| **Catégorie OWASP** | A04:2021 — Insecure Design |
| **Statut** | En attente de correction |
| **Fichier** | `apps/api/src/index.ts:33-35` |
| **Effort** | Faible (1 ligne) — mais dépend de la topologie de déploiement |
| **Risque de régression** | **Élevé si mal réglé** : une valeur trop stricte ferait compter tout le trafic sur l'adresse du proxy |

**Code concerné**

```ts
// apps/api/src/index.ts:33-35
// Derrière le proxy Next : sans cela l'adresse vue est celle du proxy, et la
// limitation de débit compterait tout le trafic sur un seul compteur.
trustProxy: true,
```

`trustProxy: true` indique à Fastify de faire confiance à **tous** les sauts :
`request.ip` devient l'entrée la plus à gauche de `X-Forwarded-For`, c'est-à-dire
une valeur que le client contrôle intégralement.

**Scénario d'exploitation**

Cette faille est le pendant de FC-01 et se lit avec elle. Une fois FC-01
corrigée, la limitation sur `/auth/login` retombe sur `request.ip` — donc sur
`X-Forwarded-For`. Il suffit alors d'incrémenter cet en-tête à chaque tentative
pour retrouver un devinage illimité :

```
POST /api/auth/login
X-Forwarded-For: 10.0.0.1     {"email":"cible@club.fr","password":"..."}
X-Forwarded-For: 10.0.0.2     {"email":"cible@club.fr","password":"..."}
```

**Corriger FC-01 sans corriger FC-02 ne rétablit donc aucune protection.** Les
deux vont ensemble.

**Correction proposée**

Remplacer `trustProxy: true` par le nombre de sauts de confiance réels, ou par
la liste des adresses de confiance :

- déploiement actuel (navigateur → `web` (Next) → `api`) : `trustProxy: 1` ;
- avec un reverse proxy TLS en façade, recommandé par le `README.md`
  (navigateur → nginx/traefik → `web` → `api`) : `trustProxy: 2` ;
- variante robuste à la topologie : faire confiance au sous-réseau Docker
  (`trustProxy: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]`).

**À vérifier avant application** : je n'ai pas pu observer la chaîne de proxy
réelle de votre production (je ne sais pas si un reverse proxy TLS est déjà en
place, ni s'il réécrit ou ajoute `X-Forwarded-For`). Le nombre de sauts en
dépend, et une erreur ici casse la limitation de débit dans un sens ou dans
l'autre. **Question bloquante pour ce point précis** : y a-t-il un
nginx/traefik/Caddy devant le service `web` en production ?

---

### FC-03 — L'API de production ne démarre pas, et les photos de profil sont perdues

| | |
|---|---|
| **Sévérité** | **Haute** (disponibilité et intégrité des données) |
| **Catégorie OWASP** | A05:2021 — Security Misconfiguration |
| **Statut** | En attente de correction |
| **Fichiers** | `docker-compose.prod.yml:32`, `apps/api/Dockerfile:16-27`, `apps/api/src/index.ts:94` |
| **Effort** | Faible (2 lignes) |
| **Risque de régression** | Nul — le chemin corrigé est celui qui fonctionne déjà en développement |

**Code concerné**

```yaml
# docker-compose.prod.yml:28-32
  api:
    build:
      target: prod
    ...
    volumes: []          # ← retire TOUS les volumes du fichier de base,
                         #   y compris uploads:/app/uploads
```

```dockerfile
# apps/api/Dockerfile:16-27 (étage prod)
FROM node:22-alpine AS prod
WORKDIR /app
...
RUN addgroup -S app && adduser -S app -G app
USER app                 # ← /app appartient à root, l'utilisateur app n'y écrit pas
```

```ts
// apps/api/src/index.ts:94 — au niveau module, avant app.listen()
await mkdir(UPLOADS_DIR, { recursive: true });
```

`volumes: []` en production est nécessaire pour supprimer les *bind mounts* de
rechargement à chaud — mais il emporte aussi le volume nommé `uploads`. Il ne
reste alors que le système de fichiers de l'image, où `/app` appartient à `root`
alors que le processus tourne en `app`.

**Scénario d'exploitation** — confirmé par test conteneurisé

Ce n'est pas une faille exploitable par un attaquant, mais un défaut de
configuration qui **empêche le service de démarrer**. J'ai reproduit la
séquence exacte de l'étage `prod` dans un conteneur jetable :

```
Error: EACCES: permission denied, mkdir '/app/uploads'
  errno: -13, code: 'EACCES', syscall: 'mkdir', path: '/app/uploads'
```

`index.ts:94` est un `await` de premier niveau, avant le `try` qui entoure
`app.listen`. L'exception n'est pas rattrapée : **le conteneur `api` de
production s'arrête au démarrage**, en boucle avec `restart: unless-stopped`.

Second effet, si le volume est rétabli sans plus : un volume nommé Docker sur un
point de montage absent de l'image est créé appartenant à `root`. `mkdir`
réussirait (le dossier existe), mais `writeFile` à l'envoi d'un avatar
échouerait — 500 sur `POST /me/avatar`.

Le `README.md` demande par ailleurs de « sauvegarder la base **et** le volume
`uploads` » : la configuration de production le contredit.

**Correction proposée**

1. `docker-compose.prod.yml` — remettre le seul volume qui doit survivre :

```yaml
  api:
    volumes:
      - uploads:/app/uploads
```

2. `apps/api/Dockerfile`, étage `prod` — créer le dossier et le donner à `app`
   avant de changer d'utilisateur :

```dockerfile
RUN addgroup -S app && adduser -S app -G app \
 && mkdir -p /app/uploads && chown app:app /app/uploads
USER app
```

Le point 2 rend le service démarrable même sans volume, et règle du même coup
l'appartenance du volume nommé.

---

### FC-04 — Le jeu de données de démonstration crée un administrateur à mot de passe publié

| | |
|---|---|
| **Sévérité** | **Haute** |
| **Catégorie OWASP** | A07:2021 — Identification and Authentication Failures |
| **Statut** | En attente de correction |
| **Fichiers** | `apps/api/src/seed.ts:8`, `:59`, `README.md:154` |
| **Effort** | Faible (5 lignes) |
| **Risque de régression** | Nul en développement |

**Code concerné**

```ts
// apps/api/src/seed.ts:8
const PASSWORD = "Demo1234!";
...
// apps/api/src/seed.ts:59
await upsertUser({ email: "admin@demo.fr", role: "admin", firstName: "Alice", lastName: "Admin" });
```

Le script ne consulte jamais `NODE_ENV` ni la cible de `DATABASE_URL`. Il crée
un compte `admin` dont l'adresse et le mot de passe sont publiés dans le
`README.md` du dépôt, et `upsertUser` utilise `onConflictDoUpdate` : rejouer le
seed **réécrit** les comptes existants portant ces adresses.

**Scénario d'exploitation**

Le `README.md` place la commande de seed juste après le démarrage, sans
distinguer les environnements :

```
docker compose exec api npm run db:seed --workspace apps/api
```

Un opérateur qui suit ces instructions sur la pile de production — ou qui
exporte un `DATABASE_URL` de production pour la variante hors Docker
(`README.md:225`) — obtient un compte `admin@demo.fr` / `Demo1234!` avec accès à
`/admin/**` : liste de tous les comptes et de leurs adresses, réinitialisation
du mot de passe de n'importe quel compte non-admin, désactivation, suppression,
changement d'adresse de connexion. L'attaquant n'a rien à deviner : les deux
valeurs sont dans le dépôt.

Le mot de passe est un secret d'exemple, non un secret réel : il n'y a pas de
rotation à faire, seulement un garde-fou à poser.

**Correction proposée**

1. Refuser l'exécution en production, en tête de `main()` :

```ts
if (process.env.NODE_ENV === "production") {
  console.error("Le seed de démonstration est refusé en production.");
  process.exit(1);
}
```

2. Exiger un consentement explicite pour toute autre cible que `localhost` /
   `postgres` (variable `FOOTCOACH_SEED_CONFIRM=oui`), afin de couvrir le cas du
   `DATABASE_URL` pointé à la main.
3. Tirer le mot de passe de démonstration de l'environnement, avec `Demo1234!`
   en valeur de repli locale, et remplacer sa mention dans le `README.md`.

---

### FC-05 — Dépendances vulnérables : `sharp`, `postcss`, `esbuild`

| | |
|---|---|
| **Sévérité** | **Moyenne** |
| **Catégorie OWASP** | A06:2021 — Vulnerable and Outdated Components |
| **Statut** | En attente de correction |
| **Fichiers** | `apps/web/package.json`, `apps/api/package.json`, `package-lock.json` |
| **Effort** | Moyen (montées de version majeures, `drizzle-kit` 0.30 → 0.31) |
| **Risque de régression** | Moyen — à valider par un build complet |

`npm audit` : **7 vulnérabilités (3 hautes, 4 modérées)**.

| Paquet | Version installée | Avis | Sévérité | Chemin | Exploitable ici ? |
|---|---|---|---|---|---|
| `sharp` | 0.34.5 | GHSA-f88m-g3jw-g9cj — CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 (libvips) | Haute | `next` → `sharp` | **Non** en l'état : `images: { unoptimized: true }` ferme l'endpoint d'optimisation, et l'application n'emploie pas `next/image`. Le paquet est présent mais jamais sollicité par une donnée externe. |
| `postcss` | 8.4.31 (imbriqué dans `next`) | GHSA-qx2v-qp2m-jg93 (XSS via `</style>` non échappé), GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 (lecture de fichier arbitraire via `sourceMappingURL`) | Haute | `next` → `postcss` | **Non** à l'exécution : ne sert qu'au build, sur des feuilles de style du dépôt. Le `postcss` de premier niveau (8.5.21) n'est pas concerné. |
| `esbuild` | 0.18.20 / 0.19.12 | GHSA-67mh-4wv8-2f99 — tout site web peut interroger le serveur de développement et lire la réponse | Modérée | `drizzle-kit` → `@esbuild-kit/*` → `esbuild` | **Non** : dépendance de développement, serveur `esbuild` jamais démarré. `tsx` embarque déjà `esbuild` 0.28.1, sain. |

**Scénario d'exploitation**

Aucun des trois n'est atteignable par une requête sur l'application déployée en
l'état — c'est une dette, pas une porte ouverte. Le risque réel est le
changement de configuration futur : retirer `unoptimized: true`, ou employer
`next/image` une seule fois, expose immédiatement `sharp` à des images
téléversées par les utilisateurs, avec quatre CVE libvips à la clé.

**Correction proposée**

- **Ne pas lancer `npm audit fix --force`** : il propose `next@9.3.3`, soit sept
  versions majeures en arrière. Cela casserait l'application.
- Monter `next` vers la dernière 16.x embarquant `sharp` ≥ 0.35.0 et `postcss`
  ≥ 8.5.18, puis relancer `npm run build --workspace apps/web`.
- Monter `drizzle-kit` en 0.31.x (majeure, outil de développement seulement :
  `db:generate`). Vérifier que `drizzle-kit generate` produit toujours le même
  SQL sur le schéma actuel.
- Conserver `images: { unoptimized: true }` tant que `sharp` n'est pas à jour, et
  commenter ce lien dans `next.config.mjs` pour que le prochain qui voudra
  activer `next/image` sache ce qu'il déclenche.

---

### FC-06 — Lecture de n'importe quel match par son identifiant (IDOR)

| | |
|---|---|
| **Sévérité** | **Moyenne** |
| **Catégorie OWASP** | A01:2021 — Broken Access Control |
| **Statut** | En attente de correction |
| **Fichier** | `apps/api/src/routes/matches.ts:89-93` |
| **Effort** | Faible (1 ligne) |
| **Risque de régression** | **À valider** — un écran supporter consomme peut-être cette route |

**Code concerné**

```ts
// apps/api/src/routes/matches.ts:89-93
app.get("/matches/:id", async (request): Promise<MatchDetailDto> => {
  const { id } = request.params as { id: string };
  const row = await getMatchOr404(id);
  return toDto(row, request.user.teamId);
});
```

Toutes les autres routes de ce fichier appellent `assertCoachOfMatch`
(`:111`, `:185`, `:201`, `:239`). Celle-ci non : `requireAuth` suffit, sans
aucune vérification d'appartenance au match.

**Scénario d'exploitation**

Tout compte authentifié — n'importe quel coach inscrit en autonomie via
`/register` — peut lire le détail complet d'un match auquel il est étranger :
noms et villes des deux équipes, date, heure, lieu exact, statut, score, et
surtout **le motif et la précision libre du désistement** (`withdrawalReason`,
`withdrawalDetails`), champ de texte libre qui peut contenir une information
sensible (« blessure de X », « effectif insuffisant »).

Le jeton du QR de confirmation, lui, reste protégé : `toDto:43` ne le rend qu'à
l'équipe qui a saisi le score. Il n'y a donc **pas** de validation de score
falsifiable par ce biais.

Portée de l'exploitation : les identifiants sont des UUID v4, l'énumération
exhaustive est hors d'atteinte. La fuite se matérialise quand un identifiant est
connu autrement — lien partagé, capture d'écran, en-tête `Referer`, ou un
identifiant obtenu légitimement puis conservé après que le coach a quitté
l'équipe.

**Correction proposée**

Ajouter la vérification que portent déjà les quatre autres routes :

```ts
app.get("/matches/:id", async (request): Promise<MatchDetailDto> => {
  const { id } = request.params as { id: string };
  const row = await getMatchOr404(id);
  assertCoachOfMatch(row.match, request.user.teamId);
  return toDto(row, request.user.teamId);
});
```

**Question avant application** : `apps/web/src/app/supporter/matches/[id]/page.tsx`
existe et consommerait cette route. Le rôle `supporter` ne peut pas se connecter
en V1 (`isV1Role`), donc l'écran est mort — mais le durcissement ci-dessus
fermera définitivement la route aux rôles sans équipe le jour où les supporters
reviendront. Confirmez-vous que c'est le comportement voulu, ou faut-il prévoir
dès maintenant une lecture élargie aux membres des deux équipes ?

---

### FC-07 — Les compteurs de débit ne sont pas partagés entre réplicas

| | |
|---|---|
| **Sévérité** | **Moyenne** |
| **Catégorie OWASP** | A04:2021 — Insecure Design |
| **Statut** | En attente de correction |
| **Fichiers** | `apps/api/src/index.ts:73-87`, `README.md:167` |
| **Effort** | Moyen (magasin partagé à introduire) |
| **Risque de régression** | Faible |

`@fastify/rate-limit` est enregistré sans option `store` : les compteurs vivent
dans la mémoire de chaque processus. Or le `README.md` documente et encourage la
mise à l'échelle horizontale :

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale api=3
```

**Scénario d'exploitation**

Avec trois réplicas et une répartition par DNS interne Docker, un attaquant
obtient **3 × 10 = 30 tentatives de connexion par minute** au lieu de 10, sans
rien faire de particulier : les requêtes tombent naturellement sur des réplicas
différents. Le facteur suit le nombre de réplicas.

Cette faille est indépendante de FC-01 et FC-02, mais elle plafonne le bénéfice
de leur correction : sans magasin partagé, la limitation reste approximative
dès qu'on dépasse un réplica.

**Correction proposée**

Deux voies, à choisir selon votre appétence pour une dépendance de plus :

1. **Redis** (`@fastify/rate-limit` accepte `redis: <client ioredis>`) : un
   service de plus dans `docker-compose`, compteurs exacts. C'est la voie
   standard.
2. **Sans nouveau service** : limiter les tentatives de connexion en base, sur la
   table `login_events` déjà présente — compter les échecs par adresse et par
   compte sur une fenêtre glissante. Plus de code, aucune infrastructure
   supplémentaire, et cela apporte au passage la trace des échecs qui manque
   aujourd'hui (seules les connexions **réussies** sont enregistrées).

**Ceci ajoute un service ou une table : je ne l'applique pas sans votre
validation** (règle « pas de changement de schéma ni d'infra sans accord »).

---

### FC-08 — Le type d'un fichier téléversé n'est jamais vérifié au-delà de ce que le client déclare

| | |
|---|---|
| **Sévérité** | **Moyenne** |
| **Catégorie OWASP** | A04:2021 — Insecure Design (A03 pour la partie contenu) |
| **Statut** | En attente de correction |
| **Fichier** | `apps/api/src/routes/relations.ts:58-91` |
| **Effort** | Faible (≈ 20 lignes, sans dépendance) |
| **Risque de régression** | Faible |

**Code concerné**

```ts
// apps/api/src/routes/relations.ts:62-63
const extension = ALLOWED_IMAGE_TYPES[file.mimetype];
if (!extension) throw new HttpError(400, "Format accepté : JPEG, PNG ou WebP");
...
// :77-79
const fileName = `${request.user.id}-${randomUUID().slice(0, 8)}.${extension}`;
await writeFile(path.join(UPLOADS_DIR, fileName), buffer);
```

`file.mimetype` est le `Content-Type` de la partie multipart, c'est-à-dire une
chaîne fournie par le client. Le contenu réel du fichier n'est jamais examiné.

**Scénario d'exploitation**

Un coach authentifié envoie n'importe quels octets — exécutable, archive, page
HTML — déclarés `image/png`. Le fichier est écrit dans le volume `uploads` et
servi publiquement, **sans authentification**, sous
`/api/uploads/<uuid>-xxxxxxxx.png` (`index.ts:95-101`, `routes/auth.ts:62`).

Ce que cela ne permet **pas** : l'exécution de script dans le navigateur. Trois
défenses tiennent : `fastify-static` déduit le `Content-Type` de l'extension, qui
est toujours `jpg`/`png`/`webp` ; `helmet` pose `X-Content-Type-Options: nosniff`
et une CSP `default-src 'none'` sur la réponse ; et `next.config.mjs` repose
`nosniff` sur tout `/:path*`. Le SVG, seul format image réellement dangereux,
n'est pas dans la liste blanche. **Je n'ai pas trouvé de chemin d'exécution
depuis ce point** — c'est un défaut de validation, pas un XSS stocké.

Ce que cela permet : héberger et distribuer du contenu arbitraire depuis votre
nom de domaine (le lien est stable et public, l'URL ne fuit que par l'avatar du
coach, mais elle est devinable pour qui connaît un `user.id`) ; et soumettre les
décodeurs d'image des navigateurs de tous les coachs du réseau à un fichier
malformé.

Point connexe, sans gravité mais à corriger dans la même passe : la limite de
taille est déclarée deux fois (`index.ts:90` et `relations.ts:59`), avec la même
valeur. Une seule constante partagée éviterait qu'elles divergent.

**Correction proposée**

Vérifier la signature du contenu après `toBuffer()`, sans dépendance :

```ts
function sniffImageType(buf: Buffer): "jpg" | "png" | "webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}
```

puis dériver l'extension du **résultat du reniflage**, et refuser en 400 si
celui-ci ne concorde pas avec le type déclaré.

---

### FC-09 — Politique de mot de passe : 8 caractères, aucune autre exigence

| | |
|---|---|
| **Sévérité** | **Moyenne** |
| **Catégorie OWASP** | A07:2021 — Identification and Authentication Failures |
| **Statut** | En attente de correction |
| **Fichiers** | `packages/shared/src/index.ts:124`, `:193` |
| **Effort** | Faible (schéma + message d'interface) |
| **Risque de régression** | **Aucun sur les comptes existants** — voir la note |

**Code concerné**

```ts
// packages/shared/src/index.ts:122-125
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
// :193
password: z.string().min(8, "8 caractères minimum"),
```

Huit caractères, sans autre contrainte, sans liste de mots de passe interdits.
`motdepasse`, `12345678` et `footcoach` sont acceptés. Il n'y a par ailleurs
aucun verrouillage de compte après N échecs.

**Scénario d'exploitation**

Prise isolément, cette faille est une faiblesse classique et bornée par la
limitation de débit. Mais la limitation de débit ne fonctionne pas (FC-01,
FC-02) : la conjonction des trois rend le devinage à distance illimité **et**
l'espace de recherche petit. C'est cette combinaison qui fait la gravité, plus
que chacun des éléments.

**Correction proposée**

- Porter le minimum à 12 caractères à l'**inscription** et au changement de mot
  de passe, et refuser les mots de passe les plus courants (liste courte
  embarquée, ou vérification de type k-anonymat auprès d'un service de mots de
  passe compromis — mais cela ajoute un appel réseau sortant, à valider).
- **Ne pas toucher à `loginSchema`** : y relever le minimum verrouillerait
  dehors les comptes existants dont le mot de passe fait 8 à 11 caractères, et
  les mots de passe temporaires générés par l'admin en font 10
  (`lib/passwords.ts:6`). La connexion doit continuer d'accepter ce qui existe.
- Aligner `generateTempPassword()` sur la nouvelle longueur (12 caractères de
  l'alphabet non ambigu ≈ 68 bits, largement suffisant pour un mot de passe à
  usage unique).
- Prévoir, à terme, un verrouillage temporaire progressif après échecs répétés.
  Cela suppose une table ou un magasin partagé : lié à FC-07, même arbitrage.

---

### FC-10 — Postgres exposé sur l'hôte avec un mot de passe par défaut en développement

| | |
|---|---|
| **Sévérité** | **Moyenne** |
| **Catégorie OWASP** | A05:2021 — Security Misconfiguration |
| **Statut** | En attente de correction |
| **Fichiers** | `docker-compose.yml:7-16`, `.env.example:3`, `:7` |
| **Effort** | Faible |
| **Risque de régression** | Faible — gêne le développement hors Docker si le port disparaît |

**Code concerné**

```yaml
# docker-compose.yml:7-16
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme-in-prod}
...
ports:
  - "5433:5432"
```

```
# .env.example:3, :7
POSTGRES_PASSWORD=changeme-in-prod
DATABASE_URL=postgres://footcoach:changeme-in-prod@postgres:5432/footcoach
```

**Scénario d'exploitation**

En production, `docker-compose.prod.yml` remet `ports: []` et exige
`POSTGRES_POSTGRES:?` — la faille ne s'y matérialise pas. Elle porte sur le poste
de développement : le port 5433 écoute sur **toutes** les interfaces de l'hôte
(Docker publie sur `0.0.0.0` par défaut), avec un mot de passe écrit dans le
dépôt. Sur un réseau de bureau, de coworking ou un Wi-Fi partagé, n'importe qui
sur le même segment atteint la base de développement : lecture complète, y
compris les empreintes bcrypt et les adresses de tous les comptes de test.

Deuxième effet : `cp .env.example .env` est la première commande du `README.md`.
Un déploiement qui suit le guide sans relire le fichier part avec
`changeme-in-prod`. La barrière tient — `docker-compose.prod.yml` refuse de
démarrer — mais elle tient sur une seule ligne de compose.

**Correction proposée**

1. Restreindre la publication du port à la boucle locale :
   `- "127.0.0.1:5433:5432"`. Le développement hors Docker continue de
   fonctionner ; l'accès depuis le réseau disparaît.
2. Retirer la valeur de repli `changeme-in-prod` du `docker-compose.yml` de base
   et la remplacer par `${POSTGRES_PASSWORD:?...}`, comme le fichier de
   production. Le développement exige alors un `.env`, ce que le `README.md`
   demande déjà en première étape.
3. Dans `.env.example`, remplacer les mots de passe par des marqueurs explicites
   (`<a-generer>`) plutôt que par une valeur qui fonctionne.

---

### FC-11 — Identifiants d'objet non validés : erreurs 500 et bruit de journalisation

| | |
|---|---|
| **Sévérité** | **Basse** |
| **Catégorie OWASP** | A03:2021 — Injection (validation d'entrée) |
| **Statut** | En attente de correction |
| **Fichiers** | ~20 routes — `matches.ts:90`, `:112`, `:186`, `:202`, `:240` ; `events.ts:157`, `:179` ; `announcements.ts:269`, `:284`, `:328`, `:351`, `:440` ; `admin.ts:214`, `:230`, `:239`, `:246`, `:261` ; `club.ts:130`, `:147`, `:300`, `:314` ; `relations.ts:162` |
| **Effort** | Faible mais répétitif |
| **Risque de régression** | Faible — un 400 remplace un 500 |

**Code concerné**

```ts
// motif répété partout
const { id } = request.params as { id: string };
```

Le transtypage TypeScript ne valide rien à l'exécution. La chaîne part
directement dans `eq(matches.id, id)`, sur une colonne `uuid`.

**Scénario d'exploitation**

`GET /api/matches/pas-un-uuid` déclenche l'erreur Postgres 22P02 (*invalid input
syntax for type uuid*). `plugins/errors.ts` la rattrape correctement — le client
reçoit `{ error: "Erreur interne" }`, **aucune trace d'exécution ne fuit** — mais
`app.log.error(error)` écrit l'erreur complète dans les journaux. Un attaquant
peut donc gonfler le volume de journalisation à volonté, et masquer une attaque
réelle dans le bruit. Il n'y a ni injection ni fuite d'information.

**Correction proposée**

Un schéma Zod partagé, appliqué là où l'identifiant est un UUID :

```ts
// packages/shared/src/index.ts
export const idParamSchema = z.object({ id: z.string().uuid() });
```

```ts
const { id } = idParamSchema.parse(request.params);   // → 400 « Données invalides »
```

Le `ZodError` est déjà transformé en 400 par le gestionnaire d'erreurs, sans
travail supplémentaire.

---

### FC-12 — `jwt.verify` sans épinglage d'algorithme

| | |
|---|---|
| **Sévérité** | **Basse** — durcissement, non exploitable en l'état |
| **Catégorie OWASP** | A02:2021 — Cryptographic Failures |
| **Statut** | En attente de correction |
| **Fichier** | `apps/api/src/plugins/auth.ts:46` |
| **Effort** | Trivial (1 ligne) |
| **Risque de régression** | Nul |

**Code concerné**

```ts
// apps/api/src/plugins/auth.ts:46
const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
```

Ni `algorithms`, ni `issuer`, ni `audience`.

**Vérification** — j'ai testé l'exploitabilité avec la version installée
(`jsonwebtoken` 9.0.3) plutôt que de la supposer :

```
jsonwebtoken : 9.0.3
alg=none  -> refusé : jwt signature is required
HS256     -> accepté (contrôle OK)
```

L'attaque `alg: none` est **refusée** par la bibliothèque. Le secret étant une
chaîne, la confusion HS/RS n'a pas de prise non plus. **Il n'y a pas de faille
exploitable ici**, seulement une garantie qui repose sur le comportement par
défaut d'une dépendance au lieu d'être écrite dans le code — et qui pourrait
changer à une montée de version.

**Correction proposée**

```ts
const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET, {
  algorithms: ["HS256"],
}) as jwt.JwtPayload;
```

Et le pendant à la signature (`plugins/auth.ts:34`) : `algorithm: "HS256"`
explicite.

---

### FC-13 — L'équipe active du jeton n'est pas revérifiée pendant 15 minutes

| | |
|---|---|
| **Sévérité** | **Basse** |
| **Catégorie OWASP** | A01:2021 — Broken Access Control |
| **Statut** | En attente de correction |
| **Fichier** | `apps/api/src/plugins/auth.ts:56-69` |
| **Effort** | Faible (une requête de plus par requête coach) |
| **Risque de régression** | Faible (coût en latence) |

**Code concerné**

```ts
// apps/api/src/plugins/auth.ts:56-68
// Par défaut = équipe principale (celle du token). On ne valide en base
// que si une autre équipe est explicitement demandée.
if (requested && requested !== request.user.teamId) {
  const teamIds = await getCoachTeamIds(request.user.id);
  ...
}
```

L'équipe portée par le jeton est acceptée sans relecture. Un coach retiré de son
équipe (`DELETE /club/teams/:id/coaches/:coachId`) conserve donc ses droits
dessus jusqu'à l'expiration du jeton : publier une annonce au nom de l'équipe,
lire son agenda, saisir un score.

**Scénario d'exploitation**

Fenêtre de 15 minutes au maximum, et il faut que le coach ait été retiré
pendant qu'il était connecté. Le `README.md` assume déjà la limite jumelle
(« le jeton d'accès reste valable jusqu'à 15 minutes après une désactivation de
compte »). Le retrait d'équipe passe par l'espace club, inatteignable en V1 :
l'exposition est aujourd'hui théorique.

**Correction proposée**

Deux options, l'arbitrage étant un compromis latence / fraîcheur :

1. Valider systématiquement `request.user.teamId` contre `team_coaches` (une
   requête indexée par requête coach) ;
2. Ou révoquer les jetons de rafraîchissement du coach lors du retrait d'équipe,
   comme le fait déjà `revokeAllSessions` à la désactivation
   (`admin.ts:28-33`), et accepter la fenêtre de 15 minutes.

Je recommande l'option 2 : même garantie effective, aucun coût par requête,
cohérente avec ce qui existe.

---

### FC-14 — Énumération de comptes à l'inscription

| | |
|---|---|
| **Sévérité** | **Basse** |
| **Catégorie OWASP** | A01:2021 — Broken Access Control (fuite d'information) |
| **Statut** | En attente de correction |
| **Fichier** | `apps/api/src/routes/registration.ts:21-24` |
| **Effort** | Faible, mais compromis d'expérience utilisateur |
| **Risque de régression** | Faible |

**Code concerné**

```ts
// apps/api/src/routes/registration.ts:21-24
async function assertEmailFree(email: string) {
  const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (existing) throw new HttpError(400, "Un compte existe déjà avec cet email");
}
```

`/auth/login` et `/auth/forgot-password` sont soigneux — réponse identique que le
compte existe ou non. `/auth/register-coach` annule ce soin : il dit
explicitement qu'une adresse est déjà inscrite. Même remarque pour
`admin.ts:115` et `club.ts:212`, mais ces deux-là sont derrière un rôle
privilégié et n'apprennent rien à leur appelant.

**Scénario d'exploitation**

Un attaquant teste des adresses sur `/auth/register-coach` et distingue les
inscrits des autres. Le plafond est de 5 tentatives par 10 minutes — **sauf que
FC-01 le rend inopérant**, ce qui transforme une fuite marginale en énumération
de masse. La correction de FC-01 réduit à elle seule la portée de celle-ci.

L'information obtenue reste limitée : « cette adresse a un compte FootCoach ».

**Correction proposée**

Il n'existe pas de correction sans coût : masquer le conflit oblige à un parcours
d'inscription par confirmation d'adresse (envoyer un courriel dans les deux cas,
ne rien dire à l'appelant) — or l'application n'envoie aucun courriel
aujourd'hui (« pas d'envoi d'email dans cette version », `db/schema.ts:124`).

Je propose donc de **documenter cette fuite comme acceptée** et de la refermer le
jour où l'envoi de courriel arrivera. À arbitrer par vous : la fermer maintenant
supposerait de construire tout le circuit de confirmation par courriel, ce qui
dépasse de loin le périmètre d'un audit de sécurité.

---

### FC-15 — Comparaison du jeton de confirmation de score non constante en temps

| | |
|---|---|
| **Sévérité** | **Basse** |
| **Catégorie OWASP** | A02:2021 — Cryptographic Failures |
| **Statut** | En attente de correction |
| **Fichier** | `apps/api/src/routes/matches.ts:252` |
| **Effort** | Trivial (3 lignes) |
| **Risque de régression** | Nul |

**Code concerné**

```ts
// apps/api/src/routes/matches.ts:252
if (input.token !== match.confirmationToken) {
```

Comparaison de chaînes court-circuitée : elle s'arrête au premier octet qui
diffère, et sa durée dépend donc du nombre d'octets corrects.

**Scénario d'exploitation**

Théorique. Le jeton fait 24 octets aléatoires en base64url
(`matches.ts:210`), soit 192 bits ; l'attaquant doit déjà être le coach de
l'équipe adverse (`assertCoachOfMatch` puis la vérification du côté opposé) ; et
le bruit réseau sur une comparaison de 32 caractères noie très largement l'écart
mesurable. **Je ne peux pas démontrer d'exploitation réelle** — c'est une
correction d'hygiène, pas la fermeture d'une porte.

**Correction proposée**

```ts
import { timingSafeEqual } from "node:crypto";

const expected = Buffer.from(match.confirmationToken);
const given = Buffer.from(input.token);
if (expected.length !== given.length || !timingSafeEqual(expected, given)) { … }
```

---

### FC-16 — Coût bcrypt de 10, avec une implémentation en JavaScript pur

| | |
|---|---|
| **Sévérité** | **Basse** |
| **Catégorie OWASP** | A02:2021 — Cryptographic Failures |
| **Statut** | En attente de correction |
| **Fichiers** | `apps/api/src/routes/registration.ts:41`, `admin.ts:118`, `:217`, `club.ts:215`, `seed.ts:22` |
| **Effort** | Faible (une constante partagée) |
| **Risque de régression** | Faible — latence de connexion en hausse |

**Code concerné**

```ts
const passwordHash = await bcrypt.hash(input.password, 10);   // 5 occurrences
```

Le coût 10 (2¹⁰ itérations) était la valeur par défaut recommandée il y a dix
ans ; l'usage courant en 2026 est 12 à 14. `bcryptjs` est par ailleurs une
implémentation en JavaScript pur, environ un ordre de grandeur plus lente que le
binding natif — ce qui, paradoxalement, rend le coût 10 plus défensif ici qu'il
ne le serait avec `bcrypt` natif, mais pèse sur la latence de connexion.

**Scénario d'exploitation**

Suppose une fuite préalable de la table `users`. Avec un coût 10, un attaquant
équipé de GPU attaque les empreintes plus vite qu'avec 12. Combiné à FC-09
(8 caractères), le rendement d'une telle attaque est élevé.

**Correction proposée**

- Réunir le coût dans une constante unique de `lib/passwords.ts` et le porter à
  12. Les empreintes existantes restent valides : bcrypt lit le coût dans
  l'empreinte, la vérification continue de fonctionner. Prévoir, si souhaité, un
  réencodage opportuniste à la prochaine connexion réussie.
- **Question de compatibilité** : le coût 12 avec `bcryptjs` représente environ
  4× le temps actuel — de l'ordre de quelques centaines de millisecondes par
  connexion sur le matériel du conteneur. Si cette latence vous dérange, la voie
  propre est de passer à `node:crypto.scrypt` (natif, aucune dépendance) plutôt
  que de garder un coût bas. **Cela change le format des empreintes stockées et
  demande une migration** : je ne l'applique pas sans votre accord.

---

### FC-17 — Jetons de session dans `localStorage`

| | |
|---|---|
| **Sévérité** | **Informationnelle** — compromis assumé, cohérent |
| **Catégorie OWASP** | A05:2021 — Security Misconfiguration |
| **Statut** | Aucune action recommandée |
| **Fichier** | `apps/web/src/lib/api.ts:5-7`, `:44-49` |

Les deux jetons vivent dans `localStorage`, donc lisibles par tout script
s'exécutant dans la page. La contre-mesure normale — cookie `HttpOnly` +
`Secure` + `SameSite` — n'est pas en place.

Je ne recommande pas de changer, et je le note pour que la décision soit
explicite plutôt que subie :

- la surface d'attaque réelle, c'est le XSS ; or la CSP à nonce avec
  `strict-dynamic` (`proxy.ts`) est stricte, il n'y a aucun sink XSS dans le
  code, et le seul script en ligne est une constante littérale ;
- passer aux cookies `HttpOnly` réintroduirait la CSRF, qui n'existe pas
  aujourd'hui (`credentials: false`, aucun cookie) : il faudrait bâtir un
  circuit de jetons anti-CSRF, soit plus de code et plus de surface ;
- l'exposition est bornée par un jeton d'accès de 15 minutes et une rotation du
  jeton de rafraîchissement à chaque usage.

Le compromis est raisonnable. Ce qui le tient, c'est la CSP : toute évolution qui
la relâcherait (ajout d'un `'unsafe-inline'` en `script-src`, d'un CDN tiers)
devrait être considérée comme un changement de posture de sécurité, pas comme un
détail de configuration.

---

## Tableau récapitulatif

Trié par sévérité, puis par ordre d'intervention recommandé.

| ID | Titre | Sévérité | OWASP | Fichier principal | Statut |
|---|---|---|---|---|---|
| FC-01 | Contournement complet de la limitation de débit par `Authorization` | **Haute** | A07 | `apps/api/src/index.ts:79` | En attente |
| FC-02 | `trustProxy: true` — adresse cliente déclarée par le client | **Haute** | A04 | `apps/api/src/index.ts:35` | En attente |
| FC-03 | API de production non démarrable, photos de profil perdues | **Haute** | A05 | `docker-compose.prod.yml:32` | En attente |
| FC-04 | Seed de démonstration → administrateur à mot de passe publié | **Haute** | A07 | `apps/api/src/seed.ts:8` | En attente |
| FC-05 | Dépendances vulnérables (`sharp`, `postcss`, `esbuild`) | Moyenne | A06 | `package-lock.json` | En attente |
| FC-06 | IDOR — lecture de n'importe quel match par son identifiant | Moyenne | A01 | `apps/api/src/routes/matches.ts:89` | En attente |
| FC-07 | Compteurs de débit non partagés entre réplicas | Moyenne | A04 | `apps/api/src/index.ts:73` | En attente — **arbitrage requis** |
| FC-08 | Type de fichier téléversé jamais vérifié | Moyenne | A04 | `apps/api/src/routes/relations.ts:62` | En attente |
| FC-09 | Mot de passe : 8 caractères, aucune autre exigence | Moyenne | A07 | `packages/shared/src/index.ts:124` | En attente |
| FC-10 | Postgres publié sur l'hôte, mot de passe par défaut (développement) | Moyenne | A05 | `docker-compose.yml:15` | En attente |
| FC-11 | Identifiants d'objet non validés → 500 et bruit de journalisation | Basse | A03 | ~20 routes | En attente |
| FC-12 | `jwt.verify` sans épinglage d'algorithme (non exploitable en l'état) | Basse | A02 | `apps/api/src/plugins/auth.ts:46` | En attente |
| FC-13 | Équipe active du jeton non revérifiée pendant 15 minutes | Basse | A01 | `apps/api/src/plugins/auth.ts:56` | En attente |
| FC-14 | Énumération de comptes à l'inscription | Basse | A01 | `apps/api/src/routes/registration.ts:23` | En attente — **arbitrage requis** |
| FC-15 | Comparaison du jeton de score non constante en temps | Basse | A02 | `apps/api/src/routes/matches.ts:252` | En attente |
| FC-16 | Coût bcrypt de 10 | Basse | A02 | `apps/api/src/lib/passwords.ts` | En attente — **arbitrage requis** |
| FC-17 | Jetons de session dans `localStorage` | Informationnelle | A05 | `apps/web/src/lib/api.ts:5` | Aucune action |

**Aucune faille critique.** Aucune injection SQL, aucune injection de commande,
aucun *path traversal*, aucun XSS, aucun SSRF, aucune désinstanciation non sûre,
aucun secret dans l'historique git. Les quatre failles hautes se répartissent en
deux couples : FC-01 + FC-02 (la limitation de débit ne protège rien) et
FC-03 + FC-04 (défauts de configuration de déploiement).

### Catégories recherchées et non trouvées

Pour que l'absence soit lisible autant que la présence :

| Recherche | Résultat |
|---|---|
| Injection SQL / NoSQL | Rien. Drizzle paramètre tout ; les seules chaînes SQL brutes sont des clauses d'index sans donnée externe. |
| Injection de commande OS | Rien. Aucun `child_process`, `exec`, `spawn` dans le code applicatif. |
| *Path traversal* | Rien. Le seul nom de fichier construit vient de `user.id` + UUID (`relations.ts:77`), jamais d'une entrée client. `fastify-static` normalise sa racine. |
| SSRF | Rien. Le seul appel sortant est l'API Adresse, sur une base d'URL constante, avec `encodeURIComponent` sur le terme de recherche et des coordonnées passées par `Number.isFinite` puis arrondies (`lib/geocoding.ts:63`, `:68`). |
| XSS réfléchi / stocké / DOM | Rien. Un seul `dangerouslySetInnerHTML`, sur constante littérale. Zéro `innerHTML`, `eval`, `new Function`, `document.write`. |
| Désérialisation non sûre, XXE, injection de gabarit | Rien. Aucun XML, aucun moteur de gabarit, aucune désérialisation autre que `JSON.parse`. |
| CSRF | Structurellement hors sujet : authentification par en-tête `Bearer`, aucun cookie, `credentials: false`. |
| Secrets committés | Rien. `.env` jamais suivi par git ; `.env.example` ne contient que des marqueurs ; `legacy/` lit ses clés depuis l'environnement. |
| Fuite dans les messages d'erreur | Rien. Tout 5xx devient `{ error: "Erreur interne" }` (`plugins/errors.ts:27`). |
| Aléatoire non cryptographique | Rien de sensible. `crypto.randomBytes` pour les jetons et les codes, `crypto.getRandomValues` pour le nonce CSP. Le seul `Math.random` est le PRNG déterministe du script de simulation (`tools/simulation/simulate.mjs:26`), volontaire. |
| Courses concurrentes sur opérations critiques | Maîtrisées : `FOR UPDATE` sur l'acceptation de proposition et l'affiliation, index uniques partiels sur les demandes en attente. Il n'y a ni paiement, ni solde, ni quota consommable. |
| Endpoints d'administration non protégés | Rien. `adminRoutes` pose `requireAuth` + `requireRole("admin")` en `preHandler` d'instance, et un admin ne peut agir ni sur son propre compte ni sur un autre admin (`admin.ts:40-46`). |

---

## Ce que je n'ai pas pu auditer

Énoncé explicitement, par honnêteté sur la couverture :

1. **`legacy/` (105 fichiers suivis par git)** — ancienne application Next +
   Supabase. Non lue en détail. Elle est exclue de la construction Docker
   (`.dockerignore`) et n'est pas déployée, donc hors surface d'attaque. J'ai
   seulement vérifié qu'elle ne contient aucun secret en dur. Elle contient en
   revanche `legacy/SCHEMA.sql` avec des `GRANT ALL … TO authenticated` — la
   politique d'accès Supabase de l'ancienne application ; sans objet ici, mais à
   ne pas recopier si vous rouvrez ce dossier. Recommandation : archiver `legacy/`
   hors du dépôt.
2. **`site/` (vitrine statique)** — HTML, CSS et une police. Pas de code serveur,
   donc rien à auditer côté application ; mais **je n'ai aucune visibilité sur
   l'hébergement** de cette vitrine, ni sur les en-têtes de sécurité qu'il pose.
   Si elle est servie depuis le même domaine que l'application, ses en-têtes et
   sa CSP devront être vérifiés séparément.
3. **`legacy/Audit_FOOTCOACH_2026-07-10.pdf`** — document binaire, non lu. Il
   contient peut-être des constats antérieurs qui recoupent ou contredisent
   les miens.
4. **Infrastructure hors dépôt** — reverse proxy TLS, terminaison HTTPS,
   configuration de PostgreSQL au-delà de l'image officielle, sauvegardes,
   chiffrement au repos du volume `pgdata`, journalisation centralisée, WAF,
   politique réseau de l'hôte. Rien de tout cela n'est décrit dans le dépôt.
   Point notable : **je n'ai trouvé aucune trace d'un mécanisme de sauvegarde**,
   alors que le `README.md` en fait une consigne de déploiement.
5. **La chaîne de proxy réelle en production** — d'où la question bloquante de
   FC-02. Le nombre de sauts de confiance ne se déduit pas du dépôt.
6. **Sortie de construction `.next/`** — code généré, non audité.
7. **Exécution complète de la pile** — je n'ai pas démarré `docker compose` ni
   rejoué les parcours de bout en bout contre une base réelle. Les deux failles
   marquées « confirmé » (FC-01, FC-03) l'ont été par des preuves de concept
   isolées, avec les versions de dépendances effectivement installées. Les
   autres reposent sur la lecture du code, et je l'indique quand une exploitation
   reste théorique (FC-12, FC-15) ou dépend du déploiement (FC-02).

---

## Décisions attendues avant la phase 3

La remédiation est prête à démarrer. Quatre points demandent votre arbitrage,
conformément à la règle « en cas de doute entre sécurité et compatibilité,
demander » :

| # | Faille | Question |
|---|---|---|
| 1 | **FC-02** | Y a-t-il un reverse proxy TLS (nginx / traefik / Caddy) devant le service `web` en production ? Le réglage de `trustProxy` en dépend, et une erreur casse la limitation de débit. **Bloquant pour FC-02.** |
| 2 | **FC-07** | Magasin de débit partagé : ajouter un service **Redis**, ou compter les échecs en base sur `login_events` (pas de nouvelle infrastructure, plus de code) ? Les deux touchent l'infrastructure ou le schéma. |
| 3 | **FC-16** | Coût bcrypt à 12 (≈ 4× la latence de connexion actuelle, aucune migration) — ou passage à `scrypt` natif, plus rapide et plus solide, mais **changement de format d'empreinte, donc migration** ? |
| 4 | **FC-09 / FC-14** | Confirmez-vous le minimum à 12 caractères à l'inscription seulement (connexion inchangée, comptes existants préservés) ? Et acceptez-vous de laisser FC-14 ouverte jusqu'à l'arrivée de l'envoi de courriel ? |

Sans réponse, voici ce que je ferais par défaut : appliquer FC-01, FC-03, FC-04,
FC-05, FC-06, FC-08, FC-10, FC-11, FC-12, FC-13, FC-15 et la partie sans
migration de FC-09 ; laisser FC-02, FC-07 et FC-16 en attente, puisque chacune
peut casser la production ou exiger une migration.

## Actions manuelles de votre côté

Cette liste sera reprise et complétée à la fin de la phase 3.

- [ ] **Aucune rotation de secret n'est requise** — aucun secret réel n'a été
      trouvé dans le dépôt ni dans son historique. `Demo1234!` et
      `changeme-in-prod` sont des valeurs d'exemple, à remplacer et non à faire
      tourner.
- [ ] Vérifier qu'aucune base de production n'a reçu le seed de démonstration :
      chercher `admin@demo.fr`, `coach.a@demo.fr`, `coach.b@demo.fr`,
      `club@demo.fr` dans la table `users`. Si l'un existe en production, le
      désactiver et changer son mot de passe **avant** toute autre action.
- [ ] Confirmer que le port 5433 de Postgres n'est pas joignable depuis le
      réseau sur les postes de développement.
- [ ] Répondre aux quatre questions d'arbitrage ci-dessus.
- [ ] Éléments hors code, à traiter au déploiement : terminaison TLS, sauvegarde
      de `pgdata` **et** du volume `uploads`, chiffrement au repos, journalisation
      centralisée, second facteur sur le compte administrateur (limite déjà
      assumée dans le `README.md`).
