"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  creerEntreeReferentiel,
  mettreAJourEntreeReferentiel,
  toggleActifReferentiel,
} from "@/app/(dashboard)/gestion-douaniere/referentiel/actions";
import { IconPencil, IconPlus } from "@/components/ui/Icons";

export type EntreeReferentiel = {
  id: string;
  nom_local: string;
  type_produit: string;
  description_douane: string;
  hs_code: string | null;
  synonymes: string[];
  actif: boolean;
  // Mémoire des corrections (absent tant que la migration n'est pas passée).
  source?: string;
  nb_corrections?: number;
  derniere_correction_at?: string | null;
  ancien_hs_code?: string | null;
  ancienne_description_douane?: string | null;
};

type FormValues = {
  nomLocal: string;
  typeProduit: string;
  descriptionDouane: string;
  hsCode: string;
  synonymes: string;
};

const FORM_VIDE: FormValues = {
  nomLocal: "",
  typeProduit: "",
  descriptionDouane: "",
  hsCode: "",
  synonymes: "",
};

function ChampsFormulaire({
  values,
  onChange,
}: {
  values: FormValues;
  onChange: (v: FormValues) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
      <input
        value={values.nomLocal}
        onChange={(e) => onChange({ ...values, nomLocal: e.target.value })}
        placeholder="Nom local (ex: Bouye)"
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
      <input
        value={values.typeProduit}
        onChange={(e) => onChange({ ...values, typeProduit: e.target.value })}
        placeholder="Type produit"
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
      <input
        value={values.descriptionDouane}
        onChange={(e) => onChange({ ...values, descriptionDouane: e.target.value })}
        placeholder="Description douane"
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:col-span-2"
      />
      <input
        value={values.hsCode}
        onChange={(e) => onChange({ ...values, hsCode: e.target.value })}
        placeholder="HS code (optionnel)"
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
      <input
        value={values.synonymes}
        onChange={(e) => onChange({ ...values, synonymes: e.target.value })}
        placeholder="Synonymes séparés par des virgules"
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:col-span-5"
      />
    </div>
  );
}

