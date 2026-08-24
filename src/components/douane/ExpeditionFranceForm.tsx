"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enregistrerExpeditionFrance } from "@/app/(dashboard)/gestion-douaniere/dedouanement-france/actions";

export function ExpeditionFranceForm({
  projetId,
  initial,
}: {
  projetId: string;
  initial: {
    mawb: string;
    dateVol: string;
    poidsBrutLtaKg: string;
    nombreColis: number;
    dimensions: string;
  };
}) {
  const router = useRouter();
  const [mawb, setMawb] = useState(initial.mawb);
  const [dateVol, setDateVol] = useState(initial.dateVol);
  const [poids, setPoids] = useState(initial.poidsBrutLtaKg);
  const [nombreColis, setNombreColis] = useState(initial.nombreColis);
  const [dimensions, setDimensions] = useState(initial.dimensions);
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function enregistrer() {
    setErreur(null);
    startTransition(async () => {
      const resultat = await enregistrerExpeditionFrance(projetId, {
        mawb,
        dateVol,
        poidsBrutLtaKg: poids.trim() ? Number(poids) : null,
        nombreColis,
        dimensions,
      });
      if ("error" in resultat) {
        setErreur(resultat.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-medium text-slate-700">Informations LTA</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">MAWB</label>
          <input
            type="text"
            value={mawb}
            onChange={(e) => setMawb(e.target.value)}
            placeholder="490-02087610"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Date de vol (JJ-MM-AAAA)</label>
          <input
            type="text"
            value={dateVol}
            onChange={(e) => setDateVol(e.target.value)}
            placeholder="13-08-2026"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Poids brut LTA (kg)</label>
          <input
            type="number"
            step="0.01"
            value={poids}
            onChange={(e) => setPoids(e.target.value)}
            placeholder="335"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Nombre de colis</label>
          <input
            type="number"
            min="1"
            value={nombreColis}
            onChange={(e) => setNombreColis(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Dimensions</label>
          <input
            type="text"
            value={dimensions}
            onChange={(e) => setDimensions(e.target.value)}
            placeholder="120 × 100 × 95 cm"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={enregistrer}
          disabled={isPending}
          className="rounded-md bg-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-navy-2 disabled:opacity-50"
        >
          {isPending ? "..." : "Enregistrer"}
        </button>
        {erreur && <span className="text-xs text-red-600">{erreur}</span>}
      </div>
    </div>
  );
}
