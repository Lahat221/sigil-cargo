"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enregistrerValeurSection } from "@/app/(dashboard)/gestion-douaniere/actions";

export function ValeurSectionInput({
  projetId,
  section,
  valeurInitiale,
}: {
  projetId: string;
  section: string;
  valeurInitiale: number | null;
}) {
  const router = useRouter();
  const [valeur, setValeur] = useState(valeurInitiale?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  function enregistrer() {
    const brut = valeur.trim();
    const montant = brut === "" ? null : Number(brut);
    if (montant !== null && (Number.isNaN(montant) || montant < 0)) return;
    startTransition(async () => {
      await enregistrerValeurSection(projetId, section, montant);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        step="1"
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        onBlur={enregistrer}
        placeholder="0"
        className="w-32 rounded-md border border-slate-300 px-3 py-1.5 text-right text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
      />
      <span className="text-sm text-slate-500">FCFA</span>
      {isPending && <span className="text-xs text-slate-400">...</span>}
    </div>
  );
}
