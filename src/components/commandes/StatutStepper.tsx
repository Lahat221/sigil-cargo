"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changerStatut } from "@/app/(dashboard)/commandes/actions";
import { STATUT_LABELS } from "./StatutBadge";
import type { StatutCommande } from "@/types/database.types";

const PIPELINE: StatutCommande[] = [
  "recue",
  "a_preparer",
  "en_preparation",
  "prete",
  "expediee",
  "livree",
];

export function StatutStepper({
  commandeId,
  statut,
}: {
  commandeId: string;
  statut: StatutCommande;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const currentIndex = PIPELINE.indexOf(statut);

  function goTo(nouveauStatut: StatutCommande) {
    if (nouveauStatut === statut) return;
    setError(null);
    startTransition(async () => {
      const result = await changerStatut(commandeId, nouveauStatut);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (statut === "annulee") {
    return (
      <div>
        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
          Commande annulée
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {PIPELINE.map((s, i) => {
          const done = i <= currentIndex;
          return (
            <button
              key={s}
              type="button"
              disabled={isPending}
              onClick={() => goTo(s)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                done
                  ? "bg-navy text-white hover:bg-navy-2"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {STATUT_LABELS[s]}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3">
        {currentIndex < PIPELINE.length - 1 && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => goTo(PIPELINE[currentIndex + 1])}
            className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-2 disabled:opacity-50"
          >
            {isPending
              ? "..."
              : `→ ${STATUT_LABELS[PIPELINE[currentIndex + 1]]}`}
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => goTo("annulee")}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          Annuler la commande
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
