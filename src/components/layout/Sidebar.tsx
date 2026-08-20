"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import {
  IconDashboard,
  IconStore,
  IconPlus,
  IconGrid,
  IconFolder,
  IconMegaphone,
  IconUsers,
  IconInvoice,
  IconSend,
  IconChat,
  IconSettings,
  IconMenu,
  IconX,
} from "@/components/ui/Icons";

function NavLink({
  href,
  children,
  active,
  indent = false,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
  indent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${
        indent ? "ml-3" : ""
      } ${
        active
          ? "bg-gold-1/15 text-gold-1"
          : "text-white/70 hover:translate-x-0.5 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon && (
        <span
          className={`shrink-0 transition-transform duration-150 group-hover:scale-110 ${
            active ? "text-gold-1" : "text-white/50 group-hover:text-white"
          }`}
        >
          {icon}
        </span>
      )}
      {children}
    </Link>
  );
}

const MODULES_AVANT_CLIENTS = [
  { slug: "publicites", label: "Publicités", icon: <IconMegaphone size={17} /> },
];

const MODULES_APRES_CLIENTS = [
  { slug: "chat", label: "Chat", icon: <IconChat size={17} /> },
  { slug: "parametres", label: "Paramètres", icon: <IconSettings size={17} /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Referme le tiroir automatiquement après une navigation sur mobile.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
        className={`fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-md bg-navy text-white shadow-md md:hidden ${
          mobileOpen ? "hidden" : ""
        }`}
      >
        <IconMenu size={20} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-shrink-0 flex-col overflow-y-auto bg-navy-gradient transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-6">
          <Link
            href="/tableau-de-bord"
            className="transition-opacity hover:opacity-80"
          >
            <Logo tagline />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
            className="text-white/60 hover:text-white md:hidden"
          >
            <IconX size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-6 px-3 py-5">
          <div>
            <NavLink
              href="/tableau-de-bord"
              active={pathname === "/tableau-de-bord"}
              icon={<IconDashboard size={17} />}
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
                icon={<IconStore size={17} />}
              >
                Commandes
              </NavLink>
              <NavLink
                href="/commandes/nouvelle"
                active={pathname === "/commandes/nouvelle"}
                indent
                icon={<IconPlus size={15} />}
              >
                Nouvelle commande
              </NavLink>
              <NavLink
                href="/commandes/pipeline"
                active={pathname === "/commandes/pipeline"}
                indent
                icon={<IconGrid size={15} />}
              >
                Pipeline
              </NavLink>
              <NavLink
                href="/projets"
                active={pathname.startsWith("/projets")}
                icon={<IconFolder size={17} />}
              >
                Projets Fret Aérien
              </NavLink>
              {MODULES_AVANT_CLIENTS.map((m) => (
                <NavLink
                  key={m.slug}
                  href={`/${m.slug}`}
                  active={pathname === `/${m.slug}`}
                  icon={m.icon}
                >
                  {m.label}
                </NavLink>
              ))}
              <NavLink
                href="/clients"
                active={pathname.startsWith("/clients")}
                icon={<IconUsers size={17} />}
              >
                Clients
              </NavLink>
              <NavLink
                href="/charges-depenses"
                active={pathname.startsWith("/charges-depenses")}
                icon={<IconInvoice size={17} />}
              >
                Charges & Dépenses
              </NavLink>
              <NavLink
                href="/notifications-whatsapp"
                active={pathname.startsWith("/notifications-whatsapp")}
                icon={<IconSend size={17} />}
              >
                Notifications WhatsApp
              </NavLink>
              {MODULES_APRES_CLIENTS.map((m) => (
                <NavLink
                  key={m.slug}
                  href={`/${m.slug}`}
                  active={pathname === `/${m.slug}`}
                  icon={m.icon}
                >
                  {m.label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        <div className="border-t border-line px-5 py-3 text-center text-[10px] text-white/30">
          SIGIL v2.0
        </div>
      </aside>
    </>
  );
}
