import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.nom,
    short_name: BRAND.nom.split(" ")[0],
    description: "Gestion des commandes de fret aérien",
    start_url: "/tableau-de-bord",
    display: "standalone",
    background_color: BRAND.couleurs.navy,
    theme_color: BRAND.couleurs.navy,
    icons: [
      {
        // Route dynamique (src/app/icon.tsx) recolorée par tenant — plus un
        // fichier statique figé sur les couleurs SIGIL, d'où le chemin sans
        // extension (c'est ainsi que Next.js sert une icône générée).
        src: "/icon",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
