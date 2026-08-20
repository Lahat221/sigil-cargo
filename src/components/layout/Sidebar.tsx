"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

function NavLink({
  href,
  children,
  active,
  indent = false,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        indent ? "ml-3" : ""
      } ${
        active
          ? "bg-gold-1/15 text-gold-1"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

function NavLinkBientot({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-white/30">
      <span>{children}</span>
      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/30">
        Bientôt
      </span>
    </div>
  );
}

const MODULES_A_VENIR = [
  "Produits",
  "Projets GP",
  "Réservations",
  "Publicités",
  "Clients",
  "Dettes (ce que je dois)",
  "Créances (ce que l'on me doit)",
  "Charges & Dépenses",
  "Notifications WhatsApp",
  "Chat",
  "Paramètres",
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col bg-navy-gradient">
      <div className="border-b border-line px-5 py-6">
        <Link href="/tableau-de-bord">
          <Logo tagline />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <div>
          <NavLink
            href="/tableau-de-bord"
            active={pathname === "/tableau-de-bord"}
          >
            Tableau de bord
          </NavLink>
        </div>

        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted2">
            Gestion commerciale
          </p>
          <div className="space-y-1">
            <NavLink
              href="/commandes"
              active={pathname.startsWith("/commandes")}
            >
              Commandes
            </NavLink>
            <NavLink
              href="/commandes/nouvelle"
              active={pathname === "/commandes/nouvelle"}
              indent
            >
              + Nouvelle commande
            </NavLink>
            <NavLink
              href="/commandes/pipeline"
              active={pathname === "/commandes/pipeline"}
              indent
            >
              Pipeline
            </NavLink>
            {MODULES_A_VENIR.map((m) => (
              <NavLinkBientot key={m}>{m}</NavLinkBientot>
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-line px-5 py-3 text-center text-[10px] text-white/30">
        SIGIL v2.0
      </div>
    </aside>
  );
}
