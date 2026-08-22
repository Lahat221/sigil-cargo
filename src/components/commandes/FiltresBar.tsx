"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STATUT_LABELS } from "./StatutBadge";
import { IconX } from "@/components/ui/Icons";
import type { StatutCommande } from "@/types/database.types";

const STATUTS = Object.keys(STATUT_LABELS) as StatutCommande[];

const STORAGE_KEY = "commandes-filtres";

export function FiltresBar({
  projets,
}: {
  projets: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      sessionStorage.setItem(STORAGE_KEY, params.toString());
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  // Réapplique les filtres mémorisés si on arrive sur la page sans eux
  // (ex: lien "Commandes" du menu, qui pointe vers l'URL nue).
  useEffect(() => {
    if (searchParams.toString()) return;
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      router.replace(`${pathname}?${saved}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce la recherche texte pour ne pas requêter à chaque frappe.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) {
        setParam("q", q);
      }
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function effacerFiltres() {
    setQ("");
    sessionStorage.removeItem(STORAGE_KEY);
    startTransition(() => {
      router.push(pathname);
    });
  }

  const aDesFiltres =
    !!searchParams.get("q") ||
    !!searchParams.get("statut") ||
    !!searchParams.get("projet");

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="text"
        placeholder="Rechercher un client ou un n° de commande..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none sm:max-w-xs"
      />

      <select
        value={searchParams.get("statut") ?? ""}
        onChange={(e) => setParam("statut", e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
      >
        <option value="">Tous les statuts</option>
        {STATUTS.map((s) => (
          <option key={s} value={s}>
            {STATUT_LABELS[s]}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("projet") ?? ""}
        onChange={(e) => setParam("projet", e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
      >
        <option value="">Tous les projets</option>
        {projets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nom}
          </option>
        ))}
      </select>

      {aDesFiltres && (
        <button
          type="button"
          onClick={effacerFiltres}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <IconX size={14} />
          Effacer les filtres
        </button>
      )}

      {isPending && (
        <span className="text-xs text-slate-400">Actualisation...</span>
      )}
    </div>
  );
}
