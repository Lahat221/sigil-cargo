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
        <p className="text-sm font-medium text-slate-700">
          Référentiel produits ({entrees.length})
        </p>
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
        {entrees.map((e) =>
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
                </p>
                <p className="text-xs text-slate-500">{e.description_douane}</p>
                <p className="text-xs text-slate-400">
                  {e.hs_code ? `HS ${e.hs_code}` : "HS à préciser"}
                  {e.synonymes.length > 0 && ` · synonymes : ${e.synonymes.join(", ")}`}
                </p>
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
