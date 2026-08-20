import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SIGIL CARGO",
    short_name: "SIGIL",
    description: "Gestion des commandes de fret aérien Dakar → France",
    start_url: "/tableau-de-bord",
    display: "standalone",
    background_color: "#0A1A33",
    theme_color: "#0A1A33",
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
