"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  enregistrerExpeditionFrance,
  enregistrerLtaFichier,
} from "@/app/(dashboard)/gestion-douaniere/dedouanement-france/actions";
import { IconPaperclip, IconDownload } from "@/components/ui/Icons";

export function ExpeditionFranceForm({
  projetId,
  initial,
  ltaFichier,
}: {
  projetId: string;
  initial: {
    mawb: string;
    dateVol: string;
    poidsBrutLtaKg: string;
    nombreColis: number;
    dimensions: string;
  };
  ltaFichier: { nom: string; urlSignee: string | null } | null;
}) {
  const router = useRouter();
  const [mawb, setMawb] = useState(initial.mawb);
  const [dateVol, setDateVol] = useState(initial.dateVol);
  const [poids, setPoids] = useState(initial.poidsBrutLtaKg);
  const [nombreColis, setNombreColis] = useState(initial.nombreColis);
  const [dimensions, setDimensions] = useState(initial.dimensions);
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadErreur, setUploadErreur] = useState<string | null>(null);

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

  async function uploaderLta(e: ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;

    setUploadErreur(null);
    setUploadPending(true);
    try {
      const supabase = createClient();
      const path = `${projetId}/${crypto.randomUUID()}-${fichier.name}`;
      const { error: uploadError } = await supabase.storage
        .from("lta-documents")
        .upload(path, fichier);
      if (uploadError) throw new Error(uploadError.message);

      const resultat = await enregistrerLtaFichier(projetId, path);
      if ("error" in resultat) throw new Error(resultat.error);

      router.refresh();
    } catch (err) {
      setUploadErreur(err instanceof Error ? err.message : "Erreur d'upload.");
    } finally {
      setUploadPending(false);
    }
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

      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="mb-1.5 text-xs font-medium text-slate-500">
          Document LTA officiel (PDF/photo) — obligatoire avant audit/génération
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {ltaFichier && (
            <span className="flex items-center gap-1.5 text-sm text-slate-700">
              <IconPaperclip size={14} />
              {ltaFichier.urlSignee ? (
                <a
                  href={ltaFichier.urlSignee}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-gold-2 hover:underline"
                >
                  {ltaFichier.nom}
                  <IconDownload size={12} />
                </a>
              ) : (
                ltaFichier.nom
              )}
            </span>
          )}
          <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
            {uploadPending ? "Envoi..." : ltaFichier ? "Remplacer le fichier" : "Uploader la LTA"}
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={uploaderLta}
              disabled={uploadPending}
              className="hidden"
            />
          </label>
          {uploadErreur && <span className="text-xs text-red-600">{uploadErreur}</span>}
        </div>
      </div>
    </div>
  );
}
