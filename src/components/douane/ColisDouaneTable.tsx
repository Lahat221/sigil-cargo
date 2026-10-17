"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { traiterLot, validerLot } from "@/app/(dashboard)/gestion-douaniere/actions";
import type { StatutExtractionDouane } from "@/types/database.types";
import { STATUT_DOUANE_LABELS, STATUT_DOUANE_STYLES } from "./statutLabels";

export type LigneColisDouane = {
  id: string;
  numero: number;
  clientNom: string;
  description: string | null;
  poidsKg: number | null;
  statut: StatutExtractionDouane;
  nbProduits: number;
  nbHsAVerifier: number;
  majLe: string | null;
};

type Tri = "numero" | "client" | "poids" | "statut" | "produits";

const TAILLE_LOT = 4;
const ORDRE_STATUT: StatutExtractionDouane[] = [
  "erreur",
  "a_verifier",
  "non_traite",
  "en_cours",
  "traite",
  "valide",
];

function comparer(a: LigneColisDouane, b: LigneColisDouane, tri: Tri): number {
  switch (tri) {
    case "numero":
      return a.numero - b.numero;
    case "client":
      return a.clientNom.localeCompare(b.clientNom, "fr");
    case "poids":
      return (a.poidsKg ?? -1) - (b.poidsKg ?? -1);
    case "produits":
      return a.nbProduits - b.nbProduits;
    case "statut":
      return ORDRE_STATUT.indexOf(a.statut) - ORDRE_STATUT.indexOf(b.statut);
  }
}

