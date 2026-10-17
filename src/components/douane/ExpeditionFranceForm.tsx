"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  enregistrerExpeditionFrance,
  enregistrerLtaFichier,
  extraireLtaInfoDepuisPdf,
  initLtaBucket,
  type InfosLtaExtraites,
} from "@/app/(dashboard)/gestion-douaniere/dedouanement-france/actions";
import { IconPaperclip, IconDownload } from "@/components/ui/Icons";

type Champ = "mawb" | "dateVol" | "poids" | "nombreColis" | "dimensions";

// Valeurs proposées par la lecture automatique de la LTA, en attente de
// vérification : on garde les anciennes pour pouvoir annuler.
type LectureLta = {
  champsLus: Champ[];
  nonLus: string[];
  precedent: { mawb: string; dateVol: string; poids: string; nombreColis: number; dimensions: string };
};

const CHAMP_LU = "border-amber-400 bg-amber-50 ring-1 ring-amber-300";
const CHAMP_NORMAL = "border-slate-300";

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
  ltaFichier: { nom: string; urlSignee: string | null; path: string } | null;
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
  const [extractionPending, setExtractionPending] = useState(false);
  const [lecture, setLecture] = useState<LectureLta | null>(null);
  const [lectureErreur, setLectureErreur] = useState<string | null>(null);

  function appliquerLecture(infos: InfosLtaExtraites, nonLus: string[]) {
    const champsLus: Champ[] = [];
    if (infos.mawb) { setMawb(infos.mawb); champsLus.push("mawb"); }
    if (infos.dateVol) { setDateVol(infos.dateVol); champsLus.push("dateVol"); }
    if (infos.poidsBrutLtaKg !== null) { setPoids(String(infos.poidsBrutLtaKg)); champsLus.push("poids"); }
    if (infos.nombreColis !== null) { setNombreColis(infos.nombreColis); champsLus.push("nombreColis"); }
    if (infos.dimensions) { setDimensions(infos.dimensions); champsLus.push("dimensions"); }
    setLecture({ champsLus, nonLus, precedent: { mawb, dateVol, poids, nombreColis, dimensions } });
  }

  function annulerLecture() {
    if (!lecture) return;
    setMawb(lecture.precedent.mawb);
    setDateVol(lecture.precedent.dateVol);
    setPoids(lecture.precedent.poids);
    setNombreColis(lecture.precedent.nombreColis);
    setDimensions(lecture.precedent.dimensions);
    setLecture(null);
  }

  const classeChamp = (c: Champ) => (lecture?.champsLus.includes(c) ? CHAMP_LU : CHAMP_NORMAL);

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
      setLecture(null);
      router.refresh();
    });
  }

  // Relit le fichier déjà enregistré (ex. après échec de la lecture automatique).
  async function relireLta() {
    if (!ltaFichier) return;
    setLectureErreur(null);
    setLecture(null);
    setExtractionPending(true);
    try {
      const extraction = await extraireLtaInfoDepuisPdf(projetId, ltaFichier.path);
      if ("success" in extraction) appliquerLecture(extraction.infos, extraction.nonLus);
      else setLectureErreur(extraction.error);
    } finally {
      setExtractionPending(false);
    }
  }

  async function uploaderLta(e: ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;

    setUploadErreur(null);
    setLectureErreur(null);
    setLecture(null);
    setUploadPending(true);
    try {
      // S'assurer que le bucket existe avant d'uploader (idempotent)
      const bucketInit = await initLtaBucket();
      if ("error" in bucketInit) throw new Error(`Bucket LTA : ${bucketInit.error}`);

      const supabase = createClient();
      const path = `${projetId}/${crypto.randomUUID()}-${fichier.name}`;
      const { error: uploadError } = await supabase.storage
        .from("lta-documents")
        .upload(path, fichier);
      if (uploadError) throw new Error(uploadError.message);

      const resultat = await enregistrerLtaFichier(projetId, path);
      if ("error" in resultat) throw new Error(resultat.error);

      // Extraction automatique des infos LTA via Claude
      setExtractionPending(true);
      const extraction = await extraireLtaInfoDepuisPdf(projetId, path);
      if ("success" in extraction) appliquerLecture(extraction.infos, extraction.nonLus);
      else setLectureErreur(extraction.error);

      router.refresh();
    } catch (err) {
      setUploadErreur(err instanceof Error ? err.message : "Erreur d'upload.");
    } finally {
      setUploadPending(false);
      setExtractionPending(false);
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
            className={`w-full rounded-md border px-3 py-1.5 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none ${classeChamp("mawb")}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Date de vol (JJ-MM-AAAA)</label>
          <input
            type="text"
            value={dateVol}
            onChange={(e) => setDateVol(e.target.value)}
            placeholder="13-08-2026"
            className={`w-full rounded-md border px-3 py-1.5 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none ${classeChamp("dateVol")}`}
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
            className={`w-full rounded-md border px-3 py-1.5 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none ${classeChamp("poids")}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Nombre de colis</label>
          <input
            type="number"
            min="1"
            value={nombreColis}
            onChange={(e) => setNombreColis(Number(e.target.value))}
            className={`w-full rounded-md border px-3 py-1.5 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none ${classeChamp("nombreColis")}`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Dimensions</label>
          <input
            type="text"
            value={dimensions}
            onChange={(e) => setDimensions(e.target.value)}
            placeholder="120 × 100 × 95 cm"
            className={`w-full rounded-md border px-3 py-1.5 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none ${classeChamp("dimensions")}`}
          />
        </div>
      </div>
      {lecture && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-medium">
            Valeurs lues dans la LTA (surlignées) — vérifiez-les, puis enregistrez.
          </p>
          <p className="text-xs">
            Rien n&apos;est enregistré tant que vous n&apos;avez pas cliqué sur « Enregistrer ».
            {lecture.nonLus.length > 0 && ` Non lus, à saisir à la main : ${lecture.nonLus.join(", ")}.`}
          </p>
          <button
            type="button"
            onClick={annulerLecture}
            className="mt-1 text-xs font-medium underline hover:no-underline"
          >
            Annuler et revenir aux valeurs précédentes
          </button>
        </div>
      )}
      {lectureErreur && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Le fichier est bien enregistré, mais la lecture automatique a échoué : {lectureErreur} Saisissez
          les champs à la main.
        </p>
      )}

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
            {uploadPending ? "Envoi..." : extractionPending ? "Lecture IA..." : ltaFichier ? "Remplacer le fichier" : "Uploader la LTA"}
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={uploaderLta}
              disabled={uploadPending || extractionPending}
              className="hidden"
            />
          </label>
          {ltaFichier && (
            <button
              type="button"
              onClick={relireLta}
              disabled={uploadPending || extractionPending}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              title="Relance la lecture automatique sur le fichier déjà enregistré"
            >
              Relire la LTA
            </button>
          )}
          {extractionPending && (
            <span className="text-xs text-slate-500 italic">Lecture du PDF en cours…</span>
          )}
          {uploadErreur && <span className="text-xs text-red-600">{uploadErreur}</span>}
        </div>
      </div>
    </div>
  );
}
