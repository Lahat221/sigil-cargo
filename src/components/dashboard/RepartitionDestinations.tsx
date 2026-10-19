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
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-100 sm:px-2.5 sm:py-1"
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

      {/* Téléphone : une carte lisible par destination */}
      <div className="space-y-2.5 md:hidden">
        {lignes.map((l) => {
          const estPrincipale = principale?.destination === l.destination && l.poidsKg > 0;
          return (
            <div
              key={l.destination}
              className={`rounded-lg border p-3 ${
                estPrincipale ? "border-gold-2/50 bg-gold-1/10" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-base font-semibold text-slate-900">
                  {l.destination}
                  {estPrincipale && (
                    <span className="ml-2 rounded-full bg-gold-1/30 px-2 py-0.5 align-middle text-[10px] font-semibold text-slate-800">
                      + gros volume
                    </span>
                  )}
                </p>
                <p className="shrink-0 text-lg font-bold tabular-nums text-slate-900">
                  {nombre.format(l.poidsKg)} kg
                  {l.colisSansPoids > 0 && <span className="ml-0.5 text-sm font-normal text-amber-600">*</span>}
                </p>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-navy" style={{ width: `${Math.round(l.partPoids * 100)}%` }} />
                </div>
                <span className="w-10 text-right text-sm font-semibold tabular-nums text-slate-700">
                  {pourcent.format(l.partPoids)}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-x-2 gap-y-2 text-center">
                <Stat libelle="Colis" valeur={String(l.colis)} />
                <Stat libelle="Paquets" valeur={String(l.paquets)} />
                <Stat libelle="Clients" valeur={String(l.clients)} />
                <Stat
                  libelle="Poids moyen"
                  valeur={l.poidsMoyenKg !== null ? `${nombre.format(l.poidsMoyenKg)} kg` : "—"}
                />
                {SUIVI_FRET_FRANCE && <Stat libelle="Vérifiés" valeur={`${l.verifies}/${l.colis}`} />}
              </dl>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Montant</p>
                  <p className="font-semibold tabular-nums text-slate-800">{m(monnaie.format(l.montant))}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Reste à encaisser</p>
                  <p className="font-semibold tabular-nums text-slate-800">{m(monnaie.format(l.reste))}</p>
                </div>
              </div>
            </div>
          );
        })}

        <div className="rounded-lg bg-slate-900 p-3 text-white">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold">Total</p>
            <p className="text-lg font-bold tabular-nums">{nombre.format(total.poidsKg)} kg</p>
          </div>
          <p className="mt-1 text-xs text-white/70">
            {total.colis} colis · {total.paquets} paquets · {total.clients} clients
            {total.poidsMoyenKg !== null && ` · ${nombre.format(total.poidsMoyenKg)} kg en moyenne`}
          </p>
          <p className="mt-1 text-xs text-white/70">
            Montant {m(monnaie.format(total.montant))} · Reste {m(monnaie.format(total.reste))}
          </p>
        </div>
      </div>

      {/* Tableau complet : écrans larges seulement */}
      <div className="hidden overflow-x-auto md:block">
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
              * {sansPoids} colis {sansPoids > 1 ? "n'ont" : "n'a"} pas encore de poids : les kilos affichés sont un
              minimum.
            </li>
          )}
          {nonPrecises && (
            <li>
              {nonPrecises.colis} colis sans destination précisée{" "}
              {nonPrecises.colis > 1 ? "ne sont rattachés" : "n'est rattaché"} à aucune ville (renseignez la
              destination sur la fiche du colis).
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function Stat({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{libelle}</dt>
      <dd className="text-base font-semibold tabular-nums text-slate-800">{valeur}</dd>
    </div>
  );
}
