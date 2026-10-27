/** @type {import('next').NextConfig} */
// Les deux tenants tournent en local sur le même dossier de code (ports 3000
// et 3001, cf. .claude/launch.json). Sans distDir séparé, les deux serveurs
// `next dev` écrivent dans le même .next/ et se corrompent mutuellement
// (webpack "Cannot find module './XXXX.js'" aléatoire dès que l'un des deux
// recompile pendant que l'autre tourne). NEXT_DIST_DIR n'est réglé que dans
// .env.mn.local (jamais sur Vercel) : le build de production n'est pas
// affecté, seul le dev local isole les deux serveurs.
// En-têtes de sécurité sur toutes les pages : pas d'affichage du site dans un
// cadre étranger (clickjacking), pas d'interprétation de type de fichier,
// référent limité, HTTPS imposé. Caméra/micro restent permis pour l'appli
// (scan, note vocale) ; géolocalisation et paiement sont coupés.
const entetesSecurite = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: entetesSecurite }];
  },
};

export default nextConfig;
