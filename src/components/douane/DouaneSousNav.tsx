"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { IconPackage, IconGrid, IconFileText, IconTruck, IconBell, IconFolder } from "@/components/ui/Icons";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

const TOUS_LES_ONGLETS = [
  { href: "/gestion-douaniere", label: "Colis", icon: IconPackage, france: false },
  { href: "/gestion-douaniere/vue-ensemble", label: "Vue d'ensemble", icon: IconGrid, france: false },
  { href: "/gestion-douaniere/declaration", label: "Déclaration", icon: IconFileText, france: false },
  {
    href: "/gestion-douaniere/dedouanement-france",
    label: "Dédouanement France",
    icon: IconTruck,
    france: true,
  },
  { href: "/gestion-douaniere/audit-france", label: "Audit France", icon: IconBell, france: true },
  { href: "/gestion-douaniere/referentiel", label: "Référentiel", icon: IconFolder, france: false },
];

// Le module Dédouanement France (HS parapluie, REX, TVA FR...) n'a de sens
// que pour un tenant qui exporte vers la France — voir src/lib/brand.ts.
const ONGLETS = TOUS_LES_ONGLETS.filter((o) => !o.france || BRAND.moduleFranceActif);

export function DouaneSousNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projet = searchParams.get("projet");
  const suffixe = projet ? `?projet=${projet}` : "";

  return (
    <nav className="flex flex-wrap items-center gap-1 rounded-lg bg-white/5 p-1">
      {ONGLETS.map(({ href, label, icon: Icon }) => {
        // "Colis" doit rester actif sur /gestion-douaniere/[id] (détail d'un
        // colis) — actif dès qu'aucun des autres onglets plus spécifiques
        // ne matche.
        const actif =
          href === "/gestion-douaniere"
            ? !ONGLETS.some((o) => o.href !== href && pathname.startsWith(o.href))
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={`${href}${suffixe}`}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              actif ? "bg-gold-1/15 text-gold-1" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
