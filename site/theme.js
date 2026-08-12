/* ═══════════════════════════════════════════════════════════════════════════
   THÈME DU SITE VITRINE

   Chargé sans `defer`, dans le <head> : la première partie doit s'exécuter
   AVANT le premier rendu, sinon un visiteur en thème sombre verrait un éclair
   blanc à chaque chargement de page.

   Trois états possibles sur le document : aucun attribut (on suit la
   préférence système), `data-theme="light"`, `data-theme="dark"`.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  var racine = document.documentElement;

  // ── Anti-flash ────────────────────────────────────────────────────────────
  try {
    var choix = localStorage.getItem("teamnexus-vitrine-theme");
    if (choix === "dark" || choix === "light") racine.setAttribute("data-theme", choix);
  } catch (e) {
    /* navigation privée : on suit la préférence système, sans mémoriser */
  }

  // ── Bascule ───────────────────────────────────────────────────────────────
  // Le bouton part de ce que le visiteur VOIT, pas de ce qui est mémorisé :
  // sans cela, le premier clic sous un système sombre ne ferait rien de
  // visible (on écrirait "dark" par-dessus un thème déjà sombre).
  document.addEventListener("DOMContentLoaded", function () {
    var bouton = document.getElementById("theme-toggle");
    if (!bouton) return;

    bouton.addEventListener("click", function () {
      var actuel = racine.getAttribute("data-theme");
      if (!actuel) {
        actuel = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      var suivant = actuel === "dark" ? "light" : "dark";
      racine.setAttribute("data-theme", suivant);
      try {
        localStorage.setItem("teamnexus-vitrine-theme", suivant);
      } catch (e) {
        /* rien à mémoriser : la bascule reste valable pour la page en cours */
      }
    });
  });
})();
