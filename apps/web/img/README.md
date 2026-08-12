# Sources graphiques

`logo.png` est **la source** du logo TeamNexus : marque orange `≈ #F87010` sur
fond transparent. Ce dossier n'est pas servi par Next — seul `public/` l'est.
Les fichiers réellement livrés au navigateur en sont dérivés.

| Dérivé | Rôle | Format |
| --- | --- | --- |
| `../public/logo.png` | Logo dans l'app (header, écran de connexion) | 256×256, transparent |
| `../src/app/icon.png` | Favicon et icône PWA (`any` + `maskable`) | 512×512, fond blanc, marque à 72 % |
| `../src/app/apple-icon.png` | Écran d'accueil iOS | 180×180, fond blanc opaque |

Le fond blanc des icônes n'est pas un choix esthétique : un masque circulaire ou
en squircle rogne les bords, et iOS ne gère pas la transparence sur l'écran
d'accueil. La marge à 72 % garantit que le logo n'est jamais coupé.

## Régénérer après un changement de logo

Remplacer `logo.png`, puis depuis la racine du dépôt :

```bash
node -e "
const sharp=require('sharp');
(async()=>{
  const src='apps/web/img/logo.png';
  const trimmed=await sharp(src).trim({threshold:10}).png().toBuffer();
  await sharp(trimmed).resize(256,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}})
    .png({compressionLevel:9,palette:true}).toFile('apps/web/public/logo.png');
  const mark=await sharp(trimmed).resize(368,368,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).toBuffer();
  await sharp({create:{width:512,height:512,channels:4,background:'#ffffff'}})
    .composite([{input:mark,gravity:'center'}]).png({compressionLevel:9}).toFile('apps/web/src/app/icon.png');
  const ios=await sharp(trimmed).resize(132,132,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).toBuffer();
  await sharp({create:{width:180,height:180,channels:4,background:'#ffffff'}})
    .composite([{input:ios,gravity:'center'}]).png({compressionLevel:9}).toFile('apps/web/src/app/apple-icon.png');
})();
"
```

`sharp` est déjà présent (dépendance de Next).

## À savoir

La marque orange manque de contraste sur le header navy : elle y est donc
portée par une pastille blanche (voir `src/components/Logo.tsx`). Une
déclinaison monochrome blanche permettrait de la poser directement sur le navy,
sans pastille.
