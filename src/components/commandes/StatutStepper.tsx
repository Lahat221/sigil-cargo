"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changerStatut } from "@/app/(dashboard)/commandes/actions";
import { etapesPourColis, libelleStatut, statutSuivant } from "@/lib/commandes/statuts";
import type { StatutCommande } from "@/types/database.types";

export function StatutStepper({
  commandeId,
  statut,
  destination = null,
}: {
  commandeId: string;
  statut: StatutCommande;
  /** Ville de destination du colis : détermine les étapes après Paris. */
  destination?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const etapes = etapesPourColis(destination);
  const currentIndex = etapes.indexOf(statut);
  const suivant = statutSuivant(statut, destination);

  function goTo(nouveauStatut: StatutCommande) {
    if (nouveauStatut === statut) return;
    setError(null);
    startTransition(async () => {
      let result = await changerStatut(commandeId, nouveauStatut);
      // Étape non conforme (non vérifié, sans poids) : on demande confirmation.
      if ("error" in result && result.confirmable) {
        if (!window.confirm(result.error)) return;
        result = await changerStatut(commandeId, nouveauStatut, { forcer: true });
      }
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function annuler() {
    if (!window.confirm("Annuler ce colis ? Il disparaîtra du suivi.")) return;
    goTo("annulee");
  }

  if (statut === "annulee") {
    return (
      <div>
        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
          Colis annulé
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {etapes.map((s, i) => {
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
              {libelleStatut(s, destination)}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3">
        {suivant && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => goTo(suivant)}
            className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-2 disabled:opacity-50"
          >
            {isPending ? "..." : `→ ${libelleStatut(suivant, destination)}`}
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={annuler}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          Annuler le colis
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
