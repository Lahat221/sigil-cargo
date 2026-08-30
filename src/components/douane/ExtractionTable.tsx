"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mettreAJourProduit, relancerHsCode } from "@/app/(dashboard)/gestion-douaniere/actions";
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
  onEnregistre: () => void;
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
      onEnregistre();
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

function BoutonRelancer({ produit, onFait }: { produit: ProduitLigne; onFait: () => void }) {
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
      onFait();
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={relancer}
        disabled={isPending}
        title="Relance la recherche de HS code à partir du nom actuel du produit (corrige-le d'abord via Modifier si besoin) et enregistre le résultat dans le référentiel pour les prochaines extractions"
        className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline disabled:opacity-50"
      >
        <IconRefresh size={12} />
        {isPending ? "Recherche..." : "Relancer"}
      </button>
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
    </span>
  );
}

export function ExtractionTable({ produits }: { produits: ProduitLigne[] }) {
  const router = useRouter();
  const [editionId, setEditionId] = useState<string | null>(null);

  if (produits.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Aucun produit détecté.</p>;
  }

  return (
    <div className="overflow-x-auto">
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
                onEnregistre={() => {
                  setEditionId(null);
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
                    <BoutonRelancer produit={p} onFait={() => router.refresh()} />
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
