# Site vitrine FootCoach

Page publique de présentation de l'application, **entièrement statique** : un seul
fichier HTML, ses fontes et le logo. Aucun build, aucune dépendance, aucune
requête vers un tiers — donc aucun cookie ni traceur à déclarer (le seul stockage
est le choix de thème du visiteur, en `localStorage`).

```
site/
  index.html                 la page de présentation
  mentions-legales.html      \
  confidentialite.html        > pages légales (voir plus bas)
  cgu.html                   /
  styles.css                 jetons, composants — partagé par les quatre pages
  legal.css                  mise en page propre aux pages légales
  theme.js                   thème clair/sombre (anti-flash + bascule)
  logo.png                   copie de apps/web/public/logo.png
  fonts/                     sous-ensemble latin, extrait du build Next
    inter-variable.woff2     Inter 400-700 (variable)
    barlow-condensed-700.woff2
    barlow-condensed-800.woff2
```

## Aperçu en local

Un simple serveur de fichiers suffit — l'ouvrir en `file://` fonctionne aussi,
mais les fontes ne se chargeront pas dans certains navigateurs.

```bash
cd site && python -m http.server 4173      # puis http://localhost:4173
```

## À remplacer avant la mise en ligne

Le site pointe vers l'application par une URL **de remplacement**,
`https://app.footcoach.fr`, et vers `contact@footcoach.fr`. Trois choses à
ajuster dans `index.html` :

| Chercher | Remplacer par |
|---|---|
| `https://app.footcoach.fr` | l'URL réelle de l'application (5 occurrences, plus 3 mentions visibles `app.footcoach.fr` dans les étapes d'installation) |
| `contact@footcoach.fr` | l'adresse de contact réelle |
| `https://footcoach.fr/` | le domaine du site vitrine (`og:url` et `canonical`) |

```bash
sed -i 's|https://app\.footcoach\.fr|https://VOTRE-APP|g; s|app\.footcoach\.fr|VOTRE-APP|g' index.html
```

Il n'y a **pas** d'image de partage (`og:image`) : en ajouter une demande une
capture réelle de l'application, à produire au moment de la mise en ligne.

## Pages légales

Trois pages, dans la même charte que le site :

| Page | Statut |
|---|---|
| `mentions-legales.html` | **Obligatoire** — LCEN art. 6 III : identification de l'éditeur et de l'hébergeur. |
| `confidentialite.html` | **Obligatoire** — RGPD : l'application traite email, nom, téléphone, photo, position, abonnements push. Le contenu factuel (catégories, bases légales, sécurité, destinataires) est aligné sur le code : `apps/api/src/db/schema.ts` et les routes. |
| `cgu.html` | Non obligatoire, mais c'est là que se dit l'essentiel : FootCoach met en relation, **ne déclare rien au district**, ne vérifie ni licences ni assurances ni terrain, et un score validé n'a pas de valeur fédérale. |

**Rien n'est publiable en l'état.** Chaque information manquante est marquée
dans le texte par un encadré rouge `[À COMPLÉTER]`, impossible à rater à
l'écran. Pour les lister :

```bash
grep -o "\[À COMPLÉTER[^]]*\]" *.html | sort -u
```

Il y en a de trois sortes : l'**identité de l'éditeur** et son adresse de
contact, l'**hébergeur** et le pays d'hébergement, et deux **durées de
conservation** à arrêter (historique des annonces et matchs, journal des
connexions — que le code ne purge aujourd'hui jamais).

> Ces textes ont été rédigés à partir du fonctionnement réel du code, pas
> recopiés d'un modèle. Ils n'ont pas valeur de conseil juridique : une
> relecture par un professionnel reste recommandée avant la mise en ligne.

## Déploiement

N'importe quel hébergeur de fichiers statiques convient (Netlify, Pages, un
`nginx` ou un `Caddy` existant). Si le site doit vivre devant l'application,
la répartition la plus simple est :

- `footcoach.fr` → ce dossier, servi tel quel ;
- `app.footcoach.fr` → le service `web` du `docker-compose` (port 3002).

Deux en-têtes valent la peine d'être posés par le serveur : un cache long sur
`fonts/` et `logo.png` (leur nom ne changera pas, mais leur contenu non plus),
et un cache court sur `index.html`.

## Cohérence avec l'application

Les couleurs de la page sont **recopiées** de `apps/web/src/app/tokens.css`
(thèmes clair et sombre, mêmes valeurs, mêmes rôles) et les fontes sont celles
de l'application — Inter pour le texte, Barlow Condensed pour les titres. Ce
n'est pas un import : si la direction artistique bouge, il faut repasser ici.
Le bloc de commentaire en tête de `index.html` le rappelle.

Le contenu, lui, suit le périmètre décrit dans le `README.md` de la racine
(radar, score validé par QR, notifications, relations entre coachs). Toute
évolution du périmètre V1 doit se relire ici.

Les fontes Inter et Barlow Condensed sont distribuées sous **SIL Open Font
License 1.1**, qui autorise cet auto-hébergement.
