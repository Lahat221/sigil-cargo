/** @type {import('next').NextConfig} */
// Les deux tenants tournent en local sur le même dossier de code (ports 3000
// et 3001, cf. .claude/launch.json). Sans distDir séparé, les deux serveurs
// `next dev` écrivent dans le même .next/ et se corrompent mutuellement
// (webpack "Cannot find module './XXXX.js'" aléatoire dès que l'un des deux
// recompile pendant que l'autre tourne). NEXT_DIST_DIR n'est réglé que dans
// .env.mn.local (jamais sur Vercel) : le build de production n'est pas
// affecté, seul le dev local isole les deux serveurs.
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
