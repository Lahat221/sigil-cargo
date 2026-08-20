"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const PERIODES = [
  { value: "tout", label: "Tout" },
  { value: "jour", label: "Jour" },
  { value: "semaine", label: "Semaine" },
  { value: "mois", label: "Mois" },
  { value: "personnalise", label: "Personnalisé" },
];

export function DashboardFiltres({
  projets,
}: {
  projets: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const periode = searchParams.get("periode") ?? "tout";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <select
        value={searchParams.get("projet") ?? ""}
        onChange={(e) => setParam("projet", e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-navy focus:outline-none"
      >
        <option value="">Tous les projets</option>
        {projets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nom}
          </option>
        ))}
      </select>

      <div className="h-5 w-px bg-slate-200" />

      <div className="flex flex-wrap gap-1">
        {PERIODES.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setParam("periode", p.value === "tout" ? "" : p.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              periode === p.value
                ? "bg-navy text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {periode === "personnalise" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={searchParams.get("debut") ?? ""}
            onChange={(e) => setParam("debut", e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-navy focus:outline-none"
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={searchParams.get("fin") ?? ""}
            onChange={(e) => setParam("fin", e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-navy focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
