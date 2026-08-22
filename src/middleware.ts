import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/manifest.webmanifest", "/api/twilio"];

function moduleSlug(pathname: string) {
  return pathname.split("/")[1] || null;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, profile } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

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
