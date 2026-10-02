"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconUsers,
  IconShieldCheck,
  IconInvoice,
  IconGlobe,
} from "@/components/ui/Icons";

const ONGLETS = [
  { href: "/parametres", label: "Mon compte", icon: IconShieldCheck, admin: false },
  { href: "/parametres/utilisateurs", label: "Utilisateurs & accès", icon: IconUsers, admin: true },
  { href: "/parametres/tarifs", label: "Tarifs", icon: IconInvoice, admin: true },
  { href: "/parametres/site", label: "Site public", icon: IconGlobe, admin: true },
];

export function ParametresSousNav({ estAdmin }: { estAdmin: boolean }) {
  const pathname = usePathname();
  const onglets = ONGLETS.filter((o) => !o.admin || estAdmin);

  return (
    <nav className="mb-5 flex flex-wrap items-center gap-1 rounded-lg bg-white/5 p-1">
      {onglets.map(({ href, label, icon: Icon }) => {
        const actif =
          href === "/parametres" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              actif
                ? "bg-gold-1/15 text-gold-1"
                : "text-white/70 hover:bg-white/10 hover:text-white"
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
