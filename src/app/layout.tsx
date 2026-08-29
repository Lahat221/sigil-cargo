import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";

// Force le rendu dynamique du layout racine : sans ça, Next.js peut le
// considérer statique (aucune API dynamique appelée ici) et mettre en cache
// son rendu — y compris les valeurs de marque (BRAND) — indépendamment des
// changements de NEXT_PUBLIC_BRAND entre déploiements/tenants.
export const dynamic = "force-dynamic";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: `${BRAND.nom} — Colis`,
  description: "Gestion des colis de fret aérien",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND.nom,
  },
};

export const viewport: Viewport = {
  themeColor: BRAND.couleurs.navy,
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

// Couleurs de marque injectées en variables CSS côté serveur (pas de flash,
// pas de JS client) — surchargent les valeurs par défaut de globals.css
// pour le tenant actif (voir src/lib/brand.ts).
const brandStyle = `:root {
  --color-navy: ${BRAND.couleurs.navy};
  --color-navy-2: ${BRAND.couleurs.navy2};
  --color-navy-3: ${BRAND.couleurs.navy3};
  --color-gold-1: ${BRAND.couleurs.gold1};
  --color-gold-2: ${BRAND.couleurs.gold2};
  --color-muted2: ${BRAND.couleurs.muted2};
  --color-line: ${BRAND.couleurs.line};
  --color-gold-gradient-a: ${BRAND.couleurs.gradientGoldDe};
  --color-gold-gradient-b: ${BRAND.couleurs.gradientGoldMid};
  --color-gold-gradient-c: ${BRAND.couleurs.gradientGoldA};
  --color-navy-gradient-a: ${BRAND.couleurs.gradientNavyA};
  --color-navy-gradient-b: ${BRAND.couleurs.gradientNavyB};
  --color-navy-gradient-c: ${BRAND.couleurs.gradientNavyC};
  --color-page-gradient-a: ${BRAND.couleurs.pageGradientA};
  --color-page-gradient-b: ${BRAND.couleurs.pageGradientB};
  --color-page-gradient-c: ${BRAND.couleurs.pageGradientC};
  --color-ink: ${BRAND.couleurs.ink};
  --color-ink-muted: ${BRAND.couleurs.inkMuted};
  --color-ink-overlay: ${BRAND.couleurs.inkOverlay};
}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandStyle }} />
      </head>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
