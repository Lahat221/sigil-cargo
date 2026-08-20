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
            <NavLink href="/commandes" active={pathname === "/commandes"}>
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
          </div>
        </div>
      </nav>
    </aside>
  );
}
