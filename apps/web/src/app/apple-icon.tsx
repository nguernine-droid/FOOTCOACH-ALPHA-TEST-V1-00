import { ImageResponse } from "next/og";

// iOS n'accepte pas de SVG pour l'icône d'écran d'accueil : on rasterise le
// blason en PNG. Le système applique lui-même les coins arrondis, d'où le fond
// navy pleinement opaque.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const CREST = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="120" height="120">
  <path d="M24 3 L42 9 V24 C42 35 34 42.5 24 45.5 C14 42.5 6 35 6 24 V9 Z" fill="#F5B301"/>
  <path d="M24 6.2 L39 11.2 V24 C39 33.3 32.4 39.8 24 42.4 C15.6 39.8 9 33.3 9 24 V11.2 Z" fill="#0C2E6B"/>
  <clipPath id="c"><path d="M24 6.2 L39 11.2 V24 C39 33.3 32.4 39.8 24 42.4 C15.6 39.8 9 33.3 9 24 V11.2 Z"/></clipPath>
  <g clip-path="url(#c)" opacity="0.85">
    <rect x="13.5" y="0" width="5" height="48" fill="#1D6FE0"/>
    <rect x="29.5" y="0" width="5" height="48" fill="#1D6FE0"/>
  </g>
  <polygon points="24,15 26.2,19.6 31.3,20.2 27.5,23.7 28.6,28.7 24,26.1 19.4,28.7 20.5,23.7 16.7,20.2 21.8,19.6" fill="#F5B301"/>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#071B3F",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={120}
          height={120}
          alt=""
          src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(CREST)}`}
        />
      </div>
    ),
    size,
  );
}
