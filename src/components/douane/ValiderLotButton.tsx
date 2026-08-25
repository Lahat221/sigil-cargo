"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { validerLot } from "@/app/(dashboard)/gestion-douaniere/actions";
import { IconShieldCheck } from "@/components/ui/Icons";

export function ValiderLotButton({ commandeIds }: { commandeIds: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [derniereValidation, setDerniereValidation] = useState<number | null>(null);

  if (commandeIds.length === 0) return null;

  function valider() {
    if (
      !confirm(
        `Valider en masse les ${commandeIds.length} colis traités/à vérifier de ce départ ?`
      )
    ) {
      return;
    }
    setErreur(null);
    setDerniereValidation(null);
    startTransition(async () => {
      const resultat = await validerLot(commandeIds);
      if ("error" in resultat) {
        setErreur(resultat.error);
        return;
      }
      setDerniereValidation(resultat.valides);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={valider}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
        title="Valide en une fois tous les colis traités ou à vérifier de ce départ."
      >
        <IconShieldCheck size={15} />
        {isPending ? "Validation en cours..." : `Valider en masse (${commandeIds.length})`}
      </button>
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
      {derniereValidation != null && !erreur && (
        <span className="text-xs text-emerald-600">{derniereValidation} colis validé(s)</span>
      )}
    </div>
  );
}
