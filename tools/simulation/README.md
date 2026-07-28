# Simulation d'usage

Cent coachs, une semaine d'activité, joués contre la vraie API HTTP.

Elle cherche ce qu'un test unitaire ne voit pas : les erreurs qui n'apparaissent
qu'en volume, les courses entre deux coachs qui agissent sur le même match, et
surtout **ce que l'interface reçoit réellement** — poids des réponses, nombre de
cartes sur le radar, longueur des listes. C'est elle qui a mis au jour les points
du radar superposés, les annonces périmées qui ne partaient jamais, et une
réponse de 156 Ko servie pour afficher une poignée de cartes.

## Lancer

```bash
RATE_LIMIT_DISABLED=true docker compose up -d api   # voir ci-dessous
node tools/simulation/simulate.mjs
docker compose up -d api                            # rétablit la protection
```

La simulation joue cent coachs depuis **une seule adresse**, ce que la
limitation de débit prend — à raison — pour une attaque : sans la soupape, les
inscriptions s'arrêtent à la cinquième. `RATE_LIMIT_DISABLED` n'existe que pour
ce cas ; l'API refuse de démarrer avec ce réglage si `NODE_ENV=production`.
Pensez à relancer le service sans la variable après coup — la commande
ci-dessus le fait.

Environ deux minutes. Réglages par variables d'environnement :

| Variable | Défaut | Rôle |
|---|---|---|
| `FOOTCOACH_API` | `http://localhost:3002/api` | Base de l'API |
| `FOOTCOACH_SIM_COACHES` | `100` | Nombre de comptes créés |
| `FOOTCOACH_SIM_DAYS` | `7` | Journées simulées |

## Nettoyer — obligatoire

**La simulation écrit dans la base visée** : cent comptes `sim0@simul.local` à
`sim99@simul.local` (mot de passe `Simul1234!`), leurs équipes, leurs annonces et
leurs matchs. À réserver au développement, et à effacer ensuite :

```bash
docker compose exec -T postgres psql -U footcoach -d footcoach -f - < tools/simulation/cleanup.sql
```

Le nettoyage ne touche qu'aux comptes `sim*@simul.local` et à ce qui en dépend :
le jeu de démonstration reste intact. Relancer la simulation sans avoir nettoyé
échoue à l'inscription — les adresses sont déjà prises.

Tant que les données sont là, elles servent aussi à regarder l'interface à
densité réelle : connectez-vous avec un des comptes et ouvrez le radar.

## Lire le résultat

Le script écrit un JSON sur la sortie standard.

- `anomalies` — **le seul champ qui doit rester vide.** Toute 5xx, tout code de
  retour inattendu, toute erreur réseau y atterrit.
- `refus` — les rejets métier, comptés par motif. Ils sont normaux (deux coachs
  qui valident le même score), mais les lire évite de croire qu'une étape s'est
  déroulée alors qu'elle échouait en silence. C'est arrivé : une version
  envoyait un en-tête JSON sans corps, l'API refusait les 964 propositions, et
  la simulation affichait `0` sans que rien ne s'en plaigne.
- `controles` — les non-régressions ciblées : aucune annonce périmée sur un
  radar, publication sans genre refusée, catégorie inconnue refusée, plus le
  décompte des points superposés au radar.
- `stats` — le volume de ce qui a été joué : annonces, propositions, retraits,
  désistements, scores validés par QR.
- `latences` — p50, p95 et maximum par route, les dix plus lentes.
- `ui.parCoach` — pour un coach sur dix : poids et latence de chaque appel du
  tableau de bord, nombre de cartes au radar, annonces hors périmètre.

## Ce qu'elle joue

Inscription, création d'une seconde équipe pour un coach sur cinq, publication
d'annonces (à venir, du jour à une heure passée, et périmées — ces dernières ne
doivent jamais atteindre le radar), consultation du radar, propositions,
retraits avant décision, acceptations et refus, désistements des deux côtés avec
passage en SOS, coups d'envoi, saisies de score et validations par QR.

Le tirage aléatoire est déterministe (graine fixe en tête de fichier) : une
anomalie se rejoue à l'identique tant que le scénario ne change pas.

## Limites

- Elle ne vérifie **rien de visuel**. Les volumes mesurés disent qu'un écran
  peut devenir illisible, pas qu'il l'est.
- Les matchs « déjà joués » sont fabriqués en publiant pour le jour même à 7 h,
  seul moyen d'atteindre la saisie de score sans remonter le temps. Si cette
  ligne saute, tout le cycle du QR cesse d'être couvert — sans que rien ne le
  signale, hors le compteur `matchsJoues` tombé à zéro.
- Les coachs y sont plus actifs qu'en vrai, et concentrés sur cinq bassins pour
  que les radars se croisent. Les densités mesurées sont donc pessimistes.