export function ReferentielTable({ entrees }: { entrees: EntreeReferentiel[] }) {
  const router = useRouter();
  const [nouveau, setNouveau] = useState<FormValues | null>(null);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [editionValues, setEditionValues] = useState<FormValues>(FORM_VIDE);
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [seulementAppris, setSeulementAppris] = useState(false);
  const nbAppris = entrees.filter((e) => e.source === "correction").length;
  // Même nom saisi plusieurs fois (ex. deux sens différents) : l'IA reçoit alors
  // des consignes contradictoires, mieux vaut les voir pour n'en garder qu'une.
  const occurrences = new Map<string, number>();
  for (const e of entrees) {
    const cle = e.nom_local.trim().toLowerCase();
    occurrences.set(cle, (occurrences.get(cle) ?? 0) + 1);
  }
  const estDoublon = (e: EntreeReferentiel) => (occurrences.get(e.nom_local.trim().toLowerCase()) ?? 0) > 1;
  const entreesAffichees = seulementAppris ? entrees.filter((e) => e.source === "correction") : entrees;

  function ouvrirEdition(e: EntreeReferentiel) {
    setEditionId(e.id);
    setEditionValues({
      nomLocal: e.nom_local,
      typeProduit: e.type_produit,
      descriptionDouane: e.description_douane,
      hsCode: e.hs_code ?? "",
      synonymes: e.synonymes.join(", "),
    });
  }

  function enregistrerNouveau() {
    if (!nouveau) return;
    setErreur(null);
    startTransition(async () => {
      const resultat = await creerEntreeReferentiel(nouveau);
      if ("error" in resultat) {
        setErreur(resultat.error);
        return;
      }
      setNouveau(null);
      router.refresh();
    });
  }

  function enregistrerEdition() {
    if (!editionId) return;
    setErreur(null);
    startTransition(async () => {
      const resultat = await mettreAJourEntreeReferentiel(editionId, editionValues);
      if ("error" in resultat) {
        setErreur(resultat.error);
        return;
      }
      setEditionId(null);
      router.refresh();
    });
  }

  function toggleActif(id: string, actif: boolean) {
    startTransition(async () => {
      await toggleActifReferentiel(id, !actif);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-slate-700">
            Référentiel produits ({entrees.length})
          </p>
          {nbAppris > 0 && (
            <button
              type="button"
              onClick={() => setSeulementAppris((v) => !v)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                seulementAppris
                  ? "bg-emerald-600 text-white ring-emerald-600"
                  : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
              }`}
              title="Entrées créées ou corrigées automatiquement à partir de vos corrections"
            >
              {nbAppris} appris de vos corrections
            </button>
          )}
        </div>
        {!nouveau && (
          <button
            type="button"
            onClick={() => setNouveau(FORM_VIDE)}
            className="flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-2"
          >
            <IconPlus size={13} />
            Ajouter
          </button>
        )}
      </div>

      {nouveau && (
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <ChampsFormulaire values={nouveau} onChange={setNouveau} />
          <div className="mt-2 flex items-center justify-end gap-2">
            {erreur && <span className="text-xs text-red-600">{erreur}</span>}
            <button
              type="button"
              onClick={() => setNouveau(null)}
              className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={enregistrerNouveau}
              disabled={isPending}
              className="rounded-md bg-navy px-3 py-1 text-xs font-medium text-white hover:bg-navy-2 disabled:opacity-50"
            >
              {isPending ? "..." : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {entreesAffichees.map((e) =>
          editionId === e.id ? (
            <div key={e.id} className="bg-slate-50 px-4 py-3">
              <ChampsFormulaire values={editionValues} onChange={setEditionValues} />
              <div className="mt-2 flex items-center justify-end gap-2">
                {erreur && <span className="text-xs text-red-600">{erreur}</span>}
                <button
                  type="button"
                  onClick={() => setEditionId(null)}
                  className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={enregistrerEdition}
                  disabled={isPending}
                  className="rounded-md bg-navy px-3 py-1 text-xs font-medium text-white hover:bg-navy-2 disabled:opacity-50"
                >
                  {isPending ? "..." : "Enregistrer"}
                </button>
              </div>
            </div>
          ) : (
            <div
              key={e.id}
              className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm ${
                e.actif ? "" : "opacity-50"
              }`}
            >
              <div>
                <p className="font-medium text-slate-800">
                  {e.nom_local} <span className="text-slate-400">— {e.type_produit}</span>
                  {estDoublon(e) && (
                    <span
                      className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-300"
                      title="Plusieurs entrées portent ce nom : désactivez ou supprimez celles qui ne sont plus bonnes"
                    >
                      doublon
                    </span>
                  )}
                  {e.source === "correction" && (
                    <span
                      className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"
                      title="Créé ou mis à jour automatiquement à partir d'une correction"
                    >
                      appris · {e.nb_corrections ?? 1} correction{(e.nb_corrections ?? 1) > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">{e.description_douane}</p>
                <p className="text-xs text-slate-400">
                  {e.hs_code ? `HS ${e.hs_code}` : "HS à préciser"}
                  {e.synonymes.length > 0 && ` · synonymes : ${e.synonymes.join(", ")}`}
                </p>
                {e.source === "correction" && (e.ancien_hs_code || e.ancienne_description_douane) && (
                  <p className="text-xs text-emerald-700">
                    {e.ancien_hs_code && (
                      <>
                        L&apos;IA proposait <span className="font-mono">{e.ancien_hs_code}</span> → corrigé en{" "}
                        <span className="font-mono">{e.hs_code ?? "—"}</span>
                      </>
                    )}
                    {e.derniere_correction_at &&
                      ` · le ${new Date(e.derniere_correction_at).toLocaleDateString("fr-FR")}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => ouvrirEdition(e)}
                  className="inline-flex items-center gap-1 text-xs text-navy hover:underline"
                >
                  <IconPencil size={12} />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => toggleActif(e.id, e.actif)}
                  className="text-xs text-slate-500 hover:underline"
                >
                  {e.actif ? "Désactiver" : "Réactiver"}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
