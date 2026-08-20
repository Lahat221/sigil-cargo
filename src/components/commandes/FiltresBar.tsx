"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STATUT_LABELS } from "./StatutBadge";
import type { StatutCommande } from "@/types/database.types";

const STATUTS = Object.keys(STATUT_LABELS) as StatutCommande[];

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
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

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

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="text"
        placeholder="Rechercher un client ou un n° de commande..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none sm:max-w-xs"
      />

      <select
        value={searchParams.get("statut") ?? ""}
        onChange={(e) => setParam("statut", e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
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
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      >
        <option value="">Tous les projets</option>
        {projets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nom}
          </option>
        ))}
      </select>

      {isPending && (
        <span className="text-xs text-slate-400">Actualisation...</span>
      )}
    </div>
  );
}
