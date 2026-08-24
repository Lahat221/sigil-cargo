"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reanalyserColis } from "@/app/(dashboard)/gestion-douaniere/actions";
import { IconRefresh } from "@/components/ui/Icons";

export function ReanalyserButton({
  commandeId,
  label = "Réanalyser",
}: {
  commandeId: string;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function lancer() {
    if (!confirm("Relancer l'analyse IA sur ce colis ? Le résultat actuel sera remplacé (l'historique est conservé).")) {
      return;
    }
    setErreur(null);
    startTransition(async () => {
      const resultat = await reanalyserColis(commandeId);
      if ("error" in resultat) {
        setErreur(resultat.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={lancer}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
      >
        <IconRefresh size={14} />
        {isPending ? "Analyse en cours..." : label}
      </button>
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
    </div>
  );
}
