"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { changerStatut } from "@/app/(dashboard)/commandes/actions";
import { STATUT_LABELS } from "./StatutBadge";
import type { StatutCommande } from "@/types/database.types";
import type { CommandeListItem } from "./types";
import { BRAND } from "@/lib/brand";

const COLONNES: StatutCommande[] = [
  "recue",
  "a_preparer",
  "en_preparation",
  "prete",
  "expediee",
  "livree",
];

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
});

export function PipelineBoard({
  commandes,
}: {
  commandes: CommandeListItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function avancer(id: string, nouveauStatut: StatutCommande) {
    startTransition(async () => {
      await changerStatut(id, nouveauStatut);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLONNES.map((statut, i) => {
        const cartes = commandes.filter((c) => c.statut === statut);
        const suivant = COLONNES[i + 1];
        return (
          <div
            key={statut}
            className="flex w-64 flex-shrink-0 flex-col rounded-lg bg-slate-100"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <h3 className="text-sm font-medium text-slate-700">
                {STATUT_LABELS[statut]}
              </h3>
              <span className="text-xs text-slate-400">{cartes.length}</span>
            </div>
            <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto px-2 pb-2">
              {cartes.map((c) => (
                <div
                  key={c.id}
                  className="rounded-md border border-slate-200 bg-white p-2.5 text-sm shadow-sm"
                >
                  <Link
                    href={`/commandes/${c.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    #{c.numero} — {c.clients?.nom ?? "—"}
                  </Link>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{c.poids_kg !== null ? `${c.poids_kg} kg` : "—"}</span>
                    <span>{montantFormatter.format(c.montant_total)}</span>
                  </div>
                  {suivant && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => avancer(c.id, suivant)}
                      className="mt-2 w-full rounded-md bg-navy px-2 py-1 text-xs font-medium text-white hover:bg-navy-2 disabled:opacity-50"
                    >
                      → {STATUT_LABELS[suivant]}
                    </button>
                  )}
                </div>
              ))}
              {cartes.length === 0 && (
                <p className="px-1 py-2 text-xs text-slate-400">Vide</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
