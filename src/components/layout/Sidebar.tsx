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
  IconShieldCheck,
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

type SousItem = { href: string; label: string; icon: React.ReactNode };
type NavItem = {
  slug: string;
  href: string;
  label: string;
  icon: React.ReactNode;
  tabIcon?: React.ReactNode;
  sousItems?: SousItem[];
};

const NAV_ITEMS: NavItem[] = [
  {
    slug: "commandes",
    href: "/commandes",
    label: "Colis",
    icon: <IconStore size={17} />,
    tabIcon: <IconStore size={20} />,
    sousItems: [
      { href: "/commandes/nouvelle", label: "Nouveau colis", icon: <IconPlus size={15} /> },
      { href: "/commandes/pipeline", label: "Suivi de colis", icon: <IconGrid size={15} /> },
    ],
  },
  {
    slug: "projets",
    href: "/projets",
    label: "Projets Fret Aérien",
    icon: <IconFolder size={17} />,
    tabIcon: <IconFolder size={20} />,
  },
  { slug: "publicites", href: "/publicites", label: "Publicités", icon: <IconMegaphone size={17} /> },
  {
    slug: "clients",
    href: "/clients",
    label: "Clients",
    icon: <IconUsers size={17} />,
    tabIcon: <IconUsers size={20} />,
  },
  {
    slug: "charges-depenses",
    href: "/charges-depenses",
    label: "Charges & Dépenses",
    icon: <IconInvoice size={17} />,
  },
  {
    slug: "notifications-whatsapp",
    href: "/notifications-whatsapp",
    label: "Campagne de Communication",
    icon: <IconSend size={17} />,
    tabIcon: <IconSend size={20} />,
    sousItems: [
      { href: "/notifications-whatsapp/nouvelle", label: "Nouvelle campagne", icon: <IconPlus size={15} /> },
    ],
  },
  { slug: "chat", href: "/chat", label: "Chat", icon: <IconChat size={17} />, tabIcon: <IconChat size={20} /> },
  {
    slug: "gestion-douaniere",
    href: "/gestion-douaniere",
    label: "Gestion Douanière",
    icon: <IconShieldCheck size={17} />,
    sousItems: [
      { href: "/gestion-douaniere/referentiel", label: "Référentiel produits", icon: <IconFolder size={15} /> },
    ],
  },
  { slug: "parametres", href: "/parametres", label: "Paramètres", icon: <IconSettings size={17} /> },
];

function estAutorise(slug: string, modulesAutorises: string[] | null) {
  return modulesAutorises === null || modulesAutorises.includes(slug);
}

function MobileTabBar({
  tabs,
  pathname,
  onMoreClick,
  moreActive,
}: {
  tabs: { href: string; label: string; icon: React.ReactNode }[];
  pathname: string;
  onMoreClick: () => void;
  moreActive: boolean;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line bg-navy-2/95 shadow-[0_-4px_16px_rgba(0,0,0,0.25)] backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
              active ? "text-gold-1" : "text-white/55 active:text-white"
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMoreClick}
        aria-label="Plus de modules"
        className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
          moreActive ? "text-gold-1" : "text-white/55 active:text-white"
        }`}
      >
        <IconMenu size={20} />
        Plus
      </button>
    </nav>
  );
}

export function Sidebar({
  modulesAutorises = null,
}: {
  /** Modules accessibles pour l'utilisateur courant. `null` = admin, accès total. */
  modulesAutorises?: string[] | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const tableauAutorise = estAutorise("tableau-de-bord", modulesAutorises);
  const itemsAutorises = NAV_ITEMS.filter((item) => estAutorise(item.slug, modulesAutorises));

  const accueilHref = tableauAutorise
    ? "/tableau-de-bord"
    : itemsAutorises[0]?.href ?? "/commandes";

  const tabsPrincipaux = [
    ...(tableauAutorise
      ? [{ href: "/tableau-de-bord", label: "Accueil", icon: <IconDashboard size={20} /> }]
      : []),
    ...itemsAutorises
      .filter((item) => item.tabIcon)
      .map((item) => ({ href: item.href, label: item.label.split(" ")[0], icon: item.tabIcon })),
  ].slice(0, 4) as { href: string; label: string; icon: React.ReactNode }[];

  const dansTabsPrincipaux = tabsPrincipaux.some((t) => pathname.startsWith(t.href));

  return (
    <>
      <MobileTabBar
        tabs={tabsPrincipaux}
        pathname={pathname}
        onMoreClick={() => setMobileOpen(true)}
        moreActive={mobileOpen || !dansTabsPrincipaux}
      />

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
          <Link href={accueilHref} className="transition-opacity hover:opacity-80">
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
          {tableauAutorise && (
            <div>
              <NavLink
                href="/tableau-de-bord"
                active={pathname === "/tableau-de-bord"}
                icon={<IconDashboard size={17} />}
              >
                Tableau de bord
              </NavLink>
            </div>
          )}

          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted2">
              Gestion commerciale
            </p>
            <div className="space-y-1">
              {itemsAutorises.map((item) => (
                <div key={item.slug}>
                  <NavLink
                    href={item.href}
                    active={pathname.startsWith(item.href)}
                    icon={item.icon}
                  >
                    {item.label}
                  </NavLink>
                  {item.sousItems?.map((sous) => (
                    <NavLink
                      key={sous.href}
                      href={sous.href}
                      active={pathname.startsWith(sous.href)}
                      indent
                      icon={sous.icon}
                    >
                      {sous.label}
                    </NavLink>
                  ))}
                </div>
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
