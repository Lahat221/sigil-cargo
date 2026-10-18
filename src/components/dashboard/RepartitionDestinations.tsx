"use client";

import { useState } from "react";
import { IconEye, IconEyeOff } from "@/components/ui/Icons";
import { BRAND } from "@/lib/brand";
import { SUIVI_FRET_FRANCE } from "@/lib/commandes/statuts";
import { DESTINATION_NON_PRECISEE, type LigneRepartition } from "@/lib/commandes/repartition";

const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const pourcent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });
const monnaie = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
  maximumFractionDigits: BRAND.devise === "XOF" ? 0 : 2,
});

const MASQUE = "••••";

/**
 * Répartition par destination : colis, paquets, kilos et part du poids pour
 * chaque ville — de quoi choisir l'aéroport de dédouanement (Paris, Lyon ou
 * Marseille) selon où part le plus gros volume. Les montants sont masqués
 * par défaut, comme le reste du tableau de bord.
 */
export function RepartitionDestinations({
  lignes,
  total,
  titre = "Répartition par destination",
  sousTitre,
  montantsMasquesParDefaut = true,
}: {
  lignes: LigneRepartition[];
  total: LigneRepartition;
  titre?: string;
  sousTitre?: string;
  montantsMasquesParDefaut?: boolean;
}) {
  const [montantsVisibles, setMontantsVisibles] = useState(!montantsMasquesParDefaut);

  if (lignes.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-700">{titre}</h2>
        <p className="mt-2 text-sm text-slate-400">Aucun colis sur cette sélection.</p>
      </div>
    );
  }

  const classees = lignes.filter((l) => l.destination !== DESTINATION_NON_PRECISEE);
  const principale = classees[0];
  const sansPoids = total.colisSansPoids;
  const nonPrecises = lignes.find((l) => l.destination === DESTINATION_NON_PRECISEE);
  const m = (valeur: string) => (montantsVisibles ? valeur : MASQUE);

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-slate-700">{titre}</h2>
          {sousTitre && <p className="text-xs text-slate-500">{sousTitre}</p>}
        </div>
        <button
          type="button"
          onClick={() => setMontantsVisibles((v) => !v)}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-100"
        >
          {montantsVisibles ? <IconEyeOff size={13} /> : <IconEye size={13} />}
          {montantsVisibles ? "Masquer les montants" : "Afficher les montants"}
        </button>
      </div>

      {principale && principale.poidsKg > 0 && (
        <p className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold">{principale.destination}</span> concentre le plus gros volume :{" "}
          <span className="font-semibold">{nombre.format(principale.poidsKg)} kg</span> (
          {pourcent.format(principale.partPoids)} du poids) pour {principale.colis} colis
          {classees.length > 1 && (
            <>
              {" "}
              — {classees
                .slice(1)
                .map((l) => `${l.destination} ${pourcent.format(l.partPoids)}`)
                .join(" · ")}
            </>
          )}
          .
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2 font-medium">Destination</th>
              <th className="px-2 py-2 text-right font-medium">Colis</th>
              <th className="px-2 py-2 text-right font-medium">Paquets</th>
              <th className="px-2 py-2 text-right font-medium">Poids</th>
              <th className="min-w-[8rem] px-2 py-2 font-medium">Part du poids</th>
              <th className="px-2 py-2 text-right font-medium">Poids moyen</th>
              <th className="px-2 py-2 text-right font-medium">Clients</th>
              {SUIVI_FRET_FRANCE && <th className="px-2 py-2 text-right font-medium">Vérifiés</th>}
              <th className="px-2 py-2 text-right font-medium">Montant</th>
              <th className="px-2 py-2 text-right font-medium">Reste à encaisser</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lignes.map((l) => {
              const estPrincipale = principale?.destination === l.destination && l.poidsKg > 0;
              return (
                <tr key={l.destination} className={estPrincipale ? "bg-gold-1/10" : undefined}>
                  <td className="px-2 py-2 font-medium text-slate-900">
                    {l.destination}
                    {estPrincipale && (
                      <span className="ml-2 rounded-full bg-gold-1/30 px-2 py-0.5 text-[10px] font-semibold text-slate-800">
                        + gros volume
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{l.colis}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{l.paquets}</td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums text-slate-900">
                    {nombre.format(l.poidsKg)} kg
                    {l.colisSansPoids > 0 && (
                      <span
                        className="ml-1 text-xs font-normal text-amber-600"
                        title={`${l.colisSansPoids} colis sans poids saisi : le total est sous-estimé`}
                      >
                        *
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full min-w-[4rem] overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-navy"
                          style={{ width: `${Math.round(l.partPoids * 100)}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-xs tabular-nums text-slate-600">
                        {pourcent.format(l.partPoids)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                    {l.poidsMoyenKg !== null ? `${nombre.format(l.poidsMoyenKg)} kg` : "—"}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-600">{l.clients}</td>
                  {SUIVI_FRET_FRANCE && (
                    <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                      {l.verifies}/{l.colis}
                    </td>
                  )}
                  <td className="px-2 py-2 text-right tabular-nums text-slate-700">{m(monnaie.format(l.montant))}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-700">{m(monnaie.format(l.reste))}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 font-semibold text-slate-900">
            <tr>
              <td className="px-2 py-2">Total</td>
              <td className="px-2 py-2 text-right tabular-nums">{total.colis}</td>
              <td className="px-2 py-2 text-right tabular-nums">{total.paquets}</td>
              <td className="px-2 py-2 text-right tabular-nums">{nombre.format(total.poidsKg)} kg</td>
              <td className="px-2 py-2" />
              <td className="px-2 py-2 text-right tabular-nums">
                {total.poidsMoyenKg !== null ? `${nombre.format(total.poidsMoyenKg)} kg` : "—"}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">{total.clients}</td>
              {SUIVI_FRET_FRANCE && (
                <td className="px-2 py-2 text-right tabular-nums">
                  {total.verifies}/{total.colis}
                </td>
              )}
              <td className="px-2 py-2 text-right tabular-nums">{m(monnaie.format(total.montant))}</td>
              <td className="px-2 py-2 text-right tabular-nums">{m(monnaie.format(total.reste))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {(sansPoids > 0 || nonPrecises) && (
        <ul className="mt-3 space-y-0.5 text-xs text-amber-700">
          {sansPoids > 0 && (
            <li>
              * {sansPoids} colis n&apos;ont pas encore de poids : les kilos affichés sont un minimum.
            </li>
          )}
          {nonPrecises && (
            <li>
              {nonPrecises.colis} colis sans destination précisée ne sont rattachés à aucune ville
              (renseignez la destination sur la fiche du colis).
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
