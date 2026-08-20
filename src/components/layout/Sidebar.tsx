"use client";

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
  { slug: "projets-gp", label: "Projets GP", icon: <IconFolder size={17} /> },
  { slug: "publicites", label: "Publicités", icon: <IconMegaphone size={17} /> },
];

const MODULES_APRES_CLIENTS = [
  {
    slug: "charges-depenses",
    label: "Charges & Dépenses",
    icon: <IconInvoice size={17} />,
  },
  {
    slug: "notifications-whatsapp",
    label: "Notifications WhatsApp",
    icon: <IconSend size={17} />,
  },
  { slug: "chat", label: "Chat", icon: <IconChat size={17} /> },
  { slug: "parametres", label: "Paramètres", icon: <IconSettings size={17} /> },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col overflow-y-auto bg-navy-gradient">
      <div className="border-b border-line px-5 py-6">
        <Link href="/tableau-de-bord" className="transition-opacity hover:opacity-80">
          <Logo tagline />
        </Link>
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
  );
}
