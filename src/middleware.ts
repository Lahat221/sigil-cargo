import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// /icon : route dynamique (src/app/icon.tsx, recolorée par tenant) — sans
// extension dans son URL, elle ne correspond plus au filtre d'assets
// statiques du matcher ci-dessous (qui exclut .svg/.png/...), donc elle doit
// être listée ici explicitement pour rester accessible sans connexion
// (sinon le favicon/icône PWA redirige vers /login pour un visiteur non
// authentifié, au lieu de s'afficher).
// /colis/[id] : page de suivi public (QR code sur l'étiquette) — montre le
// contenu/vidéo d'un colis sans connexion, volontairement en dehors du
// groupe (dashboard).
// /suivi : recherche publique d'un colis par numéro + téléphone (page
// d'accueil publique, voir src/app/page.tsx).
const PUBLIC_PATHS = ["/login", "/auth/callback", "/manifest.webmanifest", "/api/twilio", "/icon", "/colis", "/suivi"];

function moduleSlug(pathname: string) {
  return pathname.split("/")[1] || null;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, profile } = await updateSession(request);
  const { pathname } = request.nextUrl;
  // "/" exactement (pas de startsWith : tout chemin commence par "/", ça
  // rendrait sinon TOUT le site public) — page d'accueil vitrine, publique
  // pour un visiteur non connecté, qui redirige un agent déjà connecté vers
  // le tableau de bord (cf. src/app/page.tsx).
  const isPublicPath =
    pathname === "/" || PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/tableau-de-bord";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Comptes non-admin : accès restreint aux modules listés dans leur profil.
  if (user && profile && profile.role !== "admin" && !isPublicPath) {
    const slug = moduleSlug(pathname);
    const autorise = slug === null || profile.modules_autorises.includes(slug);
    if (!autorise) {
      const url = request.nextUrl.clone();
      url.pathname = `/${profile.modules_autorises[0] ?? "commandes"}`;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
