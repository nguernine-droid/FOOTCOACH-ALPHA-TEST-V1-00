import { ImageResponse } from "next/og";

/**
 * L'image d'aperçu des liens partagés.
 *
 * Dessinée par le serveur plutôt que déposée en PNG dans `public/` : la charte
 * vit dans `tokens.css`, et une image figée s'en écarterait au premier
 * changement de couleur sans que personne s'en aperçoive. Les valeurs sont
 * recopiées ici parce que `next/og` ne lit pas la feuille de styles — elles
 * sont peu nombreuses et le commentaire dit d'où elles viennent.
 *
 * Aucune police téléchargée : la génération se fait au moment du partage, et
 * faire dépendre un aperçu de la disponibilité d'un service de polices
 * reviendrait à ne parfois rien afficher du tout.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TeamNexus — matchs amicaux de football amateur";

// Recopiées de tokens.css, section « Structure » : le même dégradé que
// l'en-tête de l'application — une masse noire qui s'ouvre sur la brique à son
// extrémité. L'aperçu partagé doit ressembler à ce qu'on trouve en cliquant.
const STRUCTURE_1 = "#0B0B0C";
const STRUCTURE_2 = "#1A1817";
const STRUCTURE_3 = "#9A3412";
const ACCENT = "#F97316"; // --accent-solid
const INK = "#FFFFFF"; // --text-on-structure

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: `linear-gradient(135deg, ${STRUCTURE_1} 0%, ${STRUCTURE_2} 55%, ${STRUCTURE_3} 100%)`,
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em" }}>
          <span>TEAM</span>
          <span style={{ color: ACCENT }}>NEXUS</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          Trouvez un adversaire pour votre prochain match amical
        </div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 30, opacity: 0.75 }}>
          Football amateur · déclarez vos dates libres · gratuit
        </div>
      </div>
    ),
    size,
  );
}
