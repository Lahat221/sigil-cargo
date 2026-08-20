"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatutBadge } from "./StatutBadge";
import { SupprimerCommandeButton } from "./SupprimerCommandeButton";
import type { CommandeListItem } from "./types";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

function formatPoids(poids: number) {
  return `${poids.toLocaleString("fr-FR")} kg`;
}

export function CommandesListe({
  commandes,
}: {
  commandes: CommandeListItem[];
}) {
  const [vue, setVue] = useState<"table" | "cartes">("table");

  useEffect(() => {
    if (window.innerWidth < 768) setVue("cartes");
  }, []);

  if (commandes.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
        Aucune commande trouvée.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end gap-1">
        <button
          onClick={() => setVue("table")}
          className={`rounded-md px-3 py-1 text-sm ${
            vue === "table"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          Tableau
        </button>
        <button
          onClick={() => setVue("cartes")}
          className={`rounded-md px-3 py-1 text-sm ${
            vue === "cartes"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          Cartes
        </button>
      </div>

      {vue === "table" ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Projet</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Poids</th>
                <th className="px-4 py-3 font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {commandes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/commandes/${c.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      #{c.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.clients?.nom ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.projets?.nom ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatutBadge statut={c.statut} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatPoids(c.poids_kg)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {montantFormatter.format(c.montant_total)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/commandes/${c.id}/modifier`}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        Modifier
                      </Link>
                      <SupprimerCommandeButton
                        commandeId={c.id}
                        numero={c.numero}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {commandes.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm"
            >
              <Link href={`/commandes/${c.id}`}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-900">
                    #{c.numero}
                  </span>
                  <StatutBadge statut={c.statut} />
                </div>
                <p className="text-sm text-slate-700">
                  {c.clients?.nom ?? "—"}
                </p>
                <p className="mb-3 text-xs text-slate-500">
                  {c.projets?.nom ?? "—"}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {formatPoids(c.poids_kg)}
                  </span>
                  <span className="font-medium text-slate-900">
                    {montantFormatter.format(c.montant_total)}
                  </span>
                </div>
              </Link>
              <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-2">
                <Link
                  href={`/commandes/${c.id}/modifier`}
                  className="text-sm text-slate-600 hover:underline"
                >
                  Modifier
                </Link>
                <SupprimerCommandeButton commandeId={c.id} numero={c.numero} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