function normaliser(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ColisDouaneTable({
  lignes,
  messageVide,
}: {
  lignes: LigneColisDouane[];
  messageVide: string;
}) {
  const router = useRouter();
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<Tri>("numero");
  const [croissant, setCroissant] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<null | "valider" | "reverifier">(null);
  const [progression, setProgression] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  const affichees = useMemo(() => {
    const q = normaliser(recherche.trim());
    const filtrees = q
      ? lignes.filter((l) =>
          normaliser(`${l.numero} ${l.clientNom} ${l.description ?? ""}`).includes(q)
        )
      : lignes;
    const triees = [...filtrees].sort((a, b) => comparer(a, b, tri));
    return croissant ? triees : triees.reverse();
  }, [lignes, recherche, tri, croissant]);

  function changerTri(cle: Tri) {
    if (cle === tri) setCroissant((c) => !c);
    else {
      setTri(cle);
      setCroissant(cle === "client" || cle === "statut");
    }
  }

  const idsAffiches = affichees.map((l) => l.id);
  const toutSelectionne = idsAffiches.length > 0 && idsAffiches.every((id) => selection.has(id));
  const selectionnees = lignes.filter((l) => selection.has(l.id));
  const aValider = selectionnees.filter((l) => l.statut !== "valide" && l.nbProduits > 0);

  function basculer(id: string) {
    setSelection((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function basculerTout() {
    setSelection(toutSelectionne ? new Set() : new Set(idsAffiches));
  }

  async function validerSelection() {
    setMessage(null);
    setAction("valider");
    const r = await validerLot(aValider.map((l) => l.id));
    setAction(null);
    if ("error" in r) setMessage({ type: "erreur", texte: r.error });
    else {
      setMessage({ type: "ok", texte: `${r.valides} colis validé(s).` });
      setSelection(new Set());
      router.refresh();
    }
  }

  async function reverifierSelection() {
    const ids = selectionnees.map((l) => l.id);
    if (
      !confirm(
        `Relancer l'analyse IA sur ${ids.length} colis ? Les résultats actuels seront remplacés (l'historique est conservé).`
      )
    ) {
      return;
    }
    setMessage(null);
    setAction("reverifier");
    let fait = 0;
    let erreurs = 0;
    for (let i = 0; i < ids.length; i += TAILLE_LOT) {
      setProgression(`${fait}/${ids.length}`);
      const r = await traiterLot(ids.slice(i, i + TAILLE_LOT), { force: true });
      fait += r.traites;
      erreurs += r.erreurs.length;
    }
    setProgression(null);
    setAction(null);
    setMessage(
      erreurs > 0
        ? { type: "erreur", texte: `${fait} colis relancé(s), ${erreurs} en erreur — ouvrez-les pour réessayer.` }
        : { type: "ok", texte: `${fait} colis relancé(s).` }
    );
    setSelection(new Set());
    router.refresh();
  }

  const fleche = (cle: Tri) => (tri === cle ? (croissant ? " ▲" : " ▼") : "");
  const entete = (cle: Tri, libelle: string) => (
    <th className="px-3 py-2 font-medium">
      <button
        type="button"
        onClick={() => changerTri(cle)}
        className={`uppercase tracking-wide hover:text-slate-800 ${tri === cle ? "text-slate-800" : ""}`}
      >
        {libelle}
        {fleche(cle)}
      </button>
    </th>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un colis, un client, un contenu…"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
        <span className="text-xs text-slate-500">
          {affichees.length} colis{recherche && ` sur ${lignes.length}`}
        </span>
      </div>

      {selection.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-gold-2/40 bg-gold-1/10 px-3 py-2 text-sm">
          <span className="font-medium text-slate-800">{selection.size} sélectionné(s)</span>
          <button
            type="button"
            onClick={validerSelection}
            disabled={action !== null || aValider.length === 0}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            title="Seuls les colis déjà analysés et pas encore validés sont concernés."
          >
            {action === "valider" ? "Validation…" : `Valider (${aValider.length})`}
          </button>
          <button
            type="button"
            onClick={reverifierSelection}
            disabled={action !== null}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {action === "reverifier" ? `Analyse… ${progression ?? ""}` : `Relancer l'analyse IA (${selection.size})`}
          </button>
          <button
            type="button"
            onClick={() => setSelection(new Set())}
            disabled={action !== null}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Désélectionner
          </button>
        </div>
      )}

      {message && (
        <p
          className={`mb-3 rounded-md border px-3 py-2 text-sm ${
            message.type === "ok"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.texte}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={toutSelectionne}
                  onChange={basculerTout}
                  aria-label="Tout sélectionner"
                  className="h-4 w-4 rounded border-slate-300"
                />
              </th>
              {entete("numero", "N°")}
              {entete("client", "Client")}
              <th className="px-3 py-2 font-medium uppercase tracking-wide">Contenu déclaré</th>
              {entete("poids", "Poids")}
              {entete("produits", "Produits")}
              {entete("statut", "Statut")}
              <th className="px-3 py-2 font-medium uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {affichees.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                  {recherche ? "Aucun colis ne correspond à la recherche." : messageVide}
                </td>
              </tr>
            )}
            {affichees.map((l) => (
              <tr key={l.id} className={`hover:bg-slate-50 ${selection.has(l.id) ? "bg-gold-1/5" : ""}`}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selection.has(l.id)}
                    onChange={() => basculer(l.id)}
                    aria-label={`Sélectionner le colis ${l.numero}`}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </td>
                <td className="px-3 py-2 font-mono text-xs">#{l.numero}</td>
                <td className="px-3 py-2">{l.clientNom || "—"}</td>
                <td className="max-w-[16rem] px-3 py-2 text-xs text-slate-600">
                  <span className="line-clamp-2" title={l.description ?? undefined}>
                    {l.description || "—"}
                  </span>
                </td>
                <td className="px-3 py-2">{l.poidsKg !== null ? `${l.poidsKg} kg` : "—"}</td>
                <td className="px-3 py-2">
                  {l.nbProduits > 0 ? l.nbProduits : "—"}
                  {l.nbHsAVerifier > 0 && (
                    <span
                      className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                      title="Codes HS à vérifier"
                    >
                      {l.nbHsAVerifier} HS ?
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_DOUANE_STYLES[l.statut]}`}
                    title={l.majLe ? `Dernière extraction : ${new Date(l.majLe).toLocaleString("fr-FR")}` : undefined}
                  >
                    {STATUT_DOUANE_LABELS[l.statut]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/gestion-douaniere/${l.id}`} className="text-sm text-gold-2 hover:underline">
                    Voir
                  </Link>
                  <Link
                    href={`/commandes/${l.id}`}
                    className="ml-3 text-xs text-slate-400 hover:text-slate-700 hover:underline"
                  >
                    Fiche colis
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
