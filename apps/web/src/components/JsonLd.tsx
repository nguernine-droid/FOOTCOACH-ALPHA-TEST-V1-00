import { headers } from "next/headers";

/**
 * Un bloc de données structurées, posé dans la page.
 *
 * ── Pourquoi ce composant existe ─────────────────────────────────────────
 * Un `application/ld+json` ne s'exécute pas, mais c'est un élément `script` :
 * sous une politique de contenu en `strict-dynamic`, un navigateur est en droit
 * de le refuser s'il ne porte pas le nonce de la requête. Le balisage
 * disparaîtrait alors sans bruit — le pire des cas pour une donnée que personne
 * ne vérifie à l'œil nu, puisque la page continue de s'afficher normalement.
 *
 * Le nonce se lisait déjà à deux endroits, recopié avec son commentaire. Le
 * centraliser ici évite de l'oublier au prochain endroit où l'on voudra baliser
 * quelque chose — un oubli qui ne casse rien de visible.
 */
export async function JsonLd({ data }: { data: object }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      /* `suppressHydrationWarning` pour la même raison que le script de thème
         de `layout.tsx` : après avoir lu la page, le navigateur VIDE l'attribut
         `nonce` — une défense contre son exfiltration par un sélecteur CSS. Le
         client lit donc une chaîne vide là où le serveur a écrit le jeton, et
         React y voit une divergence. Il n'y a rien à réparer : le nonce reste
         dans la propriété DOM. */
      suppressHydrationWarning
      // Sérialisé par nous, jamais saisi par un visiteur : les valeurs viennent
      // de constantes et de colonnes contrôlées, et JSON.stringify échappe le
      // reste. `<` est neutralisé à part — c'est la seule séquence qui pourrait
      // fermer la balise depuis l'intérieur d'une chaîne.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}
    />
  );
}
