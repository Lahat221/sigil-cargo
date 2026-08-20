"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ProjetFilterSelect({
  projets,
}: {
  projets: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      value={searchParams.get("projet") ?? ""}
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
      <option value="">Tous les projets</option>
      {projets.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nom}
        </option>
      ))}
    </select>
  );
}
