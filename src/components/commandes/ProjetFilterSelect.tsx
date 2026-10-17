"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filtre par projet (paramètre ?projet=). Sans `defaut`, « Tous les projets »
 * = paramètre absent. Avec `defaut` (ex. le départ en cours), l'écran filtre
 * par défaut sur ce projet et « Tous les projets » s'écrit ?projet=tous.
 */
export function ProjetFilterSelect({
  projets,
  defaut,
}: {
  projets: { id: string; nom: string }[];
  defaut?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const valeurTous = defaut !== undefined ? "tous" : "";

  return (
    <select
      value={searchParams.get("projet") ?? defaut ?? ""}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value) {
          params.set("projet", e.target.value);
        } else {
          params.delete("projet");
        }
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
    >
      <option value={valeurTous}>Tous les projets</option>
      {projets.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nom}
        </option>
      ))}
    </select>
  );
}
