"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconX } from "@/components/ui/Icons";

const STORAGE_KEY = "douane-filtres";

export function DouaneFiltreDepart({
  projets,
}: {
  projets: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setProjet = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("projet", value);
      } else {
        params.delete("projet");
      }
      sessionStorage.setItem(STORAGE_KEY, params.toString());
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  // Réapplique le départ mémorisé si on arrive sur la page sans filtre
  // (ex: lien "Gestion Douanière" du menu, ou retour depuis un colis).
  useEffect(() => {
    if (searchParams.toString()) return;
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      router.replace(`${pathname}?${saved}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function effacer() {
    sessionStorage.removeItem(STORAGE_KEY);
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={searchParams.get("projet") ?? ""}
        onChange={(e) => setProjet(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
      >
        <option value="">Tous les projets</option>
        {projets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nom}
          </option>
        ))}
      </select>

      {searchParams.get("projet") && (
        <button
          type="button"
          onClick={effacer}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <IconX size={14} />
          Effacer le filtre
        </button>
      )}
    </div>
  );
}
