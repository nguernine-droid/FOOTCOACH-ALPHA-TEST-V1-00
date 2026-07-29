import { NextResponse, type NextRequest } from "next/server";

/**
 * Politique de sécurité du contenu, avec un nonce par requête.
 *
 * ── Pourquoi un nonce ────────────────────────────────────────────────────
 * La politique précédente disait `script-src 'self' 'unsafe-inline'`, ce qui
 * revient à peu près à ne rien dire : `'unsafe-inline'` autorise n'importe
 * quel `<script>` injecté dans la page, et c'est précisément la forme que
 * prend une faille XSS. Elle était pourtant nécessaire, parce que Next émet
 * ses propres scripts en ligne (l'amorçage du client, le flux de données des
 * composants serveur) et que l'application en ajoute un — celui qui pose le
 * thème avant le premier rendu.
 *
 * Le nonce lève la contradiction : un jeton aléatoire est tiré à chaque
 * requête, inscrit dans l'en-tête et recopié sur les seuls scripts que nous
 * assumons. Un script injecté par un attaquant ne peut pas le deviner — il
 * n'existait pas quand la page a été construite, et il change à la requête
 * suivante.
 *
 * ── Pourquoi `strict-dynamic` ────────────────────────────────────────────
 * Sans lui, il faudrait porter le nonce sur chaque `<script src>` de chaque
 * fragment de code, y compris ceux que Next charge lui-même en cours de
 * route. `strict-dynamic` dit : « ce qu'un script de confiance charge est de
 * confiance ». En contrepartie, les navigateurs qui le comprennent IGNORENT
 * `'self'` et les listes de domaines — d'où leur présence quand même, comme
 * repli pour les navigateurs plus anciens.
 *
 * ── Ce qui reste permissif, et pourquoi ──────────────────────────────────
 * `style-src` garde `'unsafe-inline'`. Un nonce ne couvre pas les ATTRIBUTS
 * `style=""`, dont l'interface se sert partout (positions calculées sur la
 * carte, largeurs de jauges). Les retirer demanderait de réécrire ces calculs
 * en classes, sans gain réel : une injection de style ne permet pas d'exécuter
 * du code, seulement de maquiller la page. Le risque n'est pas du même ordre.
 */
function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // React s'appuie sur `eval()` en développement pour ses outils de débogage.
    // Il ne l'appelle jamais en production, où l'autorisation disparaît.
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    // `data:` pour l'aperçu d'une photo avant envoi, `blob:` pour le QR code
    // rendu sur canvas et l'image de la caméra pendant le scan.
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Redondant avec `default-src`, mais explicite : `strict-dynamic` ne
    // s'applique qu'aux scripts, et un `<object>` reste un vecteur d'exécution.
    "object-src 'none'",
  ].join("; ");
}

export default function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";

  // 128 bits d'aléa cryptographique. `Math.random()` ne conviendrait pas : un
  // nonce prévisible est un nonce inutile.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));

  const csp = buildCsp(nonce, isDev);

  // Next lit la politique sur la requête ENTRANTE : c'est ainsi qu'il sait
  // quel nonce recopier sur les scripts qu'il émet lui-même. `x-nonce` est
  // notre propre canal, pour que la mise en page puisse en faire autant sur
  // le script d'amorçage du thème.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    /**
     * Les documents HTML, et eux seuls.
     *
     * Sont écartés : les fragments statiques servis par Next (une politique de
     * contenu sur un fichier JavaScript ne veut rien dire), et `/api`, dont les
     * réponses sont du JSON produit par l'API — qui pose ses propres en-têtes.
     * Les exclure évite surtout de tirer un nonce à chaque appel réseau.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|logo.png|sw.js|manifest.webmanifest).*)",
  ],
};
