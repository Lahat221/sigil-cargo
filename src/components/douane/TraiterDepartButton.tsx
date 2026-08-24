"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { traiterLot } from "@/app/(dashboard)/gestion-douaniere/actions";

const TAILLE_LOT = 8;

export function TraiterDepartButton({ commandeIds }: { commandeIds: string[] }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [fait, setFait] = useState(0);
  const [erreurs, setErreurs] = useState<{ commandeId: string; erreur: string }[]>([]);

  async function lancer() {
    setEnCours(true);
    setFait(0);
    setErreurs([]);

    for (let i = 0; i < commandeIds.length; i += TAILLE_LOT) {
      const lot = commandeIds.slice(i, i + TAILLE_LOT);
      const resultat = await traiterLot(lot);
      setFait((f) => f + resultat.traites);
      if (resultat.erreurs.length > 0) {
        setErreurs((prev) => [...prev, ...resultat.erreurs]);
      }
    }

    setEnCours(false);
    router.refresh();
  }

  if (commandeIds.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Aucun colis non traité pour ce départ.
      </p>
    );
  }

  const total = commandeIds.length;
  const pourcentage = total > 0 ? Math.round((fait / total) * 100) : 0;

  return (
    <div>
      <button
        type="button"
        onClick={lancer}
        disabled={enCours}
        className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-semibold text-navy shadow-sm transition-all hover:shadow-md hover:brightness-105 disabled:opacity-50"
      >
        {enCours
          ? `Traitement en cours... ${fait}/${total}`
          : `Traiter les ${total} colis non traités`}
      </button>

      {enCours && (
        <div className="mt-2 h-2 w-full max-w-sm overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-gold-2 transition-all"
            style={{ width: `${pourcentage}%` }}
          />
        </div>
      )}

      {erreurs.length > 0 && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {erreurs.length} colis en erreur — consultez chaque colis pour réessayer.
        </div>
      )}
    </div>
  );
}
