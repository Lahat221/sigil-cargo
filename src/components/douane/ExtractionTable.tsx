"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  appliquerCorrectionAuxSimilaires,
  mettreAJourProduit,
  relancerHsCode,
  type ExplicationRelance,
  type ResultatMiseAJourProduit,
} from "@/app/(dashboard)/gestion-douaniere/actions";
import { IconPencil, IconRefresh } from "@/components/ui/Icons";

export type ProduitLigne = {
  id: string;
  type_produit: string;
  description_douane: string;
  hs_code: string | null;
  hs_status: "confirme" | "propose" | "a_verifier";
  description_produit: string;
  quantite: number;
  unite: string;
  confiance: number | null;
  statut: "a_valider" | "valide";
};

function badgeConfiance(confiance: number | null) {
  if (confiance === null) return null;
  const pct = Math.round(confiance * 100);
  const couleur =
    confiance >= 0.9
      ? "text-emerald-700"
      : confiance >= 0.75
      ? "text-amber-600"
      : "text-red-600";
  return <span className={`text-xs font-medium ${couleur}`}>{pct}%</span>;
}

function LigneEdition({
  produit,
  onAnnuler,
  onEnregistre,
}: {
  produit: ProduitLigne;
  onAnnuler: () => void;
  onEnregistre: (resultat: Extract<ResultatMiseAJourProduit, { success: true }>) => void;
}) {
  const [champs, setChamps] = useState({
    type_produit: produit.type_produit,
    description_douane: produit.description_douane,
    hs_code: produit.hs_code ?? "",
    description_produit: produit.description_produit,
    quantite: produit.quantite,
    unite: produit.unite,
  });
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function enregistrer() {
    setErreur(null);
    startTransition(async () => {
      const resultat = await mettreAJourProduit(produit.id, {
        type_produit: champs.type_produit,
        description_douane: champs.description_douane,
        hs_code: champs.hs_code.trim() || null,
        description_produit: champs.description_produit,
        quantite: champs.quantite,
        unite: champs.unite,
      });
      if ("error" in resultat) {
        setErreur(resultat.error);
        return;
      }
      onEnregistre(resultat);
    });
  }

  return (
    <tr className="bg-slate-50">
      <td className="px-3 py-2">
        <input
          value={champs.type_produit}
          onChange={(e) => setChamps({ ...champs, type_produit: e.target.value })}
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={champs.description_douane}
          onChange={(e) => setChamps({ ...champs, description_douane: e.target.value })}
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={champs.hs_code}
          onChange={(e) => setChamps({ ...champs, hs_code: e.target.value })}
          placeholder="ex: 6204.43.00.00"
          className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={champs.description_produit}
          onChange={(e) => setChamps({ ...champs, description_produit: e.target.value })}
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={champs.quantite}
          onChange={(e) => setChamps({ ...champs, quantite: Number(e.target.value) })}
          className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2 text-right" colSpan={2}>
        <div className="flex items-center justify-end gap-2">
          {erreur && <span className="text-xs text-red-600">{erreur}</span>}
          <button
            type="button"
            onClick={onAnnuler}
            className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={enregistrer}
            disabled={isPending}
            className="rounded-md bg-navy px-3 py-1 text-xs font-medium text-white hover:bg-navy-2 disabled:opacity-50"
          >
            {isPending ? "..." : "Enregistrer"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function BoutonRelancer({
  produit,
  onFait,
}: {
  produit: ProduitLigne;
  onFait: (explication: ExplicationRelance) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function relancer() {
    setErreur(null);
    startTransition(async () => {
      const resultat = await relancerHsCode(produit.id);
      if ("error" in resultat) {
        setErreur(resultat.error);
        return;
      }
      onFait(resultat.explication);
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={relancer}
        disabled={isPending}
        title="Relance le classement à partir du nom actuel du produit (corrige-le d'abord via Modifier si besoin) : met à jour la description douane, le code HS et la confiance, l'enregistre dans le référentiel, et t'explique ce qui a changé"
        className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline disabled:opacity-50"
      >
        <IconRefresh size={12} />
        {isPending ? "Recherche..." : "Relancer"}
      </button>
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
    </span>
  );
}

function ChangementLigne({ libelle, avant, apres }: { libelle: string; avant: string | null; apres: string }) {
  const change = (avant ?? "").trim() !== apres.trim();
  return (
    <li>
      <span className="font-medium">{libelle} :</span>{" "}
      {change ? (
        <>
          {avant ? <span className="text-slate-500 line-through">{avant}</span> : <span className="text-slate-500">(vide)</span>}{" "}
          → <span className="font-semibold">{apres}</span>
        </>
      ) : (
        <>
          <span className="font-semibold">{apres}</span> <span className="text-slate-500">(inchangé, déjà correct)</span>
        </>
      )}
    </li>
  );
}

/** Explique, en clair, ce que « Relancer » vient de changer sur la ligne et pourquoi. */
function ExplicationRelanceCarte({ explication: e, onFermer }: { explication: ExplicationRelance; onFermer: () => void }) {
  const pct = Math.round(e.confiance * 100);
  return (
    <div className="mb-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">
          {e.declencheur === "correction_nom"
            ? `✓ Nom corrigé : « ${e.nom} » — la description douane a été recalculée`
            : `✓ Relance terminée : « ${e.nom} »`}
        </p>
        <button type="button" onClick={onFermer} className="text-xs text-sky-700 hover:underline">
          Fermer
        </button>
      </div>
      <p className="mt-1">
        <span className="font-medium">Origine :</span>{" "}
        {e.source === "referentiel"
          ? "votre référentiel (classement déjà validé par un agent)."
          : `estimation de l'IA, confiance ${pct} %${e.confiance < 0.8 ? " — à vérifier" : ""}.`}
      </p>
      <p className="mt-1">
        <span className="font-medium">Pourquoi :</span> {e.pourquoi}
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {e.ancienNom && <ChangementLigne libelle="Nom du produit" avant={e.ancienNom} apres={e.nom} />}
        <ChangementLigne libelle="Description douane" avant={e.avant.description_douane} apres={e.apres.description_douane} />
        <ChangementLigne libelle="Code HS" avant={e.avant.hs_code} apres={e.apres.hs_code} />
        <ChangementLigne libelle="Type de produit" avant={e.avant.type_produit} apres={e.apres.type_produit} />
        <li>
          <span className="font-medium">Confiance :</span> {pct} %
        </li>
      </ul>
      {e.propagees > 0 && (
        <p className="mt-1">
          {e.propagees} autre{e.propagees > 1 ? "s" : ""} ligne{e.propagees > 1 ? "s" : ""} du même nom corrigée
          {e.propagees > 1 ? "s" : ""} automatiquement (colis pas encore validés).
        </p>
      )}
      <p className="mt-1 text-xs text-sky-800">
        {e.memorise
          ? "Enregistré dans le référentiel : les prochains colis contenant ce produit seront classés ainsi."
          : "Pas enregistré dans le référentiel : l'estimation de l'IA est trop incertaine. Vérifie la ligne (Modifier) : ta correction, elle, sera mémorisée."}
      </p>
    </div>
  );
}

type Apprentissage = {
  produitId: string;
  nom: string;
  hsCode: string | null;
  appris: "cree" | "maj" | null;
  similaires: number;
  propagees: number;
  ancienNom: string | null;
};

export function ExtractionTable({ produits }: { produits: ProduitLigne[] }) {
  const router = useRouter();
  const [editionId, setEditionId] = useState<string | null>(null);
  const [apprentissage, setApprentissage] = useState<Apprentissage | null>(null);
  const [relance, setRelance] = useState<ExplicationRelance | null>(null);
  const [avertissement, setAvertissement] = useState<string | null>(null);
  const [similairesCorriges, setSimilairesCorriges] = useState<number | null>(null);
  const [similairesPending, startSimilaires] = useTransition();
  const [similairesErreur, setSimilairesErreur] = useState<string | null>(null);

  function corrigerSimilaires() {
    if (!apprentissage) return;
    setSimilairesErreur(null);
    startSimilaires(async () => {
      const r = await appliquerCorrectionAuxSimilaires(apprentissage.produitId);
      if ("error" in r) {
        setSimilairesErreur(r.error);
        return;
      }
      setSimilairesCorriges(r.nbCorriges);
      router.refresh();
    });
  }

  if (produits.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Aucun produit détecté.</p>;
  }

  return (
    <div className="overflow-x-auto">
      {avertissement && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {avertissement}
        </p>
      )}
      {relance && <ExplicationRelanceCarte explication={relance} onFermer={() => setRelance(null)} />}
      {apprentissage && (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {apprentissage.appris ? (
            <p>
              <span className="font-semibold">✓ Le référentiel a appris</span> :{" "}
              {apprentissage.ancienNom && <>« {apprentissage.ancienNom} » = </>}« {apprentissage.nom} »
              {apprentissage.hsCode && (
                <>
                  {" "}
                  → <span className="font-mono text-xs">{apprentissage.hsCode}</span>
                </>
              )}{" "}
              ({apprentissage.appris === "cree" ? "nouvelle entrée" : "entrée mise à jour"}).{" "}
              {apprentissage.ancienNom
                ? `Chaque fois que « ${apprentissage.ancienNom} » réapparaîtra, il sera remplacé automatiquement.`
                : "Les prochains colis contenant ce produit seront classés ainsi."}
            </p>
          ) : (
            <p className="font-semibold">✓ Correction reportée sur les lignes du même nom.</p>
          )}
          {apprentissage.propagees > 0 && (
            <p className="mt-1">
              {apprentissage.propagees} autre{apprentissage.propagees > 1 ? "s" : ""} ligne
              {apprentissage.propagees > 1 ? "s" : ""} «{" "}
              {apprentissage.ancienNom ?? apprentissage.nom} » corrigée{apprentissage.propagees > 1 ? "s" : ""}{" "}
              automatiquement (colis pas encore validés).
            </p>
          )}
          {apprentissage.similaires > 0 && similairesCorriges === null && (
            <p className="mt-1">
              {apprentissage.similaires} autre{apprentissage.similaires > 1 ? "s" : ""} ligne
              {apprentissage.similaires > 1 ? "s" : ""} « {apprentissage.nom} » ont un autre code (colis pas encore
              validés).{" "}
              <button
                type="button"
                onClick={corrigerSimilaires}
                disabled={similairesPending}
                className="font-semibold underline hover:no-underline disabled:opacity-50"
              >
                {similairesPending ? "Correction..." : "Les corriger aussi"}
              </button>
            </p>
          )}
          {similairesCorriges !== null && (
            <p className="mt-1">{similairesCorriges} autre(s) ligne(s) corrigée(s).</p>
          )}
          {similairesErreur && <p className="mt-1 text-red-700">{similairesErreur}</p>}
        </div>
      )}
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Type produit</th>
            <th className="px-3 py-2 font-medium">Description douane</th>
            <th className="px-3 py-2 font-medium">HS Code</th>
            <th className="px-3 py-2 font-medium">Produit</th>
            <th className="px-3 py-2 font-medium text-right">Qté</th>
            <th className="px-3 py-2 font-medium text-right">Confiance</th>
            <th className="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {produits.map((p) =>
            editionId === p.id ? (
              <LigneEdition
                key={p.id}
                produit={p}
                onAnnuler={() => setEditionId(null)}
                onEnregistre={(resultat) => {
                  setEditionId(null);
                  setRelance(resultat.relance ?? null);
                  setAvertissement(resultat.avertissement ?? null);
                  setSimilairesCorriges(null);
                  setSimilairesErreur(null);
                  setApprentissage(
                    !resultat.relance && (resultat.appris || (resultat.propagees ?? 0) > 0)
                      ? {
                          produitId: p.id,
                          nom: resultat.nom ?? p.description_produit,
                          hsCode: resultat.hsCode ?? null,
                          appris: resultat.appris ?? null,
                          similaires: resultat.similaires ?? 0,
                          propagees: resultat.propagees ?? 0,
                          ancienNom: resultat.ancienNom ?? null,
                        }
                      : null
                  );
                  router.refresh();
                }}
              />
            ) : (
              <tr key={p.id}>
                <td className="px-3 py-2">{p.type_produit}</td>
                <td className="px-3 py-2">{p.description_douane}</td>
                <td className="px-3 py-2">
                  {p.hs_code ? (
                    <span className="font-mono text-xs">{p.hs_code}</span>
                  ) : (
                    <span className="text-xs text-amber-600">⚠ à vérifier</span>
                  )}
                </td>
                <td className="px-3 py-2">{p.description_produit}</td>
                <td className="px-3 py-2 text-right">
                  {p.quantite} {p.unite}
                </td>
                <td className="px-3 py-2 text-right">{badgeConfiance(p.confiance)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditionId(p.id)}
                      className="inline-flex items-center gap-1 text-xs text-navy hover:underline"
                    >
                      <IconPencil size={12} />
                      Modifier
                    </button>
                    <BoutonRelancer
                      produit={p}
                      onFait={(explication) => {
                        setRelance(explication);
                        setAvertissement(null);
                        setApprentissage(null);
                        router.refresh();
                      }}
                    />
                  </div>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
