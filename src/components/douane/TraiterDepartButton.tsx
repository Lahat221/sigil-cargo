"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { traiterLot } from "@/app/(dashboard)/gestion-douaniere/actions";
import { IconRefresh } from "@/components/ui/Icons";

const TAILLE_LOT = 8;

export function TraiterDepartButton({
  commandeIds,
  tousLesCommandeIds = [],
}: {
  commandeIds: string[];
  tousLesCommandeIds?: string[];
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<"nouveaux" | "tous" | null>(null);
  const [fait, setFait] = useState(0);
  const [erreurs, setErreurs] = useState<{ commandeId: string; erreur: string }[]>([]);

  async function lancer(ids: string[], mode: "nouveaux" | "tous", force: boolean) {
    setEnCours(mode);
    setFait(0);
    setErreurs([]);

    for (let i = 0; i < ids.length; i += TAILLE_LOT) {
      const lot = ids.slice(i, i + TAILLE_LOT);
      const resultat = await traiterLot(lot, { force });
      setFait((f) => f + resultat.traites);
      if (resultat.erreurs.length > 0) {
        setErreurs((prev) => [...prev, ...resultat.erreurs]);
      }
    }

    setEnCours(null);
    router.refresh();
  }

  function retraiterTout() {
    if (
      !confirm(
        `Relancer l'analyse IA sur les ${tousLesCommandeIds.length} colis de ce départ (y compris ceux déjà traités) ? Chaque résultat actuel sera remplacé (l'historique est conservé).`
      )
    ) {
      return;
    }
    lancer(tousLesCommandeIds, "tous", true);
  }

  const total = commandeIds.length;
  const pourcentage = total > 0 ? Math.round((fait / total) * 100) : 0;
  const enTraitement = enCours !== null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {total > 0 ? (
          <button
            type="button"
            onClick={() => lancer(commandeIds, "nouveaux", false)}
            disabled={enTraitement}
            className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-semibold text-navy shadow-sm transition-all hover:shadow-md hover:brightness-105 disabled:opacity-50"
          >
            {enCours === "nouveaux"
              ? `Traitement en cours... ${fait}/${total}`
              : `Traiter les ${total} colis non traités`}
          </button>
        ) : (
          <p className="text-sm text-slate-400">Aucun colis non traité pour ce départ.</p>
        )}

        {tousLesCommandeIds.length > 0 && (
          <button
            type="button"
            onClick={retraiterTout}
            disabled={enTraitement}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
            title="Relance l'IA sur tous les colis du départ, y compris ceux déjà traités ou validés."
          >
            <IconRefresh size={14} />
            {enCours === "tous"
              ? `Retraitement en cours... ${fait}/${tousLesCommandeIds.length}`
              : `Retraiter tout le départ (${tousLesCommandeIds.length})`}
          </button>
        )}
      </div>

      {enTraitement && (
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
