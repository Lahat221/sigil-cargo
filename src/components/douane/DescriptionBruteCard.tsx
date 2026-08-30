"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { corrigerDescriptionColis, reanalyserColis } from "@/app/(dashboard)/gestion-douaniere/actions";
import { IconPencil } from "@/components/ui/Icons";

export function DescriptionBruteCard({
  commandeId,
  description,
  aUneExtraction,
}: {
  commandeId: string;
  description: string | null;
  // Réanalyser n'a de sens que si une extraction existe déjà (sinon c'est
  // "Traiter le départ" qui s'en charge, cf. TraiterDepartButton).
  aUneExtraction: boolean;
}) {
  const router = useRouter();
  const [enEdition, setEnEdition] = useState(false);
  const [valeur, setValeur] = useState(description ?? "");
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function enregistrer(relancerAnalyse: boolean) {
    setErreur(null);
    startTransition(async () => {
      const resultat = await corrigerDescriptionColis(commandeId, valeur);
      if ("error" in resultat) {
        setErreur(resultat.error);
        return;
      }
      if (relancerAnalyse) {
        const resultatAnalyse = await reanalyserColis(commandeId);
        if ("error" in resultatAnalyse) {
          setErreur("Description enregistrée, mais l'analyse a échoué : " + resultatAnalyse.error);
          setEnEdition(false);
          router.refresh();
          return;
        }
      }
      setEnEdition(false);
      router.refresh();
    });
  }

  if (!enEdition) {
    return (
      <div className="mb-6 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Description brute (saisie agent)</p>
          <button
            type="button"
            onClick={() => {
              setValeur(description ?? "");
              setEnEdition(true);
            }}
            className="inline-flex items-center gap-1 text-xs text-navy hover:underline"
          >
            <IconPencil size={12} />
            Modifier
          </button>
        </div>
        <p className="text-sm text-slate-600">{description || "(aucune description)"}</p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <p className="mb-1 text-sm font-medium text-slate-700">Description brute (saisie agent)</p>
      <textarea
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        rows={4}
        autoFocus
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
      />
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        {erreur && <span className="text-xs text-red-600">{erreur}</span>}
        <button
          type="button"
          onClick={() => setEnEdition(false)}
          disabled={isPending}
          className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={() => enregistrer(false)}
          disabled={isPending}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          {isPending ? "..." : "Enregistrer"}
        </button>
        {aUneExtraction && (
          <button
            type="button"
            onClick={() => enregistrer(true)}
            disabled={isPending}
            className="rounded-md bg-navy px-3 py-1 text-xs font-medium text-white hover:bg-navy-2 disabled:opacity-50"
          >
            {isPending ? "Analyse en cours..." : "Enregistrer et réanalyser"}
          </button>
        )}
      </div>
    </div>
  );
}
