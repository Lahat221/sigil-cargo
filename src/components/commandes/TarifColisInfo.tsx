"use client";

import type { Destination } from "@/lib/commandes/destinations";
import type { ReglesPrix } from "@/lib/parametres";
import { partAlimentaireKg, tarifsProposes, type DestinationTarif } from "@/lib/prix";

const euro = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const kg = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

const INPUT =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none";

export function versDestinationTarif(
  destinations: Destination[],
  nom: string
): DestinationTarif | undefined {
  const d = destinations.find((x) => x.nom === nom);
  return d
    ? { nom: d.nom, tarif: d.tarif_par_kg, tarifAlimentaire: d.tarif_alimentaire_par_kg }
    : undefined;
}

/** Au moins une destination a un tarif spécial alimentaire : la part alimentaire a un sens. */
export function tarifAlimentaireDisponible(destinations: Destination[]): boolean {
  return destinations.some((d) => d.tarif_alimentaire_par_kg !== null);
}

/**
 * Explique le tarif au kilo qui s'applique (petit colis, alimentaire ou autres
 * produits) et avertit si le prix saisi s'en écarte.
 */
export function IndicationTarif({
  destinations,
  regles,
  destination,
  poidsKg,
  part,
  prixSaisi,
}: {
  destinations: Destination[];
  regles: ReglesPrix;
  destination: string;
  poidsKg: string;
  /** Tarif concerné : la part « autres produits » ou la part alimentaire. */
  part: "autres" | "alimentaire";
  prixSaisi: string;
}) {
  if (!destination) return null;
  const poids = parseFloat(poidsKg);
  const proposition = tarifsProposes(
    versDestinationTarif(destinations, destination),
    Number.isNaN(poids) ? null : poids,
    regles
  )[part];
  if (!proposition) return null;

  const prix = parseFloat(prixSaisi);
  const ecart = !Number.isNaN(prix) && Math.abs(prix - proposition.tarif) > 0.005;

  return ecart ? (
    <p className="mt-1 text-xs font-medium text-amber-700">
      ⚠ Tarif attendu : {euro.format(proposition.tarif)} €/kg ({proposition.raison}) — vous avez saisi{" "}
      {euro.format(prix)} €/kg.
    </p>
  ) : (
    <p className="mt-1 text-xs text-slate-500">
      Tarif appliqué : {euro.format(proposition.tarif)} €/kg ({proposition.raison}).
    </p>
  );
}

/**
 * Part de produits alimentaires d'un colis : un client peut apporter de
 * l'alimentaire ET autre chose dans le même colis. Le poids total reste celui
 * du colis ; on indique ici la part alimentaire, facturée au tarif alimentaire,
 * le reste l'étant au tarif des autres produits.
 */
export function PartAlimentaire({
  destinations,
  regles,
  destination,
  poidsKg,
  poidsAlimentaire,
  onPoidsAlimentaire,
  prixAlimentaire,
  onPrixAlimentaire,
}: {
  destinations: Destination[];
  regles: ReglesPrix;
  destination: string;
  poidsKg: string;
  poidsAlimentaire: string;
  onPoidsAlimentaire: (v: string) => void;
  prixAlimentaire: string;
  onPrixAlimentaire: (v: string) => void;
}) {
  const total = parseFloat(poidsKg);
  const saisi = parseFloat(poidsAlimentaire);
  const part = partAlimentaireKg(Number.isNaN(total) ? null : total, Number.isNaN(saisi) ? null : saisi);
  const depasse = !Number.isNaN(saisi) && !Number.isNaN(total) && saisi > total;
  const sansPoids = !Number.isNaN(saisi) && saisi > 0 && (Number.isNaN(total) || total <= 0);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div>
        <p className="text-sm font-medium text-slate-700">Produits alimentaires dans ce colis</p>
        <p className="text-xs text-slate-500">
          Si le client apporte de l&apos;alimentaire et autre chose dans le même colis, indique le poids de la part
          alimentaire : elle est facturée au tarif alimentaire, le reste au tarif des autres produits.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            dont alimentaire (kg)
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={poidsAlimentaire}
            onChange={(e) => onPoidsAlimentaire(e.target.value)}
            placeholder="0"
            className={INPUT}
          />
        </div>
        {part > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Prix alimentaire par kg (modifiable)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={prixAlimentaire}
              onChange={(e) => onPrixAlimentaire(e.target.value)}
              className={INPUT}
            />
            <IndicationTarif
              destinations={destinations}
              regles={regles}
              destination={destination}
              poidsKg={poidsKg}
              part="alimentaire"
              prixSaisi={prixAlimentaire}
            />
          </div>
        )}
      </div>
      {depasse && (
        <p className="text-xs font-medium text-red-600">
          La part alimentaire ne peut pas dépasser le poids total du colis.
        </p>
      )}
      {sansPoids && (
        <p className="text-xs font-medium text-amber-700">Indique d&apos;abord le poids total du colis.</p>
      )}
      {part > 0 && !Number.isNaN(total) && (
        <p className="text-xs text-slate-600">
          Alimentaire : {kg.format(part)} kg — autres produits : {kg.format(total - part)} kg.
        </p>
      )}
    </div>
  );
}
