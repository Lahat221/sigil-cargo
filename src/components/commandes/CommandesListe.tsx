"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatutBadge, STATUT_LABELS } from "./StatutBadge";
import { SupprimerCommandeButton } from "./SupprimerCommandeButton";
import { NotifButtons } from "./NotifButtons";
import { NotifRetraitButton } from "./NotifRetraitButton";
import { PartagerVideoLazyButton } from "./PartagerVideoLazyButton";
import { changerStatutMasse } from "@/app/(dashboard)/commandes/actions";
import type { CommandeListItem } from "./types";
import type { StatutCommande } from "@/types/database.types";
import { BRAND } from "@/lib/brand";
import { construireTexteRetrait } from "@/lib/commandes/texteRetrait";

const STATUTS_ORDONNES = Object.keys(STATUT_LABELS) as StatutCommande[];

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
});

function formatPoids(poids: number | null) {
  return poids !== null ? `${poids.toLocaleString("fr-FR")} kg` : "—";
}

function texteRetrait(c: CommandeListItem): string {
  return construireTexteRetrait({
    clientNom: c.clients?.nom ?? "",
    numero: c.numero,
    description: c.description,
    poidsKg: c.poids_kg,
    montantTotal: c.montant_total,
  });
}

export function CommandesListe({
  commandes,
}: {
  commandes: CommandeListItem[];
}) {
  const [vue, setVue] = useState<"table" | "cartes">("table");
  const [selectionnes, setSelectionnes] = useState<Set<string>>(new Set());
  const [statutMasse, setStatutMasse] = useState<StatutCommande>(
    STATUTS_ORDONNES[0]
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (window.innerWidth < 768) setVue("cartes");
  }, []);

  function basculerSelection(id: string) {
    setSelectionnes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function basculerToutSelectionner() {
    setSelectionnes((prev) =>
      prev.size === commandes.length
        ? new Set()
        : new Set(commandes.map((c) => c.id))
    );
  }

  function appliquerStatutMasse() {
    const ids = Array.from(selectionnes);
    startTransition(async () => {
      await changerStatutMasse(ids, statutMasse);
      setSelectionnes(new Set());
      router.refresh();
    });
  }

  if (commandes.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
        Aucun colis trouvé.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {selectionnes.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-navy/20 bg-navy/5 px-3 py-1.5">
            <span className="text-sm font-medium text-navy">
              {selectionnes.size} colis sélectionné
              {selectionnes.size > 1 ? "s" : ""}
            </span>
            <select
              value={statutMasse}
              onChange={(e) =>
                setStatutMasse(e.target.value as StatutCommande)
              }
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            >
              {STATUTS_ORDONNES.map((s) => (
                <option key={s} value={s}>
                  {STATUT_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              onClick={appliquerStatutMasse}
              disabled={isPending}
              className="rounded-md bg-navy px-3 py-1 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
            >
              {isPending ? "..." : "Appliquer"}
            </button>
            <button
              onClick={() => setSelectionnes(new Set())}
              className="text-sm text-slate-500 hover:underline"
            >
              Annuler la sélection
            </button>
          </div>
        ) : (
          <div />
        )}
        <div className="flex gap-1">
          <button
            onClick={() => setVue("table")}
            className={`rounded-md px-3 py-1 text-sm ${
              vue === "table"
                ? "bg-navy text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tableau
          </button>
          <button
            onClick={() => setVue("cartes")}
            className={`rounded-md px-3 py-1 text-sm ${
              vue === "cartes"
                ? "bg-navy text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Cartes
          </button>
        </div>
      </div>

      {vue === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={
                      selectionnes.size === commandes.length &&
                      commandes.length > 0
                    }
                    onChange={basculerToutSelectionner}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Projet</th>
                <th className="px-4 py-3 font-medium">Destination</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Poids</th>
                <th className="px-4 py-3 font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {commandes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectionnes.has(c.id)}
                      onChange={() => basculerSelection(c.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/commandes/${c.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      #{c.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.clients?.nom ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.projets?.nom ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.destination ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatutBadge statut={c.statut} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatPoids(c.poids_kg)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {montantFormatter.format(c.montant_total)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link
                        href={`/commandes/${c.id}/modifier`}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        Modifier
                      </Link>
                      <Link
                        href={`/commandes/${c.id}/facture`}
                        target="_blank"
                        className="text-sm text-slate-600 hover:underline"
                      >
                        Facture
                      </Link>
                      <Link
                        href={`/commandes/${c.id}/etiquette?print=1`}
                        target="_blank"
                        className="text-sm text-slate-600 hover:underline"
                      >
                        Étiquette colis
                      </Link>
                      <NotifButtons
                        commandeId={c.id}
                        numero={c.numero}
                        clientNom={c.clients?.nom ?? ""}
                        clientTelephone={c.clients?.telephone ?? null}
                        clientTelephonePays={c.clients?.telephone_pays ?? null}
                        poidsKg={c.poids_kg}
                        montantTotal={c.montant_total}
                        description={c.description}
                      />
                      {BRAND.retrait && (
                        <NotifRetraitButton
                          clientNom={c.clients?.nom ?? ""}
                          clientTelephone={c.clients?.telephone ?? null}
                          clientTelephonePays={c.clients?.telephone_pays ?? null}
                          texte={texteRetrait(c)}
                        />
                      )}
                      {BRAND.retrait && c.video_urls?.[0] && (
                        <PartagerVideoLazyButton videoPath={c.video_urls[0]} />
                      )}
                      <SupprimerCommandeButton
                        commandeId={c.id}
                        numero={c.numero}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {commandes.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200/70 bg-white shadow-sm p-4 transition-shadow hover:shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectionnes.has(c.id)}
                    onChange={() => basculerSelection(c.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="font-semibold text-slate-900">
                    #{c.numero}
                  </span>
                </label>
                <StatutBadge statut={c.statut} />
              </div>
              <Link href={`/commandes/${c.id}`}>
                <p className="text-sm text-slate-700">
                  {c.clients?.nom ?? "—"}
                </p>
                <p className="mb-3 text-xs text-slate-500">
                  {c.projets?.nom ?? "—"}
                  {c.destination && ` · ${c.destination}`}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {formatPoids(c.poids_kg)}
                  </span>
                  <span className="font-medium text-slate-900">
                    {montantFormatter.format(c.montant_total)}
                  </span>
                </div>
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2">
                <Link
                  href={`/commandes/${c.id}/modifier`}
                  className="text-sm text-slate-600 hover:underline"
                >
                  Modifier
                </Link>
                <Link
                  href={`/commandes/${c.id}/facture`}
                  target="_blank"
                  className="text-sm text-slate-600 hover:underline"
                >
                  Facture
                </Link>
                <Link
                  href={`/commandes/${c.id}/etiquette?print=1`}
                  target="_blank"
                  className="text-sm text-slate-600 hover:underline"
                >
                  Étiquette colis
                </Link>
                <NotifButtons
                        commandeId={c.id}
                        numero={c.numero}
                        clientNom={c.clients?.nom ?? ""}
                        clientTelephone={c.clients?.telephone ?? null}
                        clientTelephonePays={c.clients?.telephone_pays ?? null}
                        poidsKg={c.poids_kg}
                        montantTotal={c.montant_total}
                        description={c.description}
                      />
                {BRAND.retrait && (
                  <NotifRetraitButton
                    clientNom={c.clients?.nom ?? ""}
                    clientTelephone={c.clients?.telephone ?? null}
                    clientTelephonePays={c.clients?.telephone_pays ?? null}
                    texte={texteRetrait(c)}
                  />
                )}
                {BRAND.retrait && c.video_urls?.[0] && (
                  <PartagerVideoLazyButton videoPath={c.video_urls[0]} />
                )}
                <SupprimerCommandeButton commandeId={c.id} numero={c.numero} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
