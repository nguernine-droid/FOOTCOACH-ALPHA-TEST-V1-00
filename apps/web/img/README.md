# Sources graphiques

`icon.svg` est **la source** des icônes de l'application. Ce dossier n'est pas
servi par Next — seuls `public/` et `src/app/` le sont ; les fichiers livrés au
navigateur en sont dérivés.

| Dérivé | Rôle | Format |
| --- | --- | --- |
| `../src/app/icon.png` | Favicon et icône PWA (`any` + `maskable`) | 512×512, fond perdu opaque |
| `../src/app/apple-icon.png` | Écran d'accueil iOS | 180×180, fond perdu opaque |

Le fond perdu opaque n'est pas un choix esthétique : les systèmes appliquent
leur propre masque — cercle sur Android, squircle sur iOS — et un coin arrondi
dessiné se verrait comme un liseré à l'intérieur du masque. iOS, de son côté,
ne gère pas la transparence sur l'écran d'accueil. La marque occupe 62 % du
côté, donc elle tient dans la zone de sécurité `maskable` (le cercle intérieur
de 80 %) quel que soit le rognage.

## Régénérer après un changement de marque

`icon.svg` reprend le dessin de `../src/components/Logo.tsx`, mais avec des
**couleurs littérales** : un SVG rasterisé hors du navigateur n'a aucune
feuille de style à interroger. Les deux fichiers changent donc ensemble, et les
valeurs d'`icon.svg` doivent rester alignées sur `../src/app/tokens.css`.

Depuis la racine du dépôt :

```bash
docker compose exec -T web sh -c 'cat > /tmp/icon.svg' < apps/web/img/icon.svg
docker compose exec -T web node --input-type=module -e "$(cat apps/web/img/make-icons.mjs)"
```

Le SVG passe par `/tmp` du conteneur parce que `apps/web/img/` n'y est pas
monté (seuls `src/` et `public/` le sont). Les PNG, eux, sont écrits dans
`src/app/`, qui est monté : ils atterrissent bien sur l'hôte.

`sharp` est déjà présent (dépendance de Next).

## Vérifier

```bash
docker compose exec -T web node -e "
const s=require('sharp');
for (const f of ['icon','apple-icon'])
  s('/app/apps/web/src/app/'+f+'.png').metadata().then(m=>console.log(f,m.width+'×'+m.height,m.channels+' canaux'));
"
```

Une icône `maskable` se contrôle à l'œil en superposant mentalement un cercle
inscrit : rien d'essentiel ne doit en sortir.

## Reste de l'ancienne direction

`logo.png` (marque bleue `#124BCB` sur fond transparent) était la source du
temps où la marque était une image matricielle, portée par une pastille
blanche. Elle n'est plus utilisée nulle part : le logo de l'application est
désormais dessiné en SVG et en jetons dans `Logo.tsx`, et les icônes viennent
d'`icon.svg`. Le fichier est conservé comme archive de l'ancienne identité.
`../public/logo.png` en est le dérivé, lui aussi sans usage.
