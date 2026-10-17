"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { IconPackage, IconGrid, IconFileText, IconTruck, IconBell, IconFolder, IconDownload } from "@/components/ui/Icons";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

type Onglet = { href: string; label: string; icon: typeof IconPackage; france: boolean; etape?: number };

// Les étapes se font dans cet ordre (cf. EtapesNav) ; les outils, à part, sont
// consultables à tout moment.
const ETAPES: Onglet[] = [
  { href: "/gestion-douaniere", label: "Colis", icon: IconPackage, france: false, etape: 1 },
  { href: "/gestion-douaniere/declaration", label: "Déclaration Dakar", icon: IconFileText, france: false, etape: 2 },
  { href: "/gestion-douaniere/dedouanement-france", label: "LTA", icon: IconTruck, france: true, etape: 3 },
  { href: "/gestion-douaniere/audit-france", label: "Audit", icon: IconBell, france: true, etape: 4 },
  { href: "/gestion-douaniere/documents-france", label: "Documents", icon: IconDownload, france: true, etape: 5 },
];
const OUTILS: Onglet[] = [
  { href: "/gestion-douaniere/vue-ensemble", label: "Vue d'ensemble", icon: IconGrid, france: false },
  { href: "/gestion-douaniere/referentiel", label: "Référentiel", icon: IconFolder, france: false },
];

// Le module Dédouanement France (HS parapluie, REX, TVA FR...) n'a de sens
// que pour un tenant qui exporte vers la France — voir src/lib/brand.ts.
const ETAPES_ACTIVES = ETAPES.filter((o) => !o.france || BRAND.moduleFranceActif);
const ONGLETS = [...ETAPES_ACTIVES, ...OUTILS];

export function DouaneSousNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projet = searchParams.get("projet");
  const suffixe = projet ? `?projet=${projet}` : "";

  return (
    <nav className="flex flex-wrap items-center gap-1 rounded-lg bg-white/5 p-1">
      {ONGLETS.map(({ href, label, icon: Icon, etape }) => {
        const premierOutil = href === OUTILS[0].href;
        // "Colis" doit rester actif sur /gestion-douaniere/[id] (détail d'un
        // colis) — actif dès qu'aucun des autres onglets plus spécifiques
        // ne matche.
        const actif =
          href === "/gestion-douaniere"
            ? !ONGLETS.some((o) => o.href !== href && pathname.startsWith(o.href))
            : pathname.startsWith(href);
        return (
          <span key={href} className="flex items-center gap-1">
            {premierOutil && <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />}
          <Link
            href={`${href}${suffixe}`}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              actif ? "bg-gold-1/15 text-gold-1" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {etape ? (
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  actif ? "bg-gold-1 text-navy" : "bg-white/15 text-white/80"
                }`}
              >
                {etape}
              </span>
            ) : (
              <Icon size={15} />
            )}
            {label}
          </Link>
          </span>
        );
      })}
    </nav>
  );
}
