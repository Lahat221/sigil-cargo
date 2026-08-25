"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleExclusionProduit } from "@/app/(dashboard)/gestion-douaniere/dedouanement-france/actions";
import type { LigneProduitFrance } from "@/lib/dedouanement-france/lignesFrance";

export function ProduitsExclusionTable({ lignes }: { lignes: LigneProduitFrance[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function demanderRaison(): string | null {
    try {
      return prompt("Raison de l'exclusion (optionnel) :");
    } catch {
      return null;
    }
  }

  function toggle(produitId: string, exclu: boolean) {
    startTransition(async () => {
      const raison = exclu ? demanderRaison() : null;
      await toggleExclusionProduit(produitId, exclu, raison);
      router.refresh();
    });
  }

  if (lignes.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200/70 bg-white p-4 text-sm text-slate-400 shadow-sm">
        Aucun produit traité pour ce départ — traitez d&apos;abord les colis côté Gestion Douanière.
      </p>
    );
  }

  const nbExclus = lignes.filter((l) => l.exclu).length;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <p className="text-sm font-medium text-slate-700">
          Produits ({lignes.length}){nbExclus > 0 && ` — ${nbExclus} exclu(s)`}
        </p>
      </div>
      <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Colis</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Description douane</th>
              <th className="px-3 py-2 font-medium">HS</th>
              <th className="px-3 py-2 font-medium">Produit</th>
              <th className="px-3 py-2 font-medium text-right">Qté</th>
              <th className="px-3 py-2 font-medium text-center">Exclure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lignes.map((l) => (
              <tr key={l.produitId} className={l.exclu ? "opacity-50" : ""}>
                <td className="px-3 py-2 font-mono text-xs">#{l.colisNumero}</td>
                <td className="px-3 py-2">{l.typeProduit}</td>
                <td className="px-3 py-2">{l.descriptionDouane}</td>
                <td className="px-3 py-2 font-mono text-xs">{l.hsCode ?? "—"}</td>
                <td className="px-3 py-2">{l.descriptionProduit}</td>
                <td className="px-3 py-2 text-right">
                  {l.quantite} {l.unite}
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={l.exclu}
                    disabled={isPending}
                    onChange={(e) => toggle(l.produitId, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
