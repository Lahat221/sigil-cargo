import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

// Icône d'app (onglet navigateur + PWA "Ajouter à l'écran d'accueil") —
// même mark dessiné à la main pour les deux tenants, mais recoloré à partir
// des tokens de marque (navy + dégradé or) au lieu d'un SVG statique figé
// sur les couleurs SIGIL. Avant ce fichier, M.N affichait l'icône bleu/or de
// SIGIL sur son téléphone au lieu de son propre bronze/amber.
export const size = { width: 120, height: 120 };
export const contentType = "image/svg+xml";

export default function Icon() {
  const { navy, gold1, gradientGoldDe, gradientGoldMid, gradientGoldA } = BRAND.couleurs;
  const svg = `<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mark-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${gradientGoldDe}" />
      <stop offset="0.55" stop-color="${gradientGoldMid}" />
      <stop offset="1" stop-color="${gradientGoldA}" />
    </linearGradient>
    <radialGradient id="mark-sun" cx="50%" cy="45%" r="60%">
      <stop offset="0" stop-color="${gradientGoldDe}" />
      <stop offset="0.6" stop-color="${gold1}" />
      <stop offset="1" stop-color="${gradientGoldA}" />
    </radialGradient>
  </defs>
  <rect width="120" height="120" rx="24" fill="${navy}" />
  <circle cx="60" cy="35" r="10" fill="url(#mark-sun)" />
  <path d="M30,78 L60,46 L90,78 L78,78 L60,58 L42,78 Z" fill="url(#mark-gold)" />
  <path d="M42,93 L60,73 L78,93 L69,93 L60,82 L51,93 Z" fill="url(#mark-gold)" opacity="0.55" />
</svg>`;

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
