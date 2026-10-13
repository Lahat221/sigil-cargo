import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { IconMenu } from "@/components/ui/Icons";

export type LienNav = { href: string; label: string };

// En-tête commun au site public (accueil + pages légales). `liens` pointe
// vers des ancres de l'accueil ; sur les autres pages, l'appelant les
// préfixe par "/".
export function PublicNav({
  liens,
  estConnecte,
  ctaHref,
}: {
  liens: LienNav[];
  estConnecte: boolean;
  ctaHref: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Link href="/" aria-label="Accueil" className="shrink-0 whitespace-nowrap">
          <Logo
            size={46}
            tagline
            texteClasse="text-xl sm:text-2xl"
            taglineClasse="hidden text-[10px] sm:block"
          />
        </Link>

        <nav className="hidden items-center gap-6 whitespace-nowrap text-sm font-medium text-white/70 lg:flex">
          {liens.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={ctaHref}
            className="whitespace-nowrap rounded-lg bg-gold-gradient px-4 py-2 text-sm font-semibold text-navy shadow-md shadow-gold-2/20 transition-all hover:brightness-105"
          >
            <span className="sm:hidden">Mon colis</span>
            <span className="hidden sm:inline">Suivre un colis</span>
          </a>
          <Link
            href={estConnecte ? "/tableau-de-bord" : "/login"}
            className="hidden whitespace-nowrap rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 sm:inline-block"
          >
            {estConnecte ? "Tableau de bord" : "Connexion"}
          </Link>

          <details className="relative lg:hidden">
            <summary
              aria-label="Menu"
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-white/20 text-white/90 [&::-webkit-details-marker]:hidden"
            >
              <IconMenu size={18} />
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/15 bg-navy-2 p-2 shadow-2xl">
              {liens.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                >
                  {l.label}
                </a>
              ))}
              <Link
                href={estConnecte ? "/tableau-de-bord" : "/login"}
                className="mt-1 block rounded-lg border-t border-white/10 px-3 py-2 pt-3 text-sm text-gold-1 hover:bg-white/10"
              >
                {estConnecte ? "Tableau de bord" : "Connexion"}
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
