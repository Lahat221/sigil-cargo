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
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
